from __future__ import absolute_import, print_function, unicode_literals
import logging
import time

import salt.client
import salt.utils.extmods

log = logging.getLogger(__name__)


def sync_auth(saltenv='base', extmod_whitelist=None, extmod_blacklist=None):
    return salt.utils.extmods.sync(
        __opts__,
        'auth',
        saltenv=saltenv,
        extmod_whitelist=extmod_whitelist,
        extmod_blacklist=extmod_blacklist,
    )[0]


def wait_minions(tgt='*', retry=10):
    client = salt.client.get_local_client(__opts__['conf_file'])

    minions = None

    def condition_reached(minions):
        if minions and all(status for status in minions.values()):
            return True

        # Either `minions` is empty, or not all succeeded
        return False

    for attempts in range(1, retry):
        try:
            minions = client.cmd(tgt, 'test.ping', timeout=2)
        except Exception as exc:  # pylint: disable=broad-except
            log.exception('Unable to run "test.ping" on "%s": "%s"', tgt, exc)
            minions = None

        if condition_reached(minions):
            break

        log.info(
            "[Attempt %d/%d] Waiting for minions to respond: %s",
            attempts,
            retry,
            ', '.join(
                minion
                for minion, status in (minions or {}).items()
                if not status
            )
        )

    if not condition_reached(minions):
        error_message = (
            'Minion{plural} failed to respond after {retry} retries: {minions}'
        ).format(
            plural='s' if len(minions) > 1 else '',
            retry=retry,
            minions=', '.join(
                minion
                for minion, status in (minions or {}).items()
                if not status
            )
        )
        log.error(error_message)
        return {
            'result': False,
            'error': error_message
        }

    # Waiting for running states to complete
    state_running = client.cmd(tgt, 'saltutil.is_running', arg=['state.*'])
    attempts = 1

    # If we got only empty result then no state running
    while attempts <= retry and any(state_running.values()):
        log.info(
            "[Attempt %d/%d] Waiting for running jobs to complete: %s",
            attempts,
            retry,
            ' - '.join(
                'State on minion "{minion}": {states}'.format(
                    minion=minion,
                    states=', '.join(
                        "PID={state[pid]} JID={state[jid]}".format(state=state)
                        for state in running_states
                    )
                )
                for minion, running_states in state_running.items()
                if running_states
            )
        )
        time.sleep(5)
        state_running = client.cmd(tgt, 'saltutil.is_running', arg=['state.*'])
        attempts += 1

    if any(state_running.values()):
        error_message = (
            'Minion{plural} still have running state after {retry} retries: '
            '{minions}'
        ).format(
            plural='s' if len(state_running) > 1 else '',
            retry=retry,
            minions=', '.join(
                minion for minion, running_state in state_running.items()
                if running_state
            )
        )
        log.error(error_message)
        return {
            'result': False,
            'error': error_message
        }

    return {
        'result': True,
        'comment':
            'All minions matching "{}" responded and finished startup '
            'state: {}'.format(
                tgt, ', '.join(minions)
            )
    }


def orchestrate_show_sls(mods,
                         saltenv='base',
                         test=None,
                         queue=False,
                         pillar=None,
                         pillarenv=None,
                         pillar_enc=None):
    '''
    Display the state data from a specific sls, or list of sls files, after
    being render using the master minion.

    Note, the master minion adds a "_master" suffix to it's minion id.

    .. seealso:: The state.show_sls module function

    CLI Example:
    .. code-block:: bash

        salt-run state.orch_show_sls my-orch-formula.my-orch-state 'pillar={ nodegroup: ng1 }'
    '''
    if pillar is not None and not isinstance(pillar, dict):
        raise SaltInvocationError(
            'Pillar data must be formatted as a dictionary')

    __opts__['file_client'] = 'local'
    minion = salt.minion.MasterMinion(__opts__)
    running = minion.functions['state.show_sls'](
        mods,
        test,
        queue,
        pillar=pillar,
        pillarenv=pillarenv,
        pillar_enc=pillar_enc,
        saltenv=saltenv)

    ret = {minion.opts['id']: running}
    return ret
