#!/usr/bin/env python

import optparse
import os.path


def realpath(files):
    for file_ in files:
        print(os.path.realpath(file_))


if __name__ == '__main__':
    parser = optparse.OptionParser()
    (_, pos_args) = parser.parse_args()
    realpath(pos_args)
