from __future__ import absolute_import, print_function, unicode_literals
import logging
import time

from salt.exceptions import CommandExecutionError
import salt.client
import salt.utils.extmods

log = logging.getLogger(__name__)


def sync_auth(saltenv="base", extmod_whitelist=None, extmod_blacklist=None):
    return salt.utils.extmods.sync(
        __opts__,
        "auth",
        saltenv=saltenv,
        extmod_whitelist=extmod_whitelist,
        extmod_blacklist=extmod_blacklist,
    )[0]


def accept_minion(minion):
    """Salt state that accept a minion key

    Using `key.accept` from wheel alone does not report if the minion actually get accepted"""
    if minion in __salt__["manage.up"]():
        # Minion key already accepted
        return True

    ret = __salt__["salt.cmd"]("saltutil.wheel", "key.accept", minion)
    if not isinstance(ret, dict) or not ret.get("success"):
        raise CommandExecutionError(f"Accept of minion '{minion}' key failed: {ret}")

    # NOTE: `key.accept` report success even if this is not accepted at the end
    # See: https://github.com/saltstack/salt/issues/63477
    # So instead check that there is our minion in the return
    if minion not in ret.get("return", {}).get("minions", []):
        raise CommandExecutionError(
            f"Minion '{minion}' key has not been accepted: {ret}"
        )

    return True


def wait_minions(tgt="*", retry=10):
    client = salt.client.get_local_client(__opts__["conf_file"])

    minions = None

    def condition_reached(minions):
        if minions and all(status for status in minions.values()):
            return True

        # Either `minions` is empty, or not all succeeded
        return False

    for attempts in range(1, retry):
        try:
            minions = client.cmd(tgt, "test.ping", timeout=2)
        except Exception as exc:  # pylint: disable=broad-except
            log.exception('Unable to run "test.ping" on "%s": "%s"', tgt, exc)
            minions = None

        if condition_reached(minions):
            break

        log.info(
            "[Attempt %d/%d] Waiting for minions to respond: %s",
            attempts,
            retry,
            ", ".join(
                minion for minion, status in (minions or {}).items() if not status
            ),
        )

    if not condition_reached(minions):
        error_message = (
            "Minion{plural} failed to respond after {retry} retries: {minions}"  # pylint: disable=consider-using-f-string
        ).format(
            plural="s" if len(minions or {}) > 1 else "",
            retry=retry,
            minions=", ".join(
                minion
                for minion, status in (minions or {tgt: False}).items()
                if not status
            ),
        )
        log.error(error_message)
        raise CommandExecutionError(error_message)

    # Waiting for running states to complete
    state_running = client.cmd(tgt, "saltutil.is_running", arg=["state.*"])
    attempts = 1

    # If we got only empty result then no state running
    while attempts <= retry and any(state_running.values()):
        log.info(
            "[Attempt %d/%d] Waiting for running jobs to complete: %s",
            attempts,
            retry,
            " - ".join(
                'State on minion "{minion}": {states}'.format(  # pylint: disable=consider-using-f-string
                    minion=minion,
                    states=", ".join(
                        f"PID={state['pid']} JID={state['jid']}"
                        for state in running_states
                    ),
                )
                for minion, running_states in state_running.items()
                if running_states
            ),
        )
        time.sleep(5)
        state_running = client.cmd(tgt, "saltutil.is_running", arg=["state.*"])
        attempts += 1

    if any(state_running.values()):
        error_message = (
            "Minion{plural} still have running state after {retry} retries: "  # pylint: disable=consider-using-f-string
            "{minions}"
        ).format(
            plural="s" if len(state_running) > 1 else "",
            retry=retry,
            minions=", ".join(
                minion
                for minion, running_state in state_running.items()
                if running_state
            ),
        )
        log.error(error_message)
        raise CommandExecutionError(error_message)

    return (
        f'All minions matching "{tgt}" responded and finished startup '
        f"state: {', '.join(minions)}"
    )
