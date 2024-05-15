#!/bin/sh

OSTYPE="$(uname -s)"
# System-wide Python 3 command.
PYTHON_SYS="${PYTHON_SYS:-python3}"
MINIMUM_PYTHON_VERSION='(3, 10)'
# Buildchain location.
BUILDCHAIN=buildchain
# Location of the virtual environment for the buildchain.
BUILDENV="${BUILDCHAIN}/.venv"
# requirements.txt for the buildchain.
REQUIREMENTS="${BUILDCHAIN}/requirements.txt"
# Dummy file to keep track of when the virtual environment was installed.
WITNESS_FILE="${BUILDENV}/installed.tstamp"
# File containing environment variables.
DOTENV=./.env


# Check Python version.
"$PYTHON_SYS" -c "$(cat <<EOF
import sys

sys.exit(0 if sys.version_info >= $MINIMUM_PYTHON_VERSION else 1)
EOF
)"

if [ "$?" -eq 1 ];
then
    echo "$($PYTHON_SYS -V) too old, 3.10 minimum is required" >&2
    exit 1
fi

if [ "$OSTYPE" = "Darwin" ]
then
    GET_FILE_STAMP='stat -f %m'
else
    GET_FILE_STAMP='stat -c %Y'
fi

# Can't use `[ file1 -nt file2 ]` directly because it's not POSIX :'(
REQ_TSTAMP=$($GET_FILE_STAMP "${REQUIREMENTS}")
WIT_TSTAMP=$($GET_FILE_STAMP "${WITNESS_FILE}" 2> /dev/null || echo '0')

# Install/reinstall the virtual environment only if it either doesn't exist or
# the requirements have changed since its creation.
if [ "${REQ_TSTAMP}" -gt "${WIT_TSTAMP}" ]
then
    "${PYTHON_SYS}" -m venv --clear "${BUILDENV}"
    "${BUILDENV}/bin/pip" install -r "${REQUIREMENTS}"
    touch "${WITNESS_FILE}"
fi

# Load customized environment variables from dotenv file, if exists.
if [ -f "${DOTENV}" ]
then
    # shellcheck source=/dev/null
    . "${DOTENV}"
fi

exec "${BUILDENV}/bin/python" -m doit "$@"
