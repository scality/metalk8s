import json

from pytest_bdd import scenario, then
import requests


# Scenarios
@scenario('../features/ui_alive.feature', 'Reach the UI')
def test_ui(host):
    pass


@then("we can reach the UI")
def reach_UI(host):
    with host.sudo():
        cmd_ip = ('salt-call --local network.ip_addrs cidr="172.21.254.32/27"'
               ' --output=json')
        output = host.check_output(cmd_ip)
        ip = json.loads(output)["local"][0]

        cmd_port = ('kubectl --kubeconfig=/etc/kubernetes/admin.conf'
                    ' get svc -n kube-system metalk8s-ui --no-headers'
                    ' -o custom-columns=":spec.ports[0].nodePort"')
        port = host.check_output(cmd_port)

    response = requests.get("http://{ip}:{port}".format(ip=ip, port=port))
    
    assert response.status_code == 200, response.text
          
