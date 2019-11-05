Host bootstrap
    User cloud-user
    Port 22
    Hostname ${bootstrap_ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no
