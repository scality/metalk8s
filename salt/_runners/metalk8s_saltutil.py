from __future__ import absolute_import, print_function, unicode_literals
import logging

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

    minions = client.cmd(tgt, 'test.ping', timeout=2)
    attempts = 1

    def condition_reached(minions, attempts):
        if attempts > retry:
            return True

        if minions and all(status for status in minions.values()):
            return True

        # Either `minions` is empty, or not all succeeded
        return False

    while not condition_reached(minions, attempts):
        log.info(
            "[Attempt %d/%d] Waiting for minions to respond: %s",
            attempts,
            retry,
            ', '.join(
                minion for minion, status in minions.items() if not status
            )
        )
        minions = client.cmd(tgt, 'test.ping', timeout=2)
        attempts += 1

    if not minions or not all(status for status in minions.values()):
        error_message = (
            'Minion{plural} failed to respond after {retry} retries: {minions}'
        ).format(
            plural='s' if len(minions) > 1 else '',
            retry=retry,
            minions=', '.join(
                minion for minion, status in minions.items() if not status
            )
        )
        log.error(error_message)
        return {
            'result': False,
            'error': error_message
        }

    return {
        'result': True,
        'comment': 'All minions matching "{}" responded: {}'.format(
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
