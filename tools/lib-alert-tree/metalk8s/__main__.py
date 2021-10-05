"""CLI entry-point for manipulating MetalK8s alert tree."""

from lib_alert_tree.cli import generate_cli

from . import CLUSTER_WARNING, CLUSTER_CRITICAL

main = generate_cli(
    roots={"cluster-degraded": CLUSTER_WARNING, "cluster-at-risk": CLUSTER_CRITICAL}
)

if __name__ == "__main__":
    main()
