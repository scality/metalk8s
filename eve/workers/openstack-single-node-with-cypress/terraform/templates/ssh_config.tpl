Host bootstrap
    User centos
    Port 22
    Hostname ${bootstrap_ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no

Host cypress
    User centos
    Port 22
    Hostname ${cypress_ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no
