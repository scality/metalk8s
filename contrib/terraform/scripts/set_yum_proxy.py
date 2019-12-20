import ConfigParser
import sys

if __name__ == "__main__":
    assert len(sys.argv) == 2, "Need one and only one CLI argument"

    config = ConfigParser.RawConfigParser()
    config.read("/etc/yum.conf")

    config.set("main", "proxy", sys.argv[1])

    with open("/etc/yum.conf", "w") as yum_conf:
        config.write(yum_conf)
