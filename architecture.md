# Architecture Documentation

## Overview

This project implements a Zapier-like automation platform using a microservices architecture with event-driven communication. The system allows users to create automated workflows (Zaps) that connect triggers to actions, enabling automation across different services and platforms.

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
│ - User Management   │      │ - WebSockets        │
│ - Zap CRUD          │      │ - Pub/Sub Consumer  │
│ - Authentication    │      └──────▲──────────────┘
└──────┬──────────────┘             │
       │                            │ Redis Pub/Sub (zap-notification channel)
       │ PostgreSQL                 │
       │                            │
┌──────▼──────────────┐             │
│   PostgreSQL DB     │             │
│  - Users            │             │
│  - Zaps             │             │
│  - Triggers         │             │
│  - Actions          │             │
│  - ZapRuns          │             │
│  - ZapRunOutbox     │             │
└─────────────────────┘             │
                                    │
┌─────────────┐                     │
│   Hooks     │ (Express.js)        │
│ (Port 8000) │                     │
│ - Webhook   │                     │
│   Receiver  │                     │
└──────┬──────┘                     │
       │                            │
       │ Writes to DB               │
       │                            │
┌──────▼──────────────┐             │
│   PostgreSQL DB     │             │
│  (ZapRunOutbox)     │             │
└─────────────────────┘             │
                                    │
┌─────────────┐                     │
│  Processor  │ (Kafka Producer)    │
│             │                     │
│ - Polls     │                     │
│   Outbox    │                     │
│ - Publishes │                     │
│   to Kafka  │                     │
└──────┬──────┘                     │
       │                            │
       │ Kafka Messages             │
       │                            │
┌──────▼──────────────────────────┐ │
│   Kafka Broker                  │ │
│   - zap-events                  │ │
│   - zap-events-dlq (DLQ)        │ │
└──────┬──────────────────────────┘ │
       │                            │
       │ Consumes Messages          │
       │                            │
┌──────▼──────────────┐             │
│    Worker           │ (Kafka)     │
│                     ├─────────────┘
│ - Consumes Events   │ Publishes Success
│ - Executes Actions  │ to Redis
│ - Handles Retries   │
│ - Routes to DLQ     │
└─────────────────────┘
```

## Components

### 1. Frontend (Next.js)

**Location:** `apps/frontend/`
**Purpose:** User interface for creating and managing Zaps.

**Key Features:**
- User authentication (signup/signin)
- Zap creation and management dashboard
- Trigger and action selection UI
- Real-time Zap status notifications via WebSockets.

**Technology Stack:**
- Next.js 14, React 18, Tailwind CSS
- WebSockets for real-time connection to the Notification Service

### 2. Primary Backend (Express.js)

**Location:** `apps/primarybackend/`
**Purpose:** Main API server handling user management, authentication, and Zap CRUD operations.

**Technology Stack:**
- Express.js, Prisma ORM, PostgreSQL, JWT for authentication, Zod for validation

### 3. Hooks Service

**Location:** `apps/hooks/`
**Purpose:** Receives webhook events from external services and triggers Zap executions.

**Key Responsibilities:**
- Receive webhook POST requests.
- Rate limits incoming requests using Redis.
- Create `ZapRun` and `ZapRunOutbox` entries consistently using database transactions.

### 4. Processor Service

**Location:** `apps/processor/`
**Purpose:** Implements the Transactional Outbox Pattern - polls the database for pending ZapRunOutbox entries and publishes them to Kafka.

**Flow:**
1. Continuously polls `ZapRunOutbox` table.
2. Publishes each ZapRun ID to the Kafka topic `zap-events`.
3. Deletes processed outbox entries.

### 5. Worker Service

**Location:** `apps/worker/`
**Purpose:** Consumes Kafka messages, executes Zap actions, and handles failures via retries and DLQ.

**Key Responsibilities:**
- Consume messages from Kafka topic `zap-events`.
- Manage Retry Logic (`MAX_RETRIES = 3`).
- Send messages to `zap-events-dlq` upon complete failure.
- Publish success events to Redis for real-time notifications.

### 6. Notification Service

**Location:** `apps/services/notification-service/`
**Purpose:** Relays real-time notifications to the frontend when a Zap finishes successfully.

**Key Responsibilities:**
- Host a WebSocket server on port 9000.
- Map connected WebSockets to `userId`s securely.
- Subscribe to the Redis Pub/Sub channel `zap-notification`.
- Forward notifications to specific connected clients.

### 7. Database (PostgreSQL & Redis)

**Shared across services.**

**Schema Overview:**
- `User`, `Zap`, `Trigger`, `Action`, `AvailableTriggers`, `AvailableActions`
- `ZapRun`: The instance of a triggered Zap. Includes a `status` field.
- `ZapRunOutbox`: Implements outbox pattern to ensure reliability between hooks and Kafka.

---

## Technical Deep Dives

### Dead Letter Queue (DLQ) and Retry Mechanism

The system implements a robust fault tolerance mechanism using Kafka to handle intermittent errors, bad data, and permanent failures during worker processing.

**Topic Definitions:**
- Main Topic: `zap-events`
- DLQ Topic: `zap-events-dlq`

**Workflow:**
1. **Validation Check:** The worker pulls a message from `zap-events`. If the JSON is completely invalid or missing essential keys (like `zapRunId`), it evaluates it as irrecoverable and sends it immediately to `zap-events-dlq`, then commits the offset.
2. **Execution and Errors:** The worker tries processing the `zapRunId`. If an error is thrown (e.g., action failed, timeout, external API is down).
3. **Retry Loop:** 
   - The message payload contains a `retryCount` (defaulting to 0).
   - If `retryCount < MAX_RETRIES` (which is 3), the worker publishes a *new* copy of the message back to the `zap-events` topic, but this time with `retryCount` incremented by 1. The original message offset is committed so it's not re-read continuously by the same failure loop.
4. **DLQ Routing:** 
   - If the `retryCount` limit is met, the system recognizes this as a permanent failure.
   - The worker packages the `zapRunId`, `retryCount`, the `errorMessage`, and a timestamp into a JSON payload.
   - It publishes this payload to `zap-events-dlq`. The offset of the original message is committed.
5. **Observation:** A separate service or site reliability engineer can monitor the `zap-events-dlq` to debug "poison pill" messages without blocking the main event flow.

### Real-Time Notification System

The application ensures users immediately know the outcome of their Zaps through an asynchronous notification flow.

**Workflow:**
1. **Connection Setup:** 
   - When the user logs onto the Web app UI, the frontend establishes a persistent WebSocket connection to the Notification Service cluster mapping to their `userId`.
2. **Success Publication:**
   - After a Worker completes a ZapRun and updates the Database as successful, it needs a way to decouple from the frontend stack. 
   - The Worker publishes a stringified JSON payload to deeply integrated cache: Redis inside the `zap-notification` channel with their details.
3. **Pushed to Client:**
   - The Notification Service is subscribed to Redis. Upon receiving messages containing `{ userId, zapId, status, message }`, it filters through its in-memory map of `userSockets`.
   - If the target `userId` has an open socket, it broadcasts the message to the browser natively over WebSocket.
   - The React frontend receives the WebSocket message and dynamically displays a success toast to the user visually updating the page without a refresh.