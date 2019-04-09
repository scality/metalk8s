#
# State to manage etcd certs signed by the etcd CA server
#
# Available states
# ================
#
# * healthcheck-client    -> generate etcd healthcheck client key and certificate
# * peer                  -> generate etcd peer key and certificate
# * server                -> generate etcd server key and certificate
include:
  - .healthcheck-client
  - .peer
  - .server
