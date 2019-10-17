class CommandInitError(Exception):
    """Base exception to raise during a command initialization."""


class CommandError(Exception):
    """Base exception to raise during a command execution."""
    def format_error(self):
        return self.message


class CommandSubprocessError(CommandError):
    """Exception raised in case of a subprocess.CalledProcessError."""
    def __init__(self, args, returncode, stdout, stderr):
        self.args = args
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

        super(CommandSubprocessError, self).__init__(self._build_message())

    def _build_message(self):
        return "Failed to run '{}' [retcode {}]".format(
            ' '.join(self.args), self.returncode,
        )

    def format_error(self):
        return (
            "{self.message}\n"
            "--- Captured standard output ---\n{self.stdout}\n"
            "--- Captured standard error ---\n{self.stderr}"
        ).format(self=self)
