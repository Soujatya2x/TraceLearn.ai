# FILE: tests/test_sandbox.py

import pytest
from pydantic import ValidationError
from app.models.execution import ExecutionRequest, ExecutionResult
from app.adapters.python_adapter import PythonExecutor
from app.adapters.java_adapter import JavaExecutor
from app.adapters.node_adapter import NodeExecutor
from app.adapters.go_adapter import GoExecutor
from app.adapters.rust_adapter import RustExecutor
from app.executor.manager import ExecutionManager


class TestExecutionRequest:
    """Validates that Pydantic model rejects bad inputs correctly."""

    def test_valid_python_request(self):
        req = ExecutionRequest(
            sessionId="session-123",
            workspacePath="/workspace/session-123",
            language="python",
            timeout=10
        )
        assert req.language == "python"
        assert req.timeout == 10

    def test_language_normalized_to_lowercase(self):
        req = ExecutionRequest(
            sessionId="session-123",
            workspacePath="/workspace/session-123",
            language="PYTHON",
            timeout=10
        )
        assert req.language == "python"

    def test_invalid_language_rejected(self):
        with pytest.raises(ValidationError):
            ExecutionRequest(
                sessionId="session-123",
                workspacePath="/workspace/session-123",
                language="cobol",
                timeout=10
            )

    def test_path_separator_in_session_id_rejected(self):
        with pytest.raises(ValidationError):
            ExecutionRequest(
                sessionId="../../etc/passwd",
                workspacePath="/workspace/session-123",
                language="python",
                timeout=10
            )

    def test_timeout_exceeds_max_rejected(self):
        with pytest.raises(ValidationError):
            ExecutionRequest(
                sessionId="session-123",
                workspacePath="/workspace/session-123",
                language="python",
                timeout=9999
            )

    def test_default_timeout_applied(self):
        req = ExecutionRequest(
            sessionId="session-123",
            workspacePath="/workspace/session-123",
            language="python"
        )
        assert req.timeout > 0


class TestLanguageAdapters:
    """Validates each adapter returns correct Docker image and command."""

    def test_python_adapter(self):
        adapter = PythonExecutor("/workspace/test", 10)
        assert adapter.get_image() == "python:3.11-slim"
        assert "main.py" in adapter.get_command()

    def test_java_adapter(self):
        adapter = JavaExecutor("/workspace/test", 10)
        assert "eclipse-temurin" in adapter.get_image()
        assert "javac" in adapter.get_command()
        assert "java Main" in adapter.get_command()

    def test_java_minimum_30s_timeout(self):
        adapter = JavaExecutor("/workspace/test", 5)
        assert adapter.get_timeout() >= 30

    def test_node_adapter(self):
        adapter = NodeExecutor("/workspace/test", 10)
        assert "node" in adapter.get_image()
        assert "index.js" in adapter.get_command()

    def test_go_adapter(self):
        adapter = GoExecutor("/workspace/test", 10)
        assert "golang" in adapter.get_image()
        assert "main.go" in adapter.get_command()

    def test_go_minimum_20s_timeout(self):
        adapter = GoExecutor("/workspace/test", 5)
        assert adapter.get_timeout() >= 20

    def test_rust_adapter(self):
        adapter = RustExecutor("/workspace/test", 10)
        assert "rust" in adapter.get_image()
        assert "main.rs" in adapter.get_command()

    def test_rust_minimum_60s_timeout(self):
        adapter = RustExecutor("/workspace/test", 5)
        assert adapter.get_timeout() >= 60


class TestExecutionManager:
    """Validates adapter registry and lookup logic."""

    def test_get_adapter_python(self):
        adapter = ExecutionManager.get_adapter("python", "/workspace", 10)
        assert isinstance(adapter, PythonExecutor)

    def test_get_adapter_java(self):
        adapter = ExecutionManager.get_adapter("java", "/workspace", 10)
        assert isinstance(adapter, JavaExecutor)

    def test_get_adapter_node(self):
        adapter = ExecutionManager.get_adapter("node", "/workspace", 10)
        assert isinstance(adapter, NodeExecutor)

    def test_get_adapter_go(self):
        adapter = ExecutionManager.get_adapter("go", "/workspace", 10)
        assert isinstance(adapter, GoExecutor)

    def test_get_adapter_rust(self):
        adapter = ExecutionManager.get_adapter("rust", "/workspace", 10)
        assert isinstance(adapter, RustExecutor)

    def test_unknown_language_raises_value_error(self):
        with pytest.raises(ValueError, match="No execution adapter"):
            ExecutionManager.get_adapter("cobol", "/workspace", 10)

    def test_case_insensitive_lookup(self):
        adapter = ExecutionManager.get_adapter("PYTHON", "/workspace", 10)
        assert isinstance(adapter, PythonExecutor)