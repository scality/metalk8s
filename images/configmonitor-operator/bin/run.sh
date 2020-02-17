#!/bin/bash

# kubectl proxy command relays commands from the Operator container to the cluster’s API server

# the second command runs our python operator code

kubectl proxy --port=8001 && python /home/apps/main.py