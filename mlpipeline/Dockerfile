FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install poetry

# We disable virtualenvs because the Docker container IS the environment.
# This makes it easier to run commands without activating a venv.
ENV POETRY_VIRTUALENVS_CREATE=false

COPY pyproject.toml poetry.lock* ./

# --no-root: triggers an error if your project doesn't have a package structure yet, safer to skip for now
RUN poetry install --no-root --no-interaction --no-ansi

COPY . .

WORKDIR /app/mlpipeline

EXPOSE 8000

# 7. Run with Uvicorn (Hot Reload)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]