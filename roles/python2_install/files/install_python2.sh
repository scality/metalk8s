PYTHON_BIN=$(which python2 || which python)

PYTHON_VER=$([ ! -z ${PYTHON_BIN} ] && ${PYTHON_BIN} --version)

if [ ${PYTHON_VER} ]; then
    echo 'python2 already installed'
    exit 0;
fi

APT_GET_CMD=$(which apt-get)
YUM_CMD=$(which yum)

if [ ! -z $APT_GET_CMD ]; then
   apt-get update && apt-get install -y python-minimal
elif [ ! -z $YUM_CMD ]; then
   yum -y install python2
else
   echo "error can't install package $PACKAGE"
   exit 1;
fi
