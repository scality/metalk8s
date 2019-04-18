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

    while not all(status for status in minions.values()) and attempts < retry:
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

    if not all(status for status in minions.values()):
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
