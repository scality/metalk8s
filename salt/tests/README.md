# Salt Tests

## Unit
Unit tests are used to test each Salt custom function in MetalK8s.

It uses [unittest](https://docs.python.org/2/library/unittest.html)
and [SaltTesting](https://github.com/saltstack/salt-testing) that
provide some helpers to write tests for Salt modules, pillars, ...


### Run tests using tox

```
tox -e unit-tests
```

### Run tests using pytest

First install requirements from `requirements.txt` and then run tests:

```
pytest salt/tests/unit
```
