import argparse
import ConfigParser
import os.path

def main():
    assert os.path.isfile("/etc/redhat-release"), (
        "Can only run this script on RedHat-based systems."
    )

    parser = argparse.ArgumentParser()
    parser.add_argument("--proxy-host", required=True)
    parser.add_argument("--proxy-port", required=True)

    args = parser.parse_args()

    with open("/etc/os-release", "r") as f:
        os_release = f.read().strip()

    if 'ID="rhel"' in os_release:
        rhsm_config = ConfigParser.RawConfigParser()
        rhsm_config.read("/etc/rhsm/rhsm.conf")

        rhsm_config.set("server", "proxy_hostname", args.proxy_host)
        rhsm_config.set("server", "proxy_port", args.proxy_port)

        with open("/etc/rhsm/rhsm.conf", "w") as f:
            rhsm_config.write(f)

    yum_config = ConfigParser.RawConfigParser()
    yum_config.read("/etc/yum.conf")

    yum_config.set(
        "main",
        "proxy",
        "http://{0.proxy_host}:{0.proxy_port}".format(args),
    )

    with open("/etc/yum.conf", "w") as f:
        yum_config.write(f)

if __name__ == "__main__":
    main()
