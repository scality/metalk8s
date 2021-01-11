# NOTE: This state just ensure containerd running and "ready"
# To restart containerd you need to use a `watch_in` in another state 
# that include this one
# ```
# - watch_in:
#   - service: Ensure containerd running
# ```

Ensure containerd running:
  service.running:
    - name: containerd
    - enable: True
    - init_delay: 2

Ensure containerd is ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:cri.ready()
    - comment: Ran 'cri.ready'
    - require:
      - service: Ensure containerd running
