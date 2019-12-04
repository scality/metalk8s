"""Generate the Eve YAML description of build plan for MetalK8s."""
import sys

import core
import yamlprint


def build_project():
    project = core.Project()
    project.add(pre_merge())
    return project


def pre_merge():
    return core.Stage(
        name="pre-merge",
        worker=core.LocalWorker(),
        branches=[
            "user/*",
            "feature/*",
            "improvement/*",
            "bugfix/*",
            "w/*",
            "q/*",
            "hotfix/*",
            "dependabot/*",
            "documentation/*",
            "release/*",
        ],
        steps=[],
    )


if __name__ == "__main__":
    build_plan = build_project().dump()
    yamlprint.dump(build_plan, stream=sys.stdout)
