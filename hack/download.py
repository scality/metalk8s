#!/usr/bin/env python

import sys

try:
    # Python 3
    import urllib.request
    urlretrieve = urllib.request.urlretrieve
except ImportError:
    # Python 2
    import urllib
    urlretrieve = urllib.urlretrieve

if __name__ == '__main__':
    assert len(sys.argv) == 3
    urlretrieve(sys.argv[1], sys.argv[2])
