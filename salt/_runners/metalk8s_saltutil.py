from __future__ import absolute_import, print_function, unicode_literals

import salt.utils.extmods

def sync_auth(saltenv='base', extmod_whitelist=None, extmod_blacklist=None):
    return salt.utils.extmods.sync(
        __opts__,
        'auth',
        saltenv=saltenv,
        extmod_whitelist=extmod_whitelist,
        extmod_blacklist=extmod_blacklist,
    )[0]
