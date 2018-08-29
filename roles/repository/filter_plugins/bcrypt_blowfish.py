import itertools

import passlib.hash
import passlib.utils.binary

def bcrypt_blowfish(password, ident=None, rounds=None, seed=None, salt=None):
    if salt is None and seed is not None:
        ok_chars = set(passlib.utils.binary.bcrypt64.charmap)

        filtered_seed = ''.join(c for c in seed if c in ok_chars)

        cycle = itertools.cycle(filtered_seed)
        only_22 = itertools.islice(cycle, 0, 22)

        salt = passlib.utils.binary.bcrypt64.repair_unused(b''.join(only_22))

    return passlib.hash.bcrypt.encrypt(
        password, salt=salt, rounds=rounds, ident=ident, truncate_error=True,
        relaxed=False)

class FilterModule(object):
    def filters(self):
        return {
            'bcrypt_blowfish': bcrypt_blowfish,
        }
