Host bastion
    User centos
    Port 22
    Hostname ${bastion_ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no

Host bootstrap
    User centos
    Port 22
    Hostname ${bootstrap_ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no
