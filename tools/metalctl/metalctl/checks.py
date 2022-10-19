import logging

from metalctl.salt import salt_run


default_logger=logging.getLogger(__name__)


def pre_upgrade(destination_version, logger=default_logger):
    logger.info("Checking if upgrade to %s is possible", destination_version)
    saltenv = f"metalk8s-{destination_version}"
    salt_run("saltutil.sync_all", saltenv=saltenv, logger=logger)
    salt_run(
        "metalk8s_checks.upgrade",
        f"dest_version={destination_version}",
        "raises=False",
        saltenv=saltenv,
        logger=logger
    )
