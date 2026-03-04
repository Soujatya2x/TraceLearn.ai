# FILE: app/adapters/rust_adapter.py

from app.adapters.base import BaseExecutor


class RustExecutor(BaseExecutor):
    """
    Rust 1.75 slim — compile with rustc, then run binary.
    Backend saves user code as: main.rs
    Minimum timeout: 60s — Rust compilation is intentionally slow (deep optimization).

    Command breakdown:
      rustc main.rs -o /build/main = compile Rust source → binary written to /build/main
                                     /app is read-only (workspace mount) — cannot write 'main' there.
                                     /build is the executable tmpfs mount (MEDIUM-8 fix).
      /build/main                  = execute the compiled binary from /build
    """

    def get_image(self) -> str:
        return "rust:1.75-slim"

    def get_command(self) -> str:
        return "sh -c 'rustc main.rs -o /build/main && /build/main'"

    def get_timeout(self) -> int:
        return max(self.timeout, 60)