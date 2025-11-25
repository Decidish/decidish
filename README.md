# Decidish

This repository contains the local development environment for a microservices-based application, fully containerized using **Docker Compose**.

The architecture integrates multiple languages (Java, Go, Python, JavaScript) with a robust data layer (PostgreSQL with Vector support, Redis) and an event streaming backbone (Kafka cluster).

## Prerequisites

* **Docker** (Desktop or Engine)
* **Docker Compose** (v2 recommended)

## Quick Start

1.  **Clone the repository** (if you haven't already).
2.  **Navigate** to the project root.
3.  **Start the environment**:
    ```bash
    docker compose up -d
    ```
4.  **Check status**:
    ```bash
    docker compose ps
    ```
5.  **Stop the environment**:
    ```bash
    docker compose down
    ```

---

## Architecture & Services

The system is divided into three logical tiers: Data, Application, and Messaging.

### 1. Application Layer

| Service | Container Name | Technology | Internal Port | Host Port | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Client** | `dev_client` | React Native Web | `8081` | `8081` | Frontend UI. Connects to Core, Personalization, and ML services. |
| **Core Server** | `dev_java` | Java (Spring Boot) | `8080` | `8080` | Main backend logic. Connects to Postgres & Redis. |
| **Personalization**| `dev_go` | Go (Golang) | `8082` | `8082` | User personalization logic. Connects to Postgres & Redis. |
| **ML Pipeline** | `dev_python` | Python | `8000` | `8000` | Machine Learning processing pipeline. Connects to Postgres. |

### 2. Data Persistence & Caching

| Service | Container Name | Technology | Port | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Postgres** | `dev_postgres` | PostgreSQL 16 + `pgvector` | `5432` | Primary DB. Includes vector search support. Credentials: `user`/`password`. |
| **Redis** | `dev_redis` | Redis Alpine | `6379` | In-memory cache and key/value store. |

### 3. Event Streaming (Kafka Cluster)

The environment runs a **2-node Kafka cluster** managed by a **2-node Zookeeper cluster** to simulate a distributed production setup.

| Service | Role | Container Name | Internal Port | Host Port |
| :--- | :--- | :--- | :--- | :--- |
| **Zoo1** | Coordinator | `zoo1` | `2181` | `2181` |
| **Zoo2** | Coordinator | `zoo2` | `2181` | `2182` |
| **Kafka1**| Broker | `kafka1` | `9092` | `9092` |
| **Kafka2**| Broker | `kafka2` | `9092` | `9093` |

> **Note:** `kafka1` is configured to automatically create the topic `message` with 4 partitions and a replication factor of 2 upon startup.

---

## Accessing Services

### From the Host Machine
You can access services directly via `localhost` using the mapped ports:

* **Frontend:** [http://localhost:8081](http://localhost:8081)
* **Java API:** [http://localhost:8080](http://localhost:8080)
* **Go API:** [http://localhost:8082](http://localhost:8082)
* **Python API:** [http://localhost:8000](http://localhost:8000)
* **PostgreSQL:** `localhost:5432`
* **Redis:** `localhost:6379`

### Service-to-Service Communication
All services communicate internally via the `app-network`. Services reference each other by their service name defined in `docker-compose.yml`:

* Database URL: `postgres:5432`
* Redis Host: `redis`
* Core API: `http://core-server:8080`

---

## Volume Mapping (Development)

To enable **hot-reloading** and easy development, source code directories are mounted directly into the containers:

* `./backend/core` ➡️ `/app` (Java)
* `./backend/personalization` ➡️ `/app` (Go)
* `./mlpipeline` ➡️ `/app` (Python)
* `./client` ➡️ `/app` (React Native)

*Data Persistence:*
* Database data is persisted in the managed volume `postgres_data`.
* Kafka logs and data are mapped to local folders `./kafka/...`.

## Troubleshooting

**Container fails to start?**
Check the logs for the specific service:
```bash
docker compose logs -f <service_name>
# Example: docker compose logs -f core-server