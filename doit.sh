#!/bin/sh

# System-wide Python 3 command.
PYTHON_SYS="${PYTHON_SYS:-python3}"
# Buildchain location.
BUILDCHAIN=buildchain
# Location of the virtual environment for the buildchain.
BUILDENV="${BUILDCHAIN}/.venv"
# requirements.txt for the buildchain.
REQUIREMENTS="${BUILDCHAIN}/requirements.txt"
# Dummy file to keep track of when the virtual environment was installed.
WITNESS_FILE="${BUILDENV}/installed.tstamp"

# Can't use `[ file1 -nt file2 ]` directly because it's not POSIX :'(
REQ_TSTAMP=$(stat -c %Y "${REQUIREMENTS}")
WIT_TSTAMP=$(stat -c %Y "${WITNESS_FILE}" 2> /dev/null || echo '0')

# Install/reinstall the virtual environment only if it either doesn't exist or
# the requirements have changed since its creation.
if [ "${REQ_TSTAMP}" -gt "${WIT_TSTAMP}" ]
then
    "${PYTHON_SYS}" -m venv --clear "${BUILDENV}"
    "${BUILDENV}/bin/pip" install -r "${REQUIREMENTS}"
    touch "${WITNESS_FILE}"
fi

"${BUILDENV}/bin/python" -m doit "$@"
