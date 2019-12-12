from collections import OrderedDict

import pytest

from buildplan import core
from buildplan import shell


def test_helpers():
    assert shell._fmt_args() == ""
    assert shell._fmt_args("a", "b", "c") == "a b c"
    assert shell._fmt_args("hello", None, "world") == "hello world"

    assert shell._and("hello", None, "world") == "hello && world"
    assert shell._or("hello", None, "world") == "hello || world"
    assert shell._seq("hello", None, "world") == "hello; world"

    assert (
        shell._for(["a", "b", "c"], "echo $val", var="val")
        == "for val in a b c; do echo $val; done"
    )
    assert (
        shell._for("{1..10}", "do-something")
        == "for _ in {1..10}; do do-something; done"
    )

    assert (
        shell._if("predicate", "do-something")
        == "if predicate; then do-something; fi"
    )
    assert (
        shell._if("predicate", "do-something", "alternative")
        == "if predicate; then do-something; else alternative; fi"
    )


class TestShell:
    @pytest.mark.parametrize(
        "args,kwargs,expected",
        (
            (
                ["_name", "_command"],
                {},
                core.ShellCommand("_name", "_command"),
            ),
            (
                ["_name", "_command"],
                {"sudo": True},
                core.ShellCommand("_name", "sudo _command"),
            ),
        ),
    )
    def test_dump(self, args, kwargs, expected):
        step = shell.Shell(*args, **kwargs)
        assert step.dump() == expected.dump()


class TestBash:
    @pytest.mark.parametrize(
        "args,kwargs,expected",
        (
            (
                ["_name", "_command"],
                {},
                core.ShellCommand("_name", "bash _command"),
            ),
            (
                ["_name", "_command --with=info"],
                {"inline": True},
                core.ShellCommand("_name", "bash -c '_command --with=info'"),
            ),
            (
                ["_name", "_script.sh", "_argname", "argval"],
                {},
                core.ShellCommand("_name", "bash _script.sh _argname argval"),
            ),
            (
                ["_name", "_script.sh"],
                {"env": {"DEBUG": "True"}, "wrap_env": True},
                core.ShellCommand("_name", "bash env DEBUG=True _script.sh"),
            ),
        ),
    )
    def test_dump(self, args, kwargs, expected):
        step = shell.Bash(*args, **kwargs)
        assert step.dump() == expected.dump()

    def test_error_posargs(self):
        with pytest.raises(
            ValueError, match="Cannot pass positional arguments"
        ):
            shell.Bash("_name", "_command", "_arg", inline=True)
