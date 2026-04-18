# Architecture Documentation

## Overview

This project implements a Zapier-like automation platform using an advanced microservices architecture with asynchronous, event-driven communication. The system allows users to create automated workflows (Zaps) that connect events (Webhooks, Schedules) to actions across disparate integrations while maintaining strict reliability.

## System Architecture

```text
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