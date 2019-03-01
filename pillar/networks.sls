# Network information
networks:
  # Control plane network
  control_plane: "10.0.0.0/8"
  # Workload plane network
  workload_plane: "10.0.0.0/8"
  # Pod network
  pod: "10.233.0.0/16"
  # Service ClusterIPs range
  service: "10.96.0.0/12"
