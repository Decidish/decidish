FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install poetry

# We disable virtualenvs because the Docker container IS the environment.
# This makes it easier to run commands without activating a venv.
ENV POETRY_VIRTUALENVS_CREATE=false

COPY ../mlpipeline/pyproject.toml ./ poetry.lock ./

RUN poetry install

WORKDIR /app

COPY ../mlpipeline .

EXPOSE 8000

# 7. Run with Uvicorn (Hot Reload)
CMD ["poetry", "run" , "python", "-m", "mlpipeline.app"]