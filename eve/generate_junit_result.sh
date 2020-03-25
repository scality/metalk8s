#!/bin/bash

# Simple ugly bash script to generate really really simple junit file
# with just the result of the build step, waiting for something integrated
# directly in `eve`

FAILURE=0
ERROR=0
TYPE=""

case "$FINAL_STATUS" in
    "SUCCESSFUL")
        ;;
    "FAILED")
        FAILURE=1
        TYPE="failure"
        ;;
    *)
        ERROR=1
        TYPE="error"
        ;;
esac


cat << EOF
<?xml version="1.0" ?>
<testsuites disabled="0" errors="$ERROR" failures="$FAILURE" \
tests="1" time="0.0">
    <testsuite disabled="0" errors="$ERROR" failures="$FAILURE" \
name="$TEST_SUITE" skipped="0" tests="1" time="0">
EOF

if [ "$TYPE" ]; then

    cat << EOF
        <testcase name="$TEST_NAME" classname="$CLASS_NAME">
            <$TYPE type="$TYPE" message="$FINAL_STATUS"/>
        </testcase>
EOF

else
    cat << EOF
        <testcase name="$TEST_NAME" classname="$CLASS_NAME"/>
EOF
fi

cat << EOF
    </testsuite>
</testsuites>
EOF
