{%- from "metalk8s/map.jinja" import image_cache with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{#- Fills the image cache from the boot cache images the registry serves.

    This is the hot path: the cluster runs and the registry answers, so the
    archives come from there. The cold path is `.provisioned`, and it is the
    one that reads the ISO, which only the bootstrap node mounts.

    Ordering this against the kubelet is left to the role that applies both,
    so that this SLS stays applicable on its own. #}

{%- set variants = [] %}

{%- if kubelet.container_engine == 'containerd' %}

{%- set nodes = pillar.metalk8s.nodes %}
{%- set roles = nodes.get(grains['id'], {}).get('roles', []) %}

{#- Read for truth and not for presence: `orchestrate/bootstrap/init.sls`
    hands the bootstrap highstate a nodes pillar carrying `_errors: None`, so
    testing the key alone refuses every fresh install. Every other guard in
    the repo tests the value, see `_pillar/metalk8s.py` and
    `_utils/pillar_utils.py`. #}
{%- if nodes.get('_errors') or not roles %}

{#- Failing one state rather than raising. A raise is a render error, which
    fails the whole highstate, so a brief apiserver hiccup would stop every
    unrelated state on the node from converging, including the ones needed to
    bring a degraded cluster back.

    Not guessing either: the roles decide which variants the node needs, and a
    control plane node given the worker images alone cannot start its static
    pods. An unlabelled Node reaches here, see `_pillar/metalk8s_nodes.py` and
    scality/metalk8s#2137. #}
Cannot tell from its roles which boot cache this node needs:
  test.fail_without_changes

{%- elif 'bootstrap' in roles %}

{#- The bootstrap node filled its cache from the ISO before any registry
    existed, so the control plane archives are already there. Pulling them
    again would write a gigabyte over what it already holds.

    Only that variant, since `.provisioned` extracts the control plane image
    alone, and the rest cannot be pulled here either: at the first bootstrap
    there is no registry yet to pull from. Giving the bootstrap node the
    worker archives belongs to the ISO path, not to this one. #}
No boot cache to pull on the bootstrap node:
  test.succeed_without_changes

{%- else %}

{#- The worker variant is the baseline of every node, control plane included:
    it carries the sandbox image containerd pins, without which the kubelet
    starts no Pod at all, and the agent that writes the containerd mirror
    configuration on every node. A node running a control plane static pod
    takes the control plane variant on top, and `etcd` calls for it as much as
    `master`, a Node dedicated to etcd being a documented topology. The
    registry variant is MK8S-380, and it slots in here. #}
{%- set variants = ['worker'] %}
{%- if 'master' in roles or 'etcd' in roles %}
{%-   set variants = variants + ['control-plane'] %}
{%- endif %}

include:
  - .installed

Create the image cache marker directory:
  file.directory:
    - name: {{ image_cache.marker_directory }}
    - user: root
    - group: root
    - mode: '0755'
    - makedirs: True

{%- for variant in variants %}

{#- The worker variant first, since it carries the sandbox image: a node whose
    larger pull fails is still able to start a Pod. #}
Pull the {{ variant }} boot cache:
  metalk8s_image_cache.pulled:
    - name: {{ image_cache.directory }}
    - image: {{ build_image_name('metalk8s-boot-cache-' ~ variant) }}
    - marker: {{ salt.file.join(image_cache.marker_directory, variant ~ '.json') }}
    # NOTE: `ctr` does not read the `config.toml` containerd itself uses, so
    # without this the canonical image name resolves to nothing: the registry
    # endpoint is the unresolvable `metalk8s-registry-from-config.invalid`.
    # The `http://` scheme comes from the host entry written there, so serving
    # the registry in the clear needs no flag on top.
    - hosts_dir: /etc/containerd/certs.d
    - require:
      - file: Create the image cache directory
      - file: Create the image cache marker directory
      # NOTE: What the pull needs is the host configuration, not the engine:
      # `ctr content fetch-*` talks to the registry and never to the daemon.
      - file: Configure containerd registries

{%- endfor %}

Import the pulled boot cache archives into containerd:
  module.run:
    # NOTE: A restart and not a start, and the service once rather than the
    # timer alone, for the reasons spelled out in `.provisioned`: systemd
    # merges a `start` into a job already in flight, and the next tick is ten
    # minutes away, which the kubelet will not wait for.
    - service.restart:
      - name: containerd-image-preload.service
    - onchanges:
{%- for variant in variants %}
      - metalk8s_image_cache: Pull the {{ variant }} boot cache
{%- endfor %}
    - require:
      - service: Ensure containerd image preload timer running

{%- endif %}

{%- else %}

No image cache to fill:
  test.succeed_without_changes

{%- endif %}

{#- What the node role holds the kubelet on. Declared by every branch, so that
    the role names one state instead of requiring this SLS whole.

    It waits on the pulls where there are pulls, and on nothing otherwise, and
    that difference is the point. A nodes pillar in error says nothing about
    the archives this node already holds, so making the kubelet wait on that
    failure would stop a highstate from restarting a kubelet that is down,
    which is the one repair a degraded cluster still has. A pull that fails is
    another matter: there the cache really is incomplete, and holding the
    kubelet back is what this formula is for. #}
The boot cache this node needs is in place:
{%- if variants %}
  test.succeed_without_changes:
    - require:
{%- for variant in variants %}
      - metalk8s_image_cache: Pull the {{ variant }} boot cache
{%- endfor %}
{%- else %}
  test.succeed_without_changes
{%- endif %}
