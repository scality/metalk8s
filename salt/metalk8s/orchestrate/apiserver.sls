{%- set dest_version = pillar.metalk8s.cluster_version %}
{%- set master_nodes = salt.metalk8s.minions_by_role('master') | sort %}
{%- set bootstrap_nodes = salt.metalk8s.minions_by_role('bootstrap') | sort %}

# move bootstrap nodes to beginning of list
{%- for node in bootstrap_nodes %}
{%- do master_nodes.remove(node) %}
{%- do master_nodes.insert(0, node) %}
{%- endfor %}

{%- for node in master_nodes %}

Sync {{ node }} minion:
  salt.function:
    - name: saltutil.sync_all
    - tgt: {{ node }}
    - kwarg:
        saltenv: metalk8s-{{ dest_version }}

Refresh {{ node }} grains:
  salt.function:
    - name: saltutil.refresh_grains
    - tgt: {{ node }}
    - timeout: 120
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
      - salt: Deploy apiserver {{ loop.previtem }} to {{ dest_version }}
  {%- endif %}

{%- endfor %}
