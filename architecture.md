# Architecture Documentation

## Overview

This project implements a Zapier-like automation platform using an advanced microservices architecture with asynchronous, event-driven communication. The system allows users to create automated workflows (Zaps) that connect events (Webhooks, Schedules) to actions across disparate integrations while maintaining strict reliability.

## System Architecture

``text
┌─────────────┐
│   Frontend  │ (Next.js)
│  (Port 3001)│
└──────┬─▲────┘
       │ │
       │ │ WebSockets (Port 9000)
       │ └──────────────────────────┐
       │ HTTP/REST                  │
       │                            │
┌──────▼──────────────┐      ┌──────┴──────────────┐
│ Primary Backend     │      │ Notification Service│
│ (Port 3000)         │      │ (Port 9000)         │
│ - User Mgt/Zaps     │      │ - WebSockets        │
│ - Schedule APIs     │      │ - Pub/Sub Consumer  │
└──────┬──────────────┘      └──────▲──────────────┘
       │                            │ Redis Pub/Sub
       │ PostgreSQL                 │ (zap-notification)
       │                            │
┌──────▼────────────────────────┐   │
│   PostgreSQL DB               │   │
│  - Users, Actions, Triggers   │   │
│  - Zaps, ZapRuns, Outbox      │   │
│  - ScheduledTrigger           │◄──┼─┐
└──────┬────────────────────────┘   │ │
       │                            │ │
┌──────▼──────┐                     │ │
│   Hooks     │ (Express.js)        │ │
│ - Webhooks  │                     │ │
└──────┬──────┘                     │ │
       │ Writes to DB               │ │
       │                            │ │
┌──────▼──────────────┐             │ │
│  Processor  │       │             │ │
│ - Polls Outbox      │             │ │
│ - Pubs to Kafka     │             │ │
└──────┬──────────────┘             │ │
       │ Kafka Messages             │ │
┌──────▼──────────────────────────┐ │ │
│   Kafka Broker                  │ │ │
│   - zap-events                  │ │ │
│   - zap-events-dlq (DLQ)        │ │ │
└──────┬──────────────────────────┘ │ │
       │ Consumes Messages          │ │
┌──────▼──────────────┐             │ │
│    Worker           │             │ │
│ - Executes Actions  ├─────────────┘ │
│ - Retries / DLQ     │ Publishes Success
└─────────────────────┘               │
                                      │
