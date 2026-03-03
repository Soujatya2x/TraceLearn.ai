# FILE: app/adapters/go_adapter.py

from app.adapters.base import BaseExecutor


class GoExecutor(BaseExecutor):
    """
    Go 1.22 on Alpine.
    'go run' compiles AND executes in one step.
    Backend saves user code as: main.go
    Minimum timeout: 20s (includes compile time)
    """

    def get_image(self) -> str:
        return "golang:1.22-alpine"

    def get_command(self) -> str:
        return "go run main.go"

    def get_timeout(self) -> int:
        return max(self.timeout, 20)