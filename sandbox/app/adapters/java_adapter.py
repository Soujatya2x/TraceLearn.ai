# FILE: app/adapters/java_adapter.py

from app.adapters.base import BaseExecutor


class JavaExecutor(BaseExecutor):
    """
    Eclipse Temurin JDK 17 on Alpine — production-grade OpenJDK used by AWS.
    Two-step execution: compile with javac, then run with java.
    Backend saves user code as: Main.java (class name MUST be Main)
    Minimum timeout: 30s (JVM startup + compilation takes time)

    Command breakdown:
      sh -c '...'       = run in shell so && works
      javac Main.java   = compile Java source → produces Main.class
      java Main         = execute compiled bytecode
    """

    def get_image(self) -> str:
        return "eclipse-temurin:17-jdk-alpine"

    def get_command(self) -> str:
        return "sh -c 'javac Main.java && java Main'"

    def get_timeout(self) -> int:
        return max(self.timeout, 30)