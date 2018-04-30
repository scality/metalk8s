#!/usr/bin/env python

import sys
import hashlib

def main():
    assert len(sys.argv) == 2
    assert sys.argv[1] == '-c'

    for line in sys.stdin.readlines():
        line = line.rstrip('\n')
        if line == '':
            break

        [checksum, path] = line.split(None, 1)

        with open(path, 'rb') as fd:
            sha256 = hashlib.sha256()

            while True:
                data = fd.read(32 * 1024)
                if len(data) == 0:
                    break
                sha256.update(data)

            if sha256.hexdigest() != checksum:
                raise Exception('Checksum mismatch')

if __name__ == '__main__':
    main()
