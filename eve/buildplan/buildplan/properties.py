from buildplan import core
from buildplan import shell


def set_property_from_file(name, filename, description=None, **kwargs):
    step_name = "(prop) {}".format(
        name if description is None else description
    )

    return core.SetPropertyFromCommand(
        step_name,
        property_name=name,
        command=shell._if("[[ -f {filename} ]]", "cat {filename}").format(
            filename=filename
        ),
        **kwargs
    )


def set_switch_property(
    name, predicate, description=None, value="true", **kwargs
):
    """A switch property is made to be used with `doStepIf`.

    If the predicate is true, the property will be set to `value`. Otherwise,
    it will be set to the empty string, allowing for manipulations within
    interpolations (such as negating a switch value).
    """
    step_name = "(switch) {}".format(
        name if description is None else description
    )

    return core.SetPropertyFromCommand(
        step_name,
        property_name=name,
        command=shell._if(predicate, "echo '{value}'").format(value=value),
        **kwargs
    )


def if_switch(name, on="true", off="false"):
    """Helper for using switch properties in `doStepIf`.

    If the property is not set, or if it is set to an empty string, this will
    interpolate to the value of `off`. Otherwise, it will interpolate to the
    `on` value.
    """
    return "%(prop:{switch}:#?|{on}|{off})s".format(
        switch=name, on=on, off=off
    )


def switch_steps(name, on=None, off=None):
    if on is None and off is None:
        raise ValueError(
            "Must provide one of `on` or `off` options for this switch"
        )

    if on is not None:
        for step in on:
            assert (
                getattr(step, "do_step_if") is None
            ), "Cannot combine switches with other props at the moment"
            step.do_step_if = if_switch(name)
            yield step

    if off is not None:
        for step in off:
            assert (
                getattr(step, "do_step_if") is None
            ), "Cannot combine switches with other props at the moment"
            step.do_step_if = if_switch(name, on="false", off="true")
            yield step
