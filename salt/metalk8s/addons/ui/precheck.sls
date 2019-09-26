Check pillar for MetalK8s UI:
  test.check_pillar:
    - string:
      - metalk8s:api_server:host
      - metalk8s:endpoints:salt-master:ip
    - integer:
      - metalk8s:endpoints:salt-master:ports:api
