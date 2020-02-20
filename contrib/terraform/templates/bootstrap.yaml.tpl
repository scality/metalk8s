apiVersion: metalk8s.scality.com/v1alpha2
kind: BootstrapConfiguration
networks:
  controlPlane: ${control_plane_cidr}
  workloadPlane: ${workload_plane_cidr}
ca:
  minion: ${ca_minion}
archives:
%{ for archive in archives ~}
  - ${archive}
%{ endfor }
