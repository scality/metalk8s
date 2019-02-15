Build salt-master image
=======================

```
docker build -t moonshot/salt-master metalk8s/salt-master

docker build -t moonshot/salt-master2016 --build-arg SALT_VERSION=2016.11 metalk8s/salt-master
```

Run salt-master container
=========================

* Create persistent data directory
```
mkdir /path/to/persistent/data/salt-master
```

* Normal mode
```
docker run --name salt-master \
    --rm --detach \
    -v /path/to/persistent/data/salt-master:/etc/salt \
    -p 4505:4505 \
    -p 4506:4506 \
    moonshot/salt-master
```

* Debug mode
```
docker run --name salt-master \
    --rm --tty \
    -v /path/to/persistent/data/salt-master:/etc/salt \
    -p 4505:4505 \
    -p 4506:4506 \
    moonshot/salt-master \
    --log-level=debug
```

Run salt commands in container
==============================

```
docker exec salt-master salt-key -L
docker exec salt-master salt-key -Ay

docker exec salt-master salt '*' test.ping
```

