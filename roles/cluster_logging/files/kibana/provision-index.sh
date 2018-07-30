#!/bin/sh

#
# Script to setup the default index pattern in kibana
#

INDEX_ID="logstash-*"

KIBANA="http://kibana:443"

API_READY=0


set_index_pattern()
{
    curl -s -o /dev/null -w "%{http_code}" \
        -XPOST \
        -H "Content-type: application/json" \
        -H "kbn-xsrf: anything" \
        "$KIBANA/api/saved_objects/index-pattern/$INDEX_ID" \
        -d "{\"attributes\": {\"title\": \"$INDEX_ID\", \"timeFieldName\": \"@timestamp\"}}"
}

set_default_index()
{
    curl -s -o /dev/null -w "%{http_code}" \
        -XPOST \
        -H "Content-type: application/json" \
        -H "kbn-xsrf: anything" \
        "$KIBANA/api/kibana/settings/defaultIndex" \
        -d "{\"value\": \"$INDEX_ID\"}"
}


# Wait for kibana service to be ready
while [ "$API_READY" -eq 0 ]; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$KIBANA")
    if [ "$http_code" = "200" ]; then
        API_READY=1
    else
        sleep 30
    fi
done

http_code=$(set_index_pattern)

if [ "$http_code" = "409" ]; then
    # Index is already registered
    exit 0
fi

if [ "$http_code" != "200" ]; then
    # An error occured
    exit 1
fi

http_code=$(set_default_index)

if [ "$http_code" != "200" ]; then
    # An error occured
    exit 1
fi
