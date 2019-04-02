import json

import pytest
from pytest_bdd import scenario, then
import requests


# Scenarios
@scenario('../features/ui_alive.feature', 'Reach the UI')
def test_ui(host):
    pass


@then("we can reach the UI")
def reach_UI(host, version, request):
    with host.sudo():
        bootstrap_ip = request.config.getoption("--bootstrap-ip")

        if bootstrap_ip is not None:
            # multi nodes
            pytest.skip("Cannot yet run this test on multi-nodes deployment.")
        else:
            # single node or vagrant
            cmd_cidr = ('salt-call pillar.get networks:workload_plane'
                        ' saltenv=metalk8s-{version} --out json').format(version=version)
            cidr_output = host.check_output(cmd_cidr)
            cidr = json.loads(cidr_output)['local']

            cmd_ip = ('salt-call --local network.ip_addrs cidr="{cidr}"'
                    ' --out=json').format(cidr=cidr)

            output = host.check_output(cmd_ip)
            ip = json.loads(output)['local'][0]

        cmd_port = ('kubectl --kubeconfig=/etc/kubernetes/admin.conf'
                    ' get svc -n kube-system metalk8s-ui --no-headers'
                    ' -o custom-columns=":spec.ports[0].nodePort"')
        port = host.check_output(cmd_port)

    response = requests.get('http://{ip}:{port}'.format(ip=ip, port=port))
    
    assert response.status_code == 200, response.text
          
