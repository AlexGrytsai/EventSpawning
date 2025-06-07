## 1. Architectural Design

### 1.1 Services and Responsibilities

- **gateway** — receives webhook events from publisher via HTTP, validates, adds correlation ID, publishes events to the appropriate NATS JetStream topics.
- **fb-collector** — subscribes to Facebook event topics in NATS, processes, normalizes, and stores them in the database.
- **ttk-collector** — subscribes to TikTok event topics in NATS, processes, normalizes, and stores them in the database.
- **reporter** — provides an API for generating aggregated reports on events, revenue, and demographics, aggregates data from the database.
- **publisher** — external service (docker image), sends webhook events to gateway.
- **prometheus** — collects metrics from all services (via /metrics endpoints).
- **grafana** — visualizes metrics and reports, builds dashboards for gateway, collectors, and reporter.
- **database (PostgreSQL)** — stores all events and aggregated data.

### 1.2 Interaction Flows

1. publisher sends a webhook to gateway (HTTP, EVENT_ENDPOINT).
2. gateway validates, adds correlation ID, publishes the event to NATS JetStream (separate topics for Facebook and TikTok).
3. collectors (fb-collector, ttk-collector) are subscribed to their topics, process events, and store them in PostgreSQL.
4. reporter aggregates data from the database and provides an API for reports.
5. prometheus collects metrics from all services.
6. grafana visualizes metrics and reports.

### 1.3 Data Flow Diagram

```mermaid
flowchart TD
    Publisher[Publisher] -->|HTTP webhook| Gateway
    Gateway -->|NATS JetStream (fb-topic)| FBCollector[fb-collector]
    Gateway -->|NATS JetStream (ttk-topic)| TTKCollector[ttk-collector]
    FBCollector -->|DB write| Database[(PostgreSQL)]
    TTKCollector -->|DB write| Database
    Reporter -->|DB read| Database
    Prometheus -->|/metrics| Gateway
    Prometheus -->|/metrics| FBCollector
    Prometheus -->|/metrics| TTKCollector
    Prometheus -->|/metrics| Reporter
    Grafana -->|Prometheus| Prometheus
    Reporter -->|API| User[User]
```

### 1.4 Technology Rationale

- **NestJS** — modular architecture, DI support, convenient for building microservices.
- **Prisma** — modern ORM for TypeScript, migrations, type safety, high performance.
- **PostgreSQL** — reliable relational DBMS, supports complex queries and transactions.
- **NATS JetStream** — fast and reliable message broker, supports streaming, horizontal scaling.
- **Prometheus** — standard for metrics collection, integrates with NestJS.
- **Grafana** — powerful metrics and data visualization.
- **Docker Compose** — service orchestration, multi-environment support, easy to launch.

### 1.5 Scalability and Resilience

#### Horizontal Scalability

- gateway and collectors are implemented as stateless services: they do not store state between requests, all data and events are stored in external systems (NATS, PostgreSQL).
- Scaling is achieved by increasing the number of service replicas (replica count) via docker-compose (scale) or in Kubernetes (Deployment replicas).
- Each gateway instance can receive events in parallel, load balancing is provided by an external load balancer or round-robin DNS.
- collectors are scaled independently for Facebook and TikTok streams, allowing flexible resource allocation depending on the load for each source.

#### Fault Tolerance

- Persistent volumes are used for PostgreSQL and NATS: data is stored outside containers, ensuring data safety during container restarts or failures.
- NATS JetStream supports message durability and ack/retry mechanics: events are not lost if collectors fail, at-least-once-delivery is guaranteed.
- collectors and gateway use idempotency when processing events: reprocessing the same event does not lead to data duplication.
- All services implement readiness and liveness endpoints: the orchestrator (docker-compose or Kubernetes) monitors service health and restarts them in case of failures.
- On shutdown, services process all "in-flight" events (graceful shutdown): they stop accepting new events and finish processing current ones.

#### Recovery and Data Safety

- On application or docker-compose restart, all data is preserved thanks to persistent volumes for PostgreSQL and NATS.
- JetStream stores events until collectors confirm processing, allowing recovery after a failure.
- Prisma migrations are run automatically at startup for collectors and reporter, ensuring the database schema is up to date.

#### Monitoring and Alerting

- Prometheus collects metrics on service health, number of processed/failed events, and delays.
- Grafana visualizes metrics, helps track anomalies, and respond to failures.
- Alerts are set up for critical metrics (e.g., increase in failed events, delays, replica drops).

#### Delivery Guarantee and Fault Tolerance

- "At-least-once" delivery is used for events: JetStream guarantees delivery until processing is confirmed.
- Idempotency logic in collectors prevents duplication on redelivery.
- Stateless service design allows quick replacement or scaling of instances without data loss.
- The orchestrator monitors service health and automatically restarts them in case of failures.

### 1.6 Environment Configuration

- All environment variables are stored in .env files.
- Different environments use docker-compose.override.yml and separate .env files.
- Secrets (e.g., database passwords) are passed via environment variables or Docker secrets.
- Prisma migrations are run automatically at startup for collectors and reporter.
