# Tests

## Tags
Tags are used to filter tests and are indicated by `@<tag name>` at the top of the feature file.

To limit the scope of the test session to the scenarios with tag `@example_tag`, specify the
filter to tox with `-k`, which will pass it through to the underlying pytest command.

`tox -e tests -- -k "example_tag"`
