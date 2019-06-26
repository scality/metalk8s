Check pillar for MetalK8s UI:
  test.check_pillar:
    - string:
      - metalk8s:api_server:host
      - metalk8s:endpoints:salt-master:ip
      - metalk8s:endpoints:prometheus:ip
    - integer:
      - metalk8s:endpoints:salt-master:ports:api
      - metalk8s:endpoints:prometheus:ports:api:node_port
