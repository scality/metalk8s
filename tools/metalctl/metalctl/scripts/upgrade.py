"""Upgrade script, split into steps."""

import json
import logging
import time

from packaging.version import Version

from metalctl import checkpoint
from metalctl.salt import salt_call, salt_run, salt
from metalctl import utils


logger = logging.getLogger(__name__)


def kubectl(*args):
    cmd = ("kubectl", "--kubeconfig=/etc/kubernetes/admin.conf", *args)
    logger.debug("Running '%s' locally", " ".join(cmd))
    return utils.raise_or_return(utils.run_command(*cmd), logger=logger)


def upgrade_bootstrap(saltenv):
    salt_call("saltutil.sync_all", saltenv=saltenv, logger=logger)
    salt_run(
        "state.orchestrate",
        "metalk8s.orchestrate.bootstrap.pre-upgrade",
        saltenv=saltenv,
        logger=logger,
    )
    salt_call(
        "state.sls",
        'sync_mods="all"',
        "metalk8s.salt.master.installed",
        local_mode=True,
        saltenv=saltenv,
        logger=logger,
    )


def set_cluster_version(destination_version):
    kubectl(
        "patch",
        "ns/kube-system",
        "--patch",
        json.dumps(
            {
                "metadata": {
                    "annotations": {
                        "metalk8s.scality.com/cluster-version": destination_version
                    }
                }
            }
        ),
    )


def run_pre_upgrade(saltenv):
    salt_run("saltutil.sync_all", saltenv=saltenv, logger=logger)
    salt_run(
        "state.orchestrate",
        "metalk8s.orchestrate.upgrade.pre",
        saltenv=saltenv,
        logger=logger,
    )


def upgrade_etcd(saltenv):
    salt_run("saltutil.sync_all", saltenv=saltenv, logger=logger)
    salt_run("metalk8s_saltutil.sync_auth", saltenv=saltenv, logger=logger)
    salt_run("saltutil.sync_roster", saltenv=saltenv, logger=logger)
    salt_run(
        "state.orchestrate", "metalk8s.orchestrate.etcd", saltenv=saltenv, logger=logger
    )


def upgrade_apiserver(saltenv):
    salt_run(
        "state.orchestrate",
        "metalk8s.orchestrate.apiserver",
        saltenv=saltenv,
        logger=logger,
    )


def upgrade_local_engines(saltenv):
    endpoints = salt_call("pillar.get", "metalk8s:endpoints")
    assert (
        "salt-master" in endpoints
    ), "Missing 'metalk8s:endpoints:salt-master' in pillar"
    assert (
        "repositories" in endpoints
    ), "Missing 'metalk8s:endpoints:repositories' in pillar"

    salt_call(
        "state.sls",
        'sync_mods="all"',
        "metalk8s.kubernetes.kubelet.standalone",
        local_mode=True,
        saltenv=saltenv,
        pillar={
            "metalk8s": {
                "endpoints": {
                    "salt-master": endpoints["salt-master"],
                    "repositories": endpoints["repositories"],
                }
            }
        },
        logger=logger,
    )
    # NOTE: Sleep a bit at the end so that container properly stop before
    #       going to the next step
    time.sleep(20)

    # Wait for some containers before continuing the upgrade
    for container in ["repositories", "salt-master", "etcd", "kube-apiserver"]:
        salt_call(
            "cri.wait_container",
            f'name="{container}"',
            "state=running",
            "timeout=180",
            local_mode=True,
            logger=logger,
        )

    salt_call(
        "http.wait_for_successful_query",
        "https://127.0.0.1:7443/healthz",
        "verify_ssl=False",
        "status=200",
        'match="ok"',
        local_mode=True,
        logger=logger,
    )


def upgrade_nodes(saltenv, drain_timeout):
    salt_run(
        "state.orchestrate",
        "metalk8s.orchestrate.upgrade",
        saltenv=saltenv,
        pillar={"orchestrate": {"drain_timeout": drain_timeout}},
        logger=logger,
    )


