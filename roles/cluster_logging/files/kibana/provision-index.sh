#!/bin/sh

#
# Script to setup the default index pattern in kibana
#

set -e

if [ ! -z "$INDEX_PATTERN" ]; then
    echo "Error: INDEX_PATTERN is not set"
    exit 1
fi

API_HOSTNAME="$(printenv "${KIBANA_SVC}_SERVICE_HOST"):$(printenv "${KIBANA_SVC}_SERVICE_PORT")"

COUNTDOWN=10
SLEEP_DELAY=5

set_index_pattern()
{
    curl -s -o /dev/null -w "%{http_code}" \
        -XPOST \
        -H "Content-type: application/json" \
        -H "kbn-xsrf: anything" \
        "http://$API_HOSTNAME/api/saved_objects/index-pattern/$INDEX_PATTERN" \
        -d "{\"attributes\": {\"title\": \"$INDEX_PATTERN\", \"timeFieldName\": \"@timestamp\"}}"
}

set_default_index()
{
    curl -s -o /dev/null -w "%{http_code}" \
        -XPOST \
        -H "Content-type: application/json" \
        -H "kbn-xsrf: anything" \
        "http://$API_HOSTNAME/api/kibana/settings/defaultIndex" \
        -d "{\"value\": \"$INDEX_PATTERN\"}"
}


# Wait for kibana service to be ready
while [ "$COUNTDOWN" -gt 0 ]; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_HOSTNAME")
    if [ "$http_code" = "200" ]; then
        break
    else
        COUNTDOWN=$((COUNTDOWN - 1))
        if [ "$COUNTDOWN" -le 0 ]; then
            echo "Error: Can't connect to the Kibana API server"
            exit 1
        else
            sleep $SLEEP_DELAY
        fi
    fi
done

http_code=$(set_index_pattern)

if [ "$http_code" = "409" ]; then
    echo "Index pattern '$INDEX_PATTERN' is already registered"
elif [ "$http_code" != "200" ]; then
    echo "Error: An error occurred when trying to set the Kibana index pattern (http code: $http_code)"
    exit 1
fi

http_code=$(set_default_index)

if [ "$http_code" != "200" ]; then
    echo "Error: An error occurred when trying to set the default Kibana index (http code: $http_code)"
    exit 1
fi

echo "Successful registered '$INDEX_PATTERN' as Kibana index pattern"
