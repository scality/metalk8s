Schedule daily backup:
  schedule.present:
    - function: metalk8s.backup_node
    - seconds: 86400
