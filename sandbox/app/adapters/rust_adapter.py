# FILE: app/adapters/rust_adapter.py

from app.adapters.base import BaseExecutor


class RustExecutor(BaseExecutor):
    """
    Rust 1.75 slim — compile with rustc, then run binary.
    Backend saves user code as: main.rs
    Minimum timeout: 60s — Rust compilation is intentionally slow (deep optimization).

    Command breakdown:
      rustc main.rs -o main   = compile Rust source to binary named 'main'
      ./main                  = execute the compiled binary
    """

    def get_image(self) -> str:
        return "rust:1.75-slim"

    def get_command(self) -> str:
        return "sh -c 'rustc main.rs -o main && ./main'"

    def get_timeout(self) -> int:
        return max(self.timeout, 60)