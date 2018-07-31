#!/bin/sh

#
# Script to setup the default index pattern in kibana
#

set -ue

INDEX_ID="logstash-*"

API_HOSTNAME="$KIBANA_SERVICE_HOST:$KIBANA_SERVICE_PORT"

COUNTDOWN=3


set_index_pattern()
{
    curl -s -o /dev/null -w "%{http_code}" \
        -XPOST \
        -H "Content-type: application/json" \
        -H "kbn-xsrf: anything" \
        "http://$API_HOSTNAME/api/saved_objects/index-pattern/$INDEX_ID" \
        -d "{\"attributes\": {\"title\": \"$INDEX_ID\", \"timeFieldName\": \"@timestamp\"}}"
}

set_default_index()
{
    curl -s -o /dev/null -w "%{http_code}" \
        -XPOST \
        -H "Content-type: application/json" \
        -H "kbn-xsrf: anything" \
        "http://$API_HOSTNAME/api/kibana/settings/defaultIndex" \
        -d "{\"value\": \"$INDEX_ID\"}"
}


# Wait for kibana service to be ready
while [ "$COUNTDOWN" -gt 0 ]; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_HOSTNAME")
    if [ "$http_code" = "200" ]; then
        break
    else
        COUNTDOWN=$((COUNTDOWN - 1))
        if [ "$COUNTDOWN" -le 0 ]; then
            echo "Error: Can't connect to the kibana api server"
            exit 1
        else
            sleep 30
        fi
    fi
done

http_code=$(set_index_pattern)

if [ "$http_code" = "409" ]; then
    echo "Index pattern '$INDEX_ID' is already registered"
elif [ "$http_code" != "200" ]; then
    echo "Error: An error occured when trying to set kibana index pattern (http code: $http_code)"
    exit 1
fi

http_code=$(set_default_index)

if [ "$http_code" != "200" ]; then
    echo "Error: An error occured when trying to set default kibana index (http code: $http_code)"
    exit 1
fi

echo "Successful register '$INDEX_ID' as kibana index pattern"