┌─────────────────────────────────┐   │
│       Scheduler Service         │   │
│ - Redis Distributed Locking     │   │
│ - Polls ScheduledTrigger DB     ├───┘ Writes to Outbox
│ - Evaluates Cron Expressions    │
└─────────────────────────────────┘
```

## Components

### 1. Frontend (Next.js)

**Location:** `apps/frontend/`
* Acts as the face of the platform. Gives users a visual flow editor to map workflows, triggers, actions, and custom cron-based schedules.
* Maintains real-time situational awareness by persisting a constant WebSocket connection for notifications.

### 2. Primary Backend (Express.js)

**Location:** `apps/primarybackend/`
* Headless API driving the frontend.
* Exposes standard routes `/api/v1/zap` and native schedule controllers.
* Handles CRUD generation for DB models and safeguards routes with generic JWT `authMiddleware`.

### 3. Hooks Service

**Location:** `apps/hooks/`
* Ingestion engine for webhooks heavily defended by Redis-backed sliding window rate limiters.
* Directly persists data payload via `ZapRunOutbox` and `ZapRun` transactional queries guaranteeing data preservation.

### 4. Processor Service

**Location:** `apps/processor/`
* Implements the **Transactional Outbox Pattern** against PostgreSQL.
* Loops dynamically, moving tasks from the strict persistence layer onto the unbounded Kafka queues.

### 5. Worker Service

**Location:** `apps/worker/`
* The heavy lifter pulling operations off Kafka.
* Triggers discrete external modules seamlessly.
* Governs the `MAX_RETRIES` loops, pushing doomed tasks into `zap-events-dlq` and shooting explicit "Success" flags into the Notification Service via Redis.

### 6. Notification Service

**Location:** `apps/services/notification-service/`
* Pure WebSocket (WS) gateway bound exclusively mapping specific `userId`s to active TCP socket handlers.
* Decouples the Next.js runtime from PostgreSQL polling by simply waiting for transient Redis Pub/Sub pulses alerting the user interfaces directly.

### 7. Scheduler Service (NEW)

**Location:** `apps/scheduler/`
* Native autonomous daemon processing time-bound functions decoupled from the active REST requests using pure JavaScript event loops.
* **Responsibilities:**
  - Evaluates mathematical `cronExpression` fields locally using `cron-parser`.
  - Determines if `nextRunAt` timestamps have elapsed against the real-time Unix clock. 
  - Submits delayed operations securely using the identical Outbox strategy the Hook Engine uses so scheduling scales properly on top of standard Kafka event flows.

### 8. Database (PostgreSQL & Redis)

**Schema Additions:**
* Added `ScheduledTrigger` tied via `zapId` managing execution boolean (`isActive`) against temporal boundaries (`nextRunAt`, `lastRunAt`). Indexed thoroughly for performance scaling.

---

## Technical Deep Dives

### Autonomous Distributed Scheduler Pattern

To handle massive-scale temporal execution securely, our node instances implement a strict state-loop bound heavily to a caching layer.

**Workflow:**
1. **Poll Generation:** The Scheduler loop is triggered constantly over a specific bounded interval.
2. **Distributed Redis Locks:** Before moving a muscle, it uses `ioredis` to attempt an atomic lock condition using Redis `NX` (Not Exists) argument with an Expiration TTL.
   - If `NX` fails to bind, the environment assumes another scaled pod is dealing with the payload and deliberately suspends itself.
3. **Execution Identification:** Upon catching the Redis lock, it asks Prisma to reveal any models in `ScheduledTrigger` where `nextRunAt <= now()`.
4. **Outbox Handoff:** For every trigger needing launch, it forces a safe atomic `prisma.$transaction`. Within this:
   - Sets a fresh `ZapRun` instance tagged natively with scheduler specifics.
   - Adds a payload into `ZapRunOutbox`.
   - Modifies `ScheduledTrigger.nextRunAt` utilizing `cron-parser` to figure out the delta required until the exact next execution constraint.
5. Due to the outbox insert, the `Processor` and `Worker` organically notice the new run regardless of it being generated mathematically rather than externally driven by a Webhook!

### Dead Letter Queue (DLQ) and Retry Mechanism

The system implements a robust fault tolerance mechanism using Kafka to handle intermittent errors, bad data, and permanent failures during worker processing.

**Workflow:**
1. **Validation Check:** The worker pulls a message from `zap-events`. Missing keys immediately jump to `zap-events-dlq`.
2. **Execution and Errors:** Action runs inside extensive error boundary catches.
3. **Retry Loop:** 
   - `retryCount` iterates linearly against `MAX_RETRIES` (3). Assuming it fails initially, it publishes cloned messages natively wrapped back onto the primary pipe, committing the old Kafka offset intelligently.
4. **DLQ Context Dump:** If retries completely shatter, the runtime dumps heavy context tracking metadata (Errors, Run IDs, Iterations) straight onto the isolated `zap-events-dlq` topic allowing heavy monitoring/intervention without impacting downstream tasks.

### Real-Time Notification System

**Workflow:**
1. Next.js natively dials the NodeWS cluster port on loading the user dashboard.
2. Back in the void, the `Worker` processes an outbox, eventually ending up with a `success` state. It shoots a lightweight Pub/Sub hit to Redis `zap-notification` queue.
3. The WebSocket server (subscribed solely to that channel) detects the specific `userId` payload matches an open connection map in its internal runtime heap. 
4. The React front-end instantaneously updates using raw socket transmission, bypassing complex API round trips, giving users a highly premium live feedback loop.

---

## DevOps & Infrastructure Architecture

This project adopts modern, cloud-native DevOps principles to automate provisioning, testing, deployment, and monitoring.

### 1. Infrastructure as Code (IaC) & Stateful Apps
* **Tool**: Terraform
* **Implementation**: Declarative management of baseline cluster namespaces (`zapier`, `argocd`, `argo-rollouts`), helm releases, and persistent databases.
* **Stateful Set Specifications**:
  * **PostgreSQL StatefulSet**: Configured with a `volumeClaimTemplates` requesting **5Gi** storage mounted at `/var/lib/postgresql/data` with a `ReadWriteOnce` access mode.
  * **Redis StatefulSet**: Configured with a `volumeClaimTemplates` requesting **1Gi** storage mounted at `/data` with a `ReadWriteOnce` access mode.
  * Stable network identifiers (`postgres-0`, `redis-0`) ensure deterministic internal DNS resolution.
* **Modularity**: Implements a custom local Terraform module (`./modules/microservice`) to stamp out uniform configurations for all 7 microservices, managing environment variables, secrets, service endpoints, and Prometheus annotations dynamically.

### 2. GitOps Continuous Delivery (CD)
* **Tool**: ArgoCD
* **Implementation**: The application is managed under GitOps patterns. ArgoCD watches the `/k8` directory on Git and recursively synchronizes nested directory manifests with the active Kubernetes cluster (`minikube`/`docker-desktop`).
* **Controls**: Implements automated drift detection and self-healing to overwrite any manual, out-of-band modifications made to the cluster.

### 3. Progressive Delivery (Canary Deployments)
* **Tool**: Argo Rollouts & NGINX Ingress
* **Implementation**: The `frontend` service is deployed via the custom `Rollout` CRD. It splits incoming ingress traffic dynamically between two services (`frontend-active` stable and `frontend-canary` preview/canary endpoints).
* **Rollout Steps**:
  1. Set weight to **10%** traffic and pause for **2 minutes**.
  2. Increase weight to **30%** traffic and pause for **5 minutes**.
  3. Increase weight to **50%** traffic and **pause indefinitely** for manual promotion (`kubectl argo rollouts promote`).

### 4. Event-Driven Messaging Infrastructure
* **Tool**: Strimzi Kafka Operator
* **Implementation**: Deploys a KRaft-enabled Kafka cluster (`zapier-kafka`) inside the Kubernetes cluster using Strimzi Custom Resource Definitions:
  * **`KafkaNodePool`**: Manages a pool of broker/controller nodes with ephemeral storage.
  * **`Kafka`**: Configures broker settings, security parameters, and listener ports (plain port `9092` for internal service-to-service communication).
  * **`KafkaTopic`**: Declaratively creates `zap-events` (3 partitions, retention `604800000ms`) and `zap-events-dlq` (3 partitions, retention `604800000ms`).

### 5. Continuous Integration (CI)
* **Tool**: GitHub Actions
* **Implementation**: Independent workflows in `.github/workflows/` trigger on pushes to build Docker images for each microservice and publish them to Docker Hub. Paths-based triggers are utilized to ensure only modified services trigger their respective pipelines.

### 6. Observability & Monitoring
* **Tool**: Prometheus Stack & Grafana
* **Implementation**: Provisioned via `helm_release.prometheus_stack` in Terraform. Microservice endpoints expose metrics ports, annotated with `prometheus.io/scrape` and `prometheus.io/port` so the Prometheus controller automatically scrapes telemetry.
* **Traffic Ingress**: Leverages path-based routing in the NGINX Ingress controller (`/api` routed to backend, `/hooks` routed to hook ingestion, `/` routed to frontend).