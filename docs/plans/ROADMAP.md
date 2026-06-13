# Platform Roadmap — Implementation Phases

## Production-Oriented Social + Commerce + Creator Ecosystem

### Phase 0: Foundation Platform (Current)

* **Goal**: Build production foundation with real microservices.
* **Core Components**:

  * Shared Packages: `logger`, `config`, `db`, `redis`, `tracing`, `auth-sdk`.
  * Initial Services: `gateway`, `auth-service`, `identity-service`.
* **Infra**:

  * PostgreSQL
  * Redis
  * Docker Compose
* **Standards**:

  * REST API
  * Error Format
  * Pagination
  * Auth Middleware

---

### Phase 1: Media Platform

* **Goal**: Build media lifecycle (upload, storage, processing).
* **Core Components**:

  * `media-service`
  * `storage-sdk`
  * `media-worker`
* **Tech**:

  * MinIO (S3-compatible)
  * Redis
  * BullMQ
* **Features**:

  * Image Upload
  * Video Upload
  * Thumbnail Generation
  * Media Processing Pipeline
  * CDN Integration

---

### Phase 2: Social Core

* **Goal**: Build social interaction engine based on FE contract.
* **Core Components**:

  * `social-service`
* **Modules**:

  * Profile (Header & Stats)
  * Reels
  * Stories
  * Follow
  * Post
  * Comment
  * Feed
* **Tech**:

  * NestJS (Fastify)
  * Prisma ORM
  * PostgreSQL (Primary Datastore)
  * Redis (Feed Cache, Counters, Hot Data)
* **Domain Boundary**:

  * Identity owns accounts and authentication.
  * Social owns profiles, follows, content (Reels, Stories) and interactions.

---

### Phase 3: Realtime Platform

* **Goal**: Realtime communication and user presence.
* **Core Components**:

  * `ws-gateway`
  * `presence-service`
  * `notification-service`
* **Tech**:

  * WebSocket
  * Redis Pub/Sub
* **Features**:

  * Online Status
  * Realtime Notifications
  * Typing Indicators
  * Event Broadcasting

---

### Phase 4: Event-Driven Architecture

* **Goal**: Async-first architecture.
* **Tech**:

  * Kafka
* **Migration**:

  * Redis Pub/Sub → Kafka
* **Features**:

  * Domain Events
  * Event Consumers
  * Decoupled Services

---

### Phase 5: Search Platform

* **Goal**: Global search.
* **Tech**:

  * OpenSearch
* **Pipeline**:

  * PostgreSQL
  * Domain Events
  * Indexing Worker
  * OpenSearch

---

### Phase 6: Analytics Platform

* **Goal**: Observability and creator analytics.
* **Tech**:

  * ClickHouse
* **Features**:

  * Creator Dashboard
  * Content Analytics
  * Feed Analytics
  * System Metrics

---

### Phase 7: Chat Platform

* **Goal**: Messaging domain.
* **Core Components**:

  * `chat-service`
  * `chat-worker`
* **Tech**:

  * MongoDB
  * Redis
  * WebSocket
* **Features**:

  * Private Chat
  * Group Chat
  * Message History
  * Media Messages
  * Read Receipts

---

### Phase 8: Shop & Wallet

* **Goal**: Commerce platform.
* **Core Components**:

  * `shop-service`
  * `wallet-service`
  * `order-service`
* **Tech**:

  * PostgreSQL
* **Features**:

  * Products
  * Orders
  * Payments
  * Ledger-based Wallet

---

### Phase 9: Live Platform

* **Goal**: Livestreaming platform.
* **Features**:

  * Livestream
  * Realtime Reactions
  * Gifts
  * Viewer Interaction

---

### Phase 10: Recommendation Platform

* **Goal**: Personalized ranking and recommendation.
* **Tech**:

  * Vector Search
  * Ranking Service
* **Features**:

  * Feed Ranking
  * Creator Recommendation
  * Content Recommendation

---

### Phase 11: Platform Engineering

* **Goal**: Operational maturity.
* **Tech**:

  * Kubernetes
  * CI/CD
  * Feature Flags
  * Canary Deployment
  * Advanced Monitoring
