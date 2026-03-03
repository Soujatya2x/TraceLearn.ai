# FILE: app/adapters/base.py

from abc import ABC, abstractmethod


class BaseExecutor(ABC):
    """
    Abstract base class — defines the contract all language adapters must follow.

    Adapter Pattern:
      ExecutionManager doesn't care which language it's running.
      It just calls adapter.get_image() and adapter.get_command().
      Adding a new language = create one new class, implement 2 methods.

    ABC + @abstractmethod:
      If a child class forgets to implement get_image() or get_command(),
      Python raises an error at startup — catching the bug before any user sees it.
    """

    def __init__(self, workspace_path: str, timeout: int):
        self.workspace_path = workspace_path
        self.timeout = timeout

    @abstractmethod
    def get_image(self) -> str:
        """
        Docker image to pull and run.
        Example: "python:3.11-slim"
        """
        pass

    @abstractmethod
    def get_command(self) -> str:
        """
        Shell command to execute inside the container.
        Example: "python main.py"
        """
        pass

    def get_timeout(self) -> int:
        """
        Effective timeout in seconds.
        Override in child classes for compiled languages that need longer.
        Example: Rust compilation needs at least 60 seconds.
        """
        return self.timeout