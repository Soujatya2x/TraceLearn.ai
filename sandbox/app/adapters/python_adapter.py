# FILE: app/adapters/python_adapter.py

from app.adapters.base import BaseExecutor


class PythonExecutor(BaseExecutor):
    """
    Python 3.11 slim — interpreted, no compilation step.
    Backend saves user code as: main.py
    Image: python:3.11-slim (minimal Debian, just Python runtime)
    """

    def get_image(self) -> str:
        return "python:3.11-slim"

    def get_command(self) -> str:
        return "python main.py"