def upgrade_node(node, saltenv, drain_timeout, destination_version, skip_drain=False):
    utils.retry(
        lambda: salt_run(
            "metalk8s.check_pillar_keys",
            "keys=['metalk8s.endpoints.repositories']",
            logger=logger,
        ),
        retries=4,
        sleep=5,
    )
    salt(
        node,
        "state.sls",
        "metalk8s.kubernetes.apiserver-proxy",
        saltenv=saltenv,
        logger=logger,
    )
    salt_run(
        "http.wait_for_successful_query",
        "https://127.0.0.1:7443/healthz",
        "match=ok",
        "status=200",
        "verify_ssl=False",
        logger=logger,
    )
    kubectl(
        "patch",
        f"node/{node}",
        "--patch",
        json.dumps(
            {
                "metadata": {
                    "labels": {"metalk8s.scality.com/version": destination_version}
                }
            }
        ),
    )
    salt_run(
        "state.orchestrate",
        "metalk8s.orchestrate.deploy_node",
        saltenv=saltenv,
        pillar={
            "orchestrate": {
                "node_name": node,
                "drain_timeout": drain_timeout,
                "skip_draining": skip_drain,
            }
        },
        logger=logger,
    )


def deploy_kubernetes(saltenv):
    salt_run("saltutil.sync_all", saltenv=saltenv, logger=logger)
    salt_run(
        "state.orchestrate",
        "metalk8s.service-configuration.deployed",
        saltenv=saltenv,
        logger=logger,
    )
    salt_run("state.orchestrate", "metalk8s.deployed", saltenv=saltenv, logger=logger)


def run_post_upgrade(saltenv):
    salt_run(
        "state.orchestrate",
        "metalk8s.orchestrate.upgrade.post",
        saltenv=saltenv,
        logger=logger,
    )


def run_all(
    destination_version,
    drain_timeout,
    cp_file=checkpoint.default_cp_file("upgrade"),
    prompt_for_retry=False,
):
    saltenv = f"metalk8s-{destination_version}"
    steps = [
        checkpoint.Step("upgrade-bootstrap", upgrade_bootstrap, (saltenv,)),
        checkpoint.Step(
            "set-cluster-version", set_cluster_version, (destination_version,)
        ),
        checkpoint.Step("pre-upgrade", run_pre_upgrade, (saltenv,)),
        checkpoint.Step("upgrade-etcd", upgrade_etcd, (saltenv,)),
        checkpoint.Step("upgrade-apiserver", upgrade_apiserver, (saltenv,)),
        checkpoint.Step("upgrade-local-engines", upgrade_local_engines, (saltenv,)),
    ]

    dst = Version(destination_version)
    skipped_nodes = []
    nodes = _get_nodes()
    skip_drain = len(nodes) == 1
    for node in nodes:
        if Version(node["version"]) <= dst:
            steps.append(
                checkpoint.Step(
                    f"upgrade-node-{node['name']}",
                    upgrade_node,
                    (node["name"], saltenv, drain_timeout, destination_version),
                    {"skip_drain": skip_drain},
                )
            )
        else:
            skipped_nodes.append(node)

    if skipped_nodes:
        logger.info(
            "The following nodes will not be upgraded (version is newer than %s): %s",
            destination_version,
            ", ".join(f"{node['name']} ({node['version']})" for node in skipped_nodes),
        )

    steps.extend(
        [
            checkpoint.Step("deploy-kubernetes-objects", deploy_kubernetes, (saltenv,)),
            checkpoint.Step("post-upgrade", run_post_upgrade, (saltenv,)),
        ]
    )
    cp = checkpoint.Checkpointer(steps, path=cp_file, logger=logger)
    cp.run_all(prompt_for_retry=prompt_for_retry, destroy_on_success=True)


# Helpers
def _get_nodes(logger=logger):
    nodes = salt_call("pillar.get", "metalk8s:nodes", logger=logger)
    # Return master nodes first, since we want to upgrade them in this order
    return sorted(
        [dict(name=name, **node) for name, node in nodes.items()],
        key=lambda node: 0 if "master" in node.get("roles", []) else 1,
    )
