# Python best practices

## Import

### Avoid `from module_foo import symbol_bar`

In general, it is a good practice to avoid the form `from foo import bar`
because it introduces two distinct bindings (`bar` is distinct from `foo.bar`)
and when the binding in one namespace changes, the binding in the other will
not…

That's also why this can interfere with the mocking.

All in all, this should be avoided when unecessary.

#### Rationale

Reduce the likelihood of surprising behaviors and ease the mocking.

#### Example

``` python
# Good
import foo

baz = foo.Bar()

# Bad
from foo import Bar

baz = Bar()
```

#### References

- [Idioms and Anti-Idioms in Python](https://docs.python.org/3.1/howto/doanddont.html#from-module-import-name1-name2%0A)
- [unittest.mock documentation](https://docs.python.org/3.6/library/unittest.mock.html#where-to-patch)

## Naming

### Predicate functions

Functions that return a Boolean value should have a name that starts with
`has_`, `is_`, `was_`, `can_` or something similar that makes it clear that it
returns a Boolean.

This recommandation also applies to Boolean variable.

#### Rationale

Makes code clearer and more expressive.

#### Example

``` python
class Foo:
    # Bad.
    def empty(self):
        return len(self.bar) == 0

    # Bad.
    def baz(self, initialized):
        if initialized:
            return
        […]

    # Good.
    def is_empty(self):
        return len(self.bar) == 0

    # Good.
    def qux(self, is_initialized):
        if is_initialized:
            return
        […]
```

## Patterns and idioms

### Don't write code vulnerable to "Time of check to time of use"

When there is a time window between the checking of a condition and the use of
the result of that check where the result may become outdated, you should always
follow the **EAFP** (It is Easier to Ask for Forgiveness than Permission)
philosophy rather than the **LBYL** (Look Before You Leap) one (because it
gives you a false sense of security).

Otherwise, your code will be vulnerable to the infamous **TOCTTOU** (Time Of
Check To Time Of Use) bugs.

In Python terms:
- **LBYL**: `if` guard around the action
- **EAFP**: `try`/`except` statements around the action

#### Rationale

Avoid race conditions, which are a source of bugs and security issues.

#### Examples

``` python
# Bad: the file 'bar' can be deleted/created between the `os.access` and
# `open` call, leading to unwanted behavior.
if os.access('bar', os.R_OK):
    with open(bar) as fp:
        return fp.read()
return 'some default data'

# Good: no possible race here.
try:
    with open('bar') as fp:
        return fp.read()
except OSError:
    return 'some default data'
```

#### References

- [Time of check to time of use](https://en.wikipedia.org/wiki/Time_of_check_to_time_of_use)

### Minimize the amount of code in a `try` block

The size of a `try` block should be as small as possible.

Indeed, if the `try` block spans over several statements that can raise an
exception catched by the `except`, it can be difficult to know which statement
is at the origin of the error.

Of course, this rule doesn't apply to the catch-all `try/except` that is used to
wrap existing exceptions or to log an error at the top level of a script.

Having several statements is also OK if each of them raises a different exception
or if the exception carries enough information to make the distinction between
the possible origins.

#### Rationale

Easier debugging, since the origin of the error will be easier to pinpoint.

### Don't use `hasattr` in Python 2

To check the existence of an attribute, don't use `hasattr`: it shadows errors
in properties, which can be surprising and hide the root cause of bugs/errors.

#### Rationale

Avoid surprising behavior and hard-to-track bugs.

#### Examples

``` python
# Bad.
if hasattr(x, "y"):
    print(x.y)
else:
    print("no y!")

# Good.
try:
    print(x.y)
except AttributeError:
    print("no y!")
```

#### References

- [hasattr() – A Dangerous Misnomer](https://hynek.me/articles/hasattr/)
