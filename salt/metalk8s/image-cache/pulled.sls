{%- from "metalk8s/map.jinja" import image_cache with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/repo/macro.sls" import build_registry_image_name with context %}
{%- from "metalk8s/image-cache/variants.jinja" import image_cache_variants with context %}

{#- Fills the image cache of a new node from the cluster registry, with every
    variant its roles call for: the static Pods and the CNI of the node start
    from it, before the registry mirror configuration lands there, and start
    again from it without the registry. Only a node deployed for the first time
    applies it, see `orchestrate/deploy_node.sls`, which passes the addresses
    and the CA of the registry. From there, the image cache agent caches each
    new version.

    Ordering this against the kubelet is left to the caller, so that this SLS
    stays applicable on its own. #}

{%- if kubelet.container_engine == 'containerd' %}

{%- set registry = pillar.metalk8s.get('registry') or {} %}
{%- if not registry.get('addresses') or not registry.get('ca') %}
  {{ raise('Missing the addresses or the CA of the cluster registry') }}
{%- endif %}

{#- The variants whose node selector the node matches. #}
{%- set node_labels = [] %}
{%- for role in pillar.metalk8s.nodes[grains.id].roles %}
  {%- do node_labels.append('node-role.kubernetes.io/' ~ role) %}
{%- endfor %}
{%- set variants = [] %}
{%- for variant, resource in image_cache_variants.items() %}
  {%- if resource.node_selector.keys() | reject('in', node_labels) | list | length == 0 %}
    {%- do variants.append(variant) %}
  {%- endif %}
{%- endfor %}

include:
  - .installed

Install the cluster registry CA:
  file.managed:
    - name: {{ image_cache.registry_ca }}
    - contents_pillar: metalk8s:registry:ca
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true

{%- for variant in variants %}
  {%- set resource = image_cache_variants[variant] %}

Pull the {{ variant }} boot cache from the registry:
  metalk8s_image_cache.imported:
    # NOTE: The name of the ImageCache resource that later owns this
    # directory, so that the agent adopts it.
    - name: {{ resource.name }}
    # NOTE: One reference per registry node, tried in order, as containerd
    # does: the first one down must not stop the join.
    - source:
  {%- for address in registry.addresses %}
      - {{ build_registry_image_name(resource.image_name, address) }}
  {%- endfor %}
    - cache_path: {{ image_cache.directory }}
    - ca_file: {{ image_cache.registry_ca }}
    # NOTE: Per registry node. A registry that accepts the connection and
    # stops answering would otherwise hold the join forever.
    - timeout: 600
    - require:
      - file: Create the image cache directory
      - metalk8s_package_manager: Install imagecachectl
      - file: Install the cluster registry CA
{%- endfor %}

Import the pulled boot cache archives into containerd:
  module.run:
    # NOTE: A restart and not a start, and right away rather than on the next
    # tick of the timer. See `provisioned.sls` for why.
    - service.restart:
      - name: containerd-image-preload.service
    - onchanges:
{%- for variant in variants %}
      - metalk8s_image_cache: Pull the {{ variant }} boot cache from the registry
{%- endfor %}
    - require:
      - service: Ensure containerd image preload timer running

{%- else %}

No image cache to pull:
  test.succeed_without_changes

{%- endif %}
