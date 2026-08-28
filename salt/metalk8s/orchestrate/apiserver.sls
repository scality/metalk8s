{%- set dest_version = pillar.metalk8s.cluster_version %}
{%- set master_nodes = salt.metalk8s.minions_by_role('master') | sort %}
{%- set bootstrap_nodes = salt.metalk8s.minions_by_role('bootstrap') | sort %}

# move bootstrap nodes to beginning of list
{%- for node in bootstrap_nodes %}
{%- do master_nodes.remove(node) %}
{%- do master_nodes.insert(0, node) %}
{%- endfor %}

{%- for node in master_nodes %}

{#- The readiness gate below queries the node's apiserver directly, so we need
    its control plane IP. Rendering happens on the master, where `mine.get` as
    an execution module returns nothing, hence the runner (as in
    `orchestrate/register_etcd.sls`) #}
{%- set node_ip = salt.saltutil.runner(
        'mine.get', tgt=node, fun='control_plane_ip'
    ).get(node)
%}
{%- if not node_ip %}
{{ raise(
       "No control plane IP for '" ~ node ~ "' in the Salt mine, needed to "
       ~ "check its apiserver is serving again before moving on to the next "
       ~ "master. Run `salt '" ~ node ~ "' mine.update` and retry."
   ) }}
{%- endif %}

Sync {{ node }} minion:
  salt.function:
    - name: saltutil.sync_all
    - tgt: {{ node }}
    - kwarg:
        saltenv: metalk8s-{{ dest_version }}
    - retry:
        attempts: 5

Refresh {{ node }} grains:
  salt.function:
    - name: saltutil.refresh_grains
    - tgt: {{ node }}
    - timeout: 120
    - retry:
        attempts: 5
    - require:
      - salt: Sync {{ node }} minion

Check pillar on {{ node }}:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node }}
    - kwarg:
        keys:
          - metalk8s.endpoints.repositories
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Refresh {{ node }} grains

Deploy apiserver {{ node }} to {{ dest_version }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.apiserver
      - metalk8s.kubernetes.apiserver-proxy
    - saltenv: metalk8s-{{ dest_version }}
    {#- Increase the timeout to 300s instead of the default 20s, to let this
        state run to completion, because it writes the kube-apiserver and
        apiserver-proxy static pod manifests, the admin kubeconfig and the
        encryption and authn configs on the very node the salt-master polls
        with `saltutil.find_job`, and it needs minutes before the kubelet has
        picked up both manifests. Once a probe goes unanswered no further probe
        is sent, so this is the grace left for the state to return. It is also
        the publish wait, so a busy master waits this long per attempt. This
        prevents Salt reporting `Run failed on minions: <node>` and aborting
        the apiserver upgrade with the remaining masters untouched #}
    - timeout: 300
    - require:
      - salt: Check pillar on {{ node }}
  {%- if loop.previtem is defined %}
      - http: Wait for apiserver {{ loop.previtem }} to be serving
  {%- endif %}

Wait for apiserver {{ node }} to be serving:
  http.wait_for_successful_query:
  {#- Query this node's apiserver directly rather than through
      `127.0.0.1:7443`: the apiserver-proxy upstream lists every master and
      only weights the local one, so it fails over to another apiserver and
      would report ready while this node is still starting.
      `/readyz` rather than `/healthz` for its `informer-sync` check: the
      apiserver only reports ready once its caches are loaded, so the next
      RBAC call does not race it. The deploy already waits for `/healthz`
      from the node itself (`kubernetes/apiserver/installed.sls:179`); what
      this gate adds is a check run from the salt-master, and one after the
      last master too. #}
  - name: https://{{ node_ip }}:6443/readyz?verbose
  - match: 'poststarthook/rbac/bootstrap-roles ok'
  - status: 200
  - verify_ssl: true
  - ca_bundle: /etc/kubernetes/pki/ca.crt
  - request_interval: 5
  - timeout: 10
  - require:
    - salt: Deploy apiserver {{ node }} to {{ dest_version }}

{%- endfor %}
