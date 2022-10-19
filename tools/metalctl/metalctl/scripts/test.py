import logging
import time

from metalctl import checkpoint
from metalctl.salt import salt, salt_call, salt_run
from metalctl import utils


logger = logging.getLogger(__name__)


def upgrade_salt_minion(node, saltenv):
    salt(node, "saltutil.sync_all", saltenv=saltenv, logger=logger)
    salt(node, "state.sls", "metalk8s.node.grains", saltenv=saltenv, logger=logger)
    salt("*", "mine.update", logger=logger)
    utils.retry(
        lambda: salt(
            node,
            "metalk8s.check_pillar_keys",
            "keys=['metalk8s.endpoints.repositories', 'metalk8s.endpoints.salt-master']",
            logger=logger,
        ),
        retries=4,
        sleep=5,
    )
    salt(
        node,
        "state.sls",
        "metalk8s.salt.minion.configured",
        saltenv=saltenv,
        logger=logger,
    )
    time.sleep(10)
    salt_run("metalk8s_saltutil.wait_minions", node, logger=logger)


def run(saltenv, prompt_for_retry=True):
    steps = [
        checkpoint.Step(
            f"upgrade-salt-minion-{node}", upgrade_salt_minion, (node, saltenv)
        )
        for node in _get_nodes(logger=logger)
    ]
    cp = checkpoint.Checkpointer(
        steps, path=checkpoint.default_cp_file("test"), logger=logger
    )
    cp.run_all(prompt_for_retry=prompt_for_retry, destroy_on_success=True)


# Helpers
def _get_nodes(logger=logger):
    nodes = salt_call("pillar.get", "metalk8s:nodes", logger=logger)
    # Return master nodes first, since we want to upgrade them in this order
    return sorted(nodes.keys())
