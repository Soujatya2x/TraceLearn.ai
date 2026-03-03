# FILE: app/adapters/node_adapter.py

from app.adapters.base import BaseExecutor


class NodeExecutor(BaseExecutor):
    """
    Node.js 20 LTS on Alpine — interpreted, no compilation step.
    Backend saves user code as: index.js
    """

    def get_image(self) -> str:
        return "node:20-alpine"

    def get_command(self) -> str:
        return "node index.js"