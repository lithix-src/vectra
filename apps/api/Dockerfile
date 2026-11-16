# =============================================================================
# VECTRA API & Worker Container Image (uv + Latest Standard CPython)
# Compatible with Rancher Desktop (nerdctl / dockerd moby)
# =============================================================================
FROM ghcr.io/astral-sh/uv:debian-slim

WORKDIR /app

# Install latest standard CPython managed by uv
RUN uv python install && uv python upgrade

# Copy workspace Python packages
COPY packages/db /app/packages/db
COPY apps/api /app/apps/api
COPY apps/workers /app/apps/workers
COPY scripts /app/scripts

# Provision .venv on latest managed CPython and install all workspace packages
RUN uv venv --python-preference only-managed /app/.venv && \
    uv pip install --python /app/.venv/bin/python \
      greenlet asyncpg \
      -e /app/packages/db \
      -e /app/apps/api \
      -e /app/apps/workers

ENV PATH="/app/.venv/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

WORKDIR /app/apps/api
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
