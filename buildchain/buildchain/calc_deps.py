"""Debug `calc_deps` issue."""

from buildchain import config
from buildchain import utils


BUILD_DIR = config.BUILD_ROOT / "mods"
BUILD_DIR.mkdir(parents=True, exist_ok=True)

MOD_IMPORTS = {"a": ["b", "c"], "b": ["f", "g"], "c": [], "f": ["c"], "g": []}


def print_deps(mod, dependencies):
    print("%s -> %s" % (mod, dependencies))


def make_mod(mod):
    (BUILD_DIR / mod).touch()


def task_make_mod():
    """task that depends on all direct imports"""
    for mod in MOD_IMPORTS.keys():
        yield {
            "name": mod,
            "actions": [
                (print_deps, (mod,)),
                (make_mod, (mod,)),
            ],
            "targets": [BUILD_DIR / mod],
            "calc_dep": ["get_dep:%s" % mod],
        }


def get_dep(mod):
    # fake implementation
    return {
        "file_dep": [BUILD_DIR / dep for dep in MOD_IMPORTS[mod]],
        "task_dep": [f"make_mod:{dep}" for dep in MOD_IMPORTS[mod]],
    }


def task_get_dep():
    """get direct dependencies for each module"""
    for mod in MOD_IMPORTS.keys():
        yield {
            "name": mod,
            "actions": [(get_dep, [mod])],
        }


__all__ = utils.export_only_tasks(__name__)
