#!/usr/bin/env bash
# shellcheck disable=SC1001
# shellcheck disable=SC2162

read -a all_stages <<< "$DEBUG_STAGES"

true > .debug_stages

if [ -z "$DEBUG_PROPERTY" ]; then
    echo "Nothing to do, property not set"
    exit 0
elif [ "$DEBUG_PROPERTY" = all ]; then
    for stage in "${all_stages[@]}"; do
        echo "DEBUG_$(sed 's/-/_/' <<< "$stage")=true" >> .debug_stages
    done
elif [[ "$DEBUG_PROPERTY" =~ ^[a-z\-]+(~[a-z\-]+)*$ ]]; then
    search_pattern=$(sed 's/~/|/' <<< "$DEBUG_PROPERTY")
    for stage in "${all_stages[@]}"; do
        if [[ "$stage" =~ $search_pattern ]]; then
            echo "DEBUG_$(sed 's/-/_/' <<< "$stage")=true" >> .debug_stages
        else
            echo "DEBUG_$(sed 's/-/_/' <<< "$stage")=false" >> .debug_stages
        fi
    done
else
    cat >&2 << EOF
Invalid "debug" build property value "$DEBUG_PROPERTY".
Must use either:
- "all", to select all debug stages
- a single stage name
- a list of stage names, separated by tilde signs "~", 
  e.g. "single-node~multiple-nodes".
EOF
fi
