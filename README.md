# Event Spawning System

## Overview
A scalable, maintainable event processing system for ingesting, processing, and reporting on events from external publishers (Facebook, Tiktok, etc). The system is designed for horizontal scaling, robust monitoring, and seamless integration with NATS JetStream, PostgreSQL, and external dashboards.

# Known Issues

1. Reporter startup error: NATS JetStream — "max age needs to be >= 100ms". This occurs during JetStream stream initialization if the max_age parameter is set below 100 milliseconds or the required stream is missing.

## Architecture
- **Publisher**: Sends webhook events to the gateway (Docker image: `andriiuni/events`).
- **Gateway**: Receives webhook events via HTTP, validates, and publishes them to NATS JetStream topics.
- **Collectors**: Consume events from NATS, process, and store them in PostgreSQL. Separate collectors for Facebook and Tiktok.
- **Reporter**: Provides API endpoints for generating reports and statistics.
- **Monitoring**: Prometheus and Grafana for metrics, dashboards, and alerting.

All services are orchestrated via `docker-compose` and support multi-environment configuration.

## Features
- Webhook ingestion and event routing
- NATS JetStream integration with custom NestJS wrappers
- Event processing and storage in PostgreSQL via Prisma
- Structured logging with correlation IDs for traceability
- Liveness and readiness endpoints for all services
- Graceful shutdown with in-flight event processing
- Automatic Prisma migrations on startup
- Comprehensive unit and integration tests
- Horizontal scalability for gateway and collectors
- Prometheus metrics and Grafana dashboards

## API Endpoints
### Reporter Service
- `GET /reports/events` — Aggregated event statistics (filters: time range, source, funnelStage, eventType)
- `GET /reports/revenue` — Aggregated revenue data (filters: time range, source, campaignId)
- `GET /reports/demographics` — User demographic data (filters: time range, source)

### Technical & Monitoring Endpoints
All services expose the following endpoints for health checks and monitoring:

- `GET /health/liveness` or `GET /health/live` — Liveness check (service is running)
- `GET /health/readiness` or `GET /health/ready` — Readiness check (service is ready to receive traffic)
- `GET /metrics` — Prometheus metrics endpoint (for scraping by Prometheus)

#### Grafana Dashboard
- Accessible at: `http://localhost:3005/` (default credentials: admin/admin)

#### Prometheus Dashboard
- Accessible at: `http://localhost:9090/`

### Monitoring
- Prometheus scrapes metrics from all services
- Grafana dashboards:
  - Gateway: accepted, processed, failed events (stat)
  - Collectors: aggregated rate per minute (time series)
  - Reporter: report latency by category (time series)

## Stack
- TypeScript
- NestJS
- nats-io/nats.js
- PostgreSQL
- Prisma
- Zod
- Prometheus + Grafana
- Docker Compose

## Event Types
Supports Facebook and Tiktok event schemas, including top and bottom funnel events, user demographics, and engagement data. See `task.md` for full type definitions.

## Environment Variables
The following environment variables are required for correct operation. Example values are shown below:

```env
# .env.event
EVENT_ENDPOINT         # HTTP endpoint for publisher to send webhooks (required by publisher)
PORT                  # Port for the gateway service
LOG_LEVEL             # Log verbosity level (e.g., info, debug)

# .env.nats
NATS_URL              # NATS JetStream connection URL

# .env.database
POSTGRES_USER         # PostgreSQL username
POSTGRES_PASSWORD     # PostgreSQL password
POSTGRES_DB           # PostgreSQL database name
DATABASE_URL          # Full PostgreSQL connection string

# .env.log
LOG_LEVEL             # Log verbosity level for services

EVENTS_BATCH_CONCURRENCY # Batch processing concurrency for event collectors
```

## Deployment & Persistence
- All data is persisted in PostgreSQL; data survives container restarts
- Prisma migrations run automatically on startup
- Docker Compose waits for all services to be healthy before starting

## Running the Application
1. Clone the repository
2. Configure environment variables for your environment
3. Run with Docker Compose:
   ```sh
   docker-compose up --build
   ```
4. Access Grafana dashboards and API endpoints as needed

## Testing
- Unit and integration tests are included for all key functionalities
- Run tests with:
  ```sh
  npm run test
  ```

## Health & Readiness
- All services expose `/health` and `/ready` endpoints for monitoring

## Scaling
- Gateway and collectors can be horizontally scaled via Docker Compose or Kubernetes

## License
MIT 
