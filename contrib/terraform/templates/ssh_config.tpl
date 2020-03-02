%{ if bastion != {} ~}
Host bastion
    User ${bastion.user}
    Port 22
    Hostname ${bastion.access_ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no
%{ endif ~}

%{ for machine in machines ~}
Host ${machine.name}
    User ${machine.user}
    Port 22
    Hostname ${machine.access_ip}
    IdentityFile ${identity_file}
    IdentitiesOnly yes
    StrictHostKeyChecking no

%{ endfor }
