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

%{ for node in nodes ~}
Host ${node.name}
    User centos
    Port 22
    Hostname ${node.ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no

%{ endfor }
