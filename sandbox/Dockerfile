# FILE: Dockerfile

# Multi-stage build:
#   Stage 1 (builder): Installs all Python dependencies
#   Stage 2 (production): Copies only the venv + app code — no build tools in final image
# Result: Smaller, more secure production image

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM python:3.11-slim AS production

# Create non-root user — running as root is a security risk
RUN groupadd -r sandbox && useradd -r -g sandbox sandbox

WORKDIR /app

# Copy virtual environment from builder (no pip/gcc in production)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy app code
COPY --chown=sandbox:sandbox . .

# Add sandbox user to docker group to access /var/run/docker.sock
# GID 999 is the default docker group GID on most Linux systems
RUN groupadd -f docker && usermod -aG docker sandbox

USER sandbox

EXPOSE 8000

# Docker health check — marks container unhealthy if sandbox/health returns non-200
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/sandbox/health').raise_for_status()"

# Production start — 2 workers for parallel request handling
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]