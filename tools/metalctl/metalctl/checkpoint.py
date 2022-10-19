from contextlib import contextmanager
import json
import logging
from pathlib import Path
import shutil
from typing import Any, Callable, Dict, Iterable, List, Optional

from metalctl import errors
from metalctl import utils


DEFAULT_CP_DIR = Path("/run/metalk8s/checkpoints")


def default_cp_file(name):
    return DEFAULT_CP_DIR / f"{name}.json"


class Skip(Exception):
    """Skip a checkpoint step."""


class Step:
    def __init__(
        self,
        step_id: str,
        fun: Callable[..., Any],
        args: Optional[Iterable[Any]] = None,
        kwargs: Optional[Dict[str, Any]] = None,
    ):
        self.id = step_id
        self.fun = fun
        self.args = args or []
        self.kwargs = kwargs or {}

    def _run(self):
        return self.fun(*self.args, **self.kwargs)

    def run(self, prompt_for_retry=False):
        if prompt_for_retry:
            return utils.prompt_for_retry(self._run)
        return self._run()


class Checkpointer:
    def __init__(self, steps: List[Step], path: Path, logger: logging.Logger):
        # Order of the steps is preserved
        self.checkpoints = [step.id for step in steps]
        self.steps = {step.id: step for step in steps}
        self.path = path
        self.logger = logger
        self._read()

    def _read(self):
        """Read state from the checkpoint file."""
        if not self.path.exists():
            self.logger.debug("Checkpoint file '%s' not initialized", self.path)
            self.current = None
            return

        try:
            content = self.path.read_text(encoding="utf-8")
        except IOError as exc:
            raise errors.Error(
                f"Failed to read checkpoint file at {self.path}"
            ) from exc

        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise errors.Error(
                f"Failed to parse checkpoint file at {self.path} as JSON"
            ) from exc

        try:
            self.current = data["current"]
        except KeyError as exc:
            raise errors.Error(f"Invalid checkpoint file at {self.path}") from exc

        self.logger.debug(
            "Checkpoint file '%s' loaded: remaining steps to run are '%s'",
            self.path,
            "', '".join(self.checkpoints[self.current + 1 :]),
        )

    def _write(self):
        """Write current state to the checkpoint file."""
        try:
            if not self.path.parent.exists():
                self.path.parent.mkdir(parents=True)
            self.path.write_text(
                json.dumps({"current": self.current}), encoding="utf-8"
            )
        except IOError as exc:
            raise errors.Error(
                f"Failed to write to checkpoint file at {self.path}"
            ) from exc

    def maybe_skip(self):
        if self.current is None:
            return
        if self.current >= self._running:
            self.logger.debug("Skipping step '%s'", self.checkpoints[self._running])
            raise Skip()

    def run_step(self, checkpoint, prompt_for_retry=False):
        assert checkpoint in self.checkpoints, f"Unknown checkpoint '{checkpoint}'"
        self._running = self.checkpoints.index(checkpoint)
        if self.current is None:
            assert self._running == 0, f"Checkpoint '{checkpoint}' is not the first one"
        elif self.current < self._running:
            assert self._running - self.current == 1, (
                f"Checkpoint '{checkpoint}' cannot be run "
                f"after '{self.checkpoints[current]}'"
            )
        else:
            self.logger.debug("Skipping step '%s'", self.checkpoints[self._running])
            return

        try:
            self.steps[checkpoint].run(prompt_for_retry=prompt_for_retry)
        except Exception as exc:
            self.logger.error(
                "An error occured while running step '%s': %s", checkpoint, exc
            )
            raise

        self.logger.info("Step '%s' succeeded, saving checkpoint", checkpoint)
        self.current = self._running
        self._write()

    def run_all(self, prompt_for_retry=False, destroy_on_success=False):
        for checkpoint in self.checkpoints:
            self.run_step(checkpoint, prompt_for_retry=prompt_for_retry)
        if destroy_on_success:
            self.destroy()

    def destroy(self):
        self.logger.debug("Removing checkpoint file '%s'", self.path)
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass
