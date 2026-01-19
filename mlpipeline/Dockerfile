FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv (The fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
# --frozen: Installs exactly what is in uv.lock
# --no-install-project: Installs dependencies only (caches this layer)
RUN uv sync --frozen --no-install-project

# Copy the rest of the application
COPY . .

# Sync the project itself (installs the current package if defined)
RUN uv sync --frozen

EXPOSE 8000

ENV PYTHONPATH=src

# Run with uv run (automatically uses the virtual environment)
CMD ["uv", "run", "python", "-m", "mlpipeline.app"]
