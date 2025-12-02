# Decidish 🧭

This repository contains the local development environment for a **microservices-based application**, fully containerized using **Docker Compose**.

The architecture integrates multiple languages (**Java, Go, Python, JavaScript**) with a robust data layer (**PostgreSQL** with Vector support, **Redis**) and an event streaming backbone (**Kafka cluster**).

---

## Prerequisites

* **Docker** (Desktop or Engine)
* **Docker Compose** (v2 recommended)

---

## Quick Start

1.  **Clone the repository** (if you haven't already).
2.  **Navigate** to the project root.
3.  **Create a `.env` file** and fill the following configuration inside `.env.example`
4.  **Start the environment**:

    ```bash
    docker compose up --build -d
    ```
5.  **Check status**:

    ```bash
    docker compose ps
    ```
6.  **Stop the environment**:

    ```bash
    docker compose down
    ```

---

## Architecture & Services

The system is divided into three logical tiers: Data, Application, and Messaging.

### 1. Application Layer

| Service | Container Name | Technology | Internal Port | Host Port | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Client** | `dev_client` | React Native Web | `8081` | `8081` | Frontend UI. Connects to Core, Pers, and ML services. |
| **Auth Server** | `dev_authorization` | Node/JS (implied) | `8083` | `8083` | Handles authentication and JWTs. |
| **Core Server** | `dev_core` | Java (Spring Boot) | `8080` | `8080` | Main backend logic. Connects to Backend DB & Redis. |
| **Personalization**| `dev_personalization` | Go (Golang) | `8082` | `8082` | User personalization logic. Connects to Backend DB, Redis & Kafka. |
| **ML Pipeline** | `dev_mlpipeline` | Python | `8000` | `8000` | Machine Learning pipeline. Connects to Backend DB. |

### 2. Data Persistence, Caching & Messaging

| Service | Container Name | Technology | Port | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Backend DB** | `dev_backend_postgres` | Postgres 16 + `pgvector` | `5433` | Stores core app data and vectors. |
| **Auth DB** | `dev_auth_postgres` | Postgres 16 Alpine | `5432` | Dedicated storage for user auth data. |
| **Redis** | `dev_redis` | Redis Alpine | `6379` | In-memory cache. |
| **Kafka** | `kafka` | Bitnami Kafka (KRaft) | `9092` | Event streaming broker. |
| **Kafka UI** | `kafka-ui` | Kafka UI | `8090` | Web interface for Kafka management. |

---

## Accessing Services

### From the Host Machine
You can access services directly via `localhost` using the mapped ports:

* **Frontend:** `http://localhost:8081`
* **Core API:** `http://localhost:8080`
* **Authorization API:** `http://localhost:8083`
* **Personalization API:** `http://localhost:8082`
* **MLPipeline API:** `http://localhost:8000`
* **Kafka UI:** `http://localhost:8090`
* **Auth Database:** `localhost:5432`
* **Backend Database:** `localhost:5433`
* **Redis:** `localhost:6379`
* **Kafka Broker:** `localhost:9092`

### Service-to-Service Communication
All services communicate internally via the `app-network`. Services reference each other by their **service name** defined in `docker-compose.yml` (e.g., `db_backend`, `redis`, `kafka`).

---

## 📁 Volume Mapping (Development)

To enable **hot-reloading** and easy development, source code directories are mounted directly into the containers:

* `./client` ➡️ `/app`
* `./backend/authorization` ➡️ `/app`
* `./backend/core` ➡️ `/app`
* `./backend/personalization` ➡️ `/app`
* `./mlpipeline` ➡️ `/app`

Data Persistence:
* Backend DB: Persisted in named volume `db_backend_data`.
* Auth DB: Persisted in named volume `db_authorisation_data`.
* Kafka: Persisted in named volume `kafka_data`.

---

## Troubleshooting

**Container fails to start?**
Check the logs for the specific service:

```bash
docker compose logs -f <service_name>
# Example: docker compose logs -f core-server