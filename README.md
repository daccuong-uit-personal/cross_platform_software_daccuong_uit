# Cross Platform Software (Production Ecosystem)

This repository contains the full source code and architectural blueprints for a production-oriented Social + Commerce + Creator platform.

## 🚀 Current Status: Phase 0 (Foundation Platform) ✅

We have successfully established the foundational infrastructure and core identity services.

### 🛠️ Core Services (Implemented)
- **API Gateway (Port 3000)**: Central entry point with rate limiting, tracing, and proxy routing.
- **Auth Service (Port 3001)**: Handles registration, login, and JWT management (Access & Refresh tokens).
- **Identity Service (Port 3002)**: Manages user profiles and account metadata.

### 📦 Shared Packages
- `@platform/logger`: Standardized Pino-based logging.
- `@platform/config`: Centralized environment variable management.
- `@platform/db`: Prisma-based database client and migrations.
- `@platform/redis`: Redis client with ready-to-use caching patterns.
- `@platform/tracing`: OpenTelemetry integration for distributed tracing.
- `@platform/auth-sdk`: Shared authentication logic and guards.

### 🏗️ Infrastructure
- **PostgreSQL 15**: Primary relational database.
- **Redis 7**: Caching and Pub/Sub.
- **MongoDB 6**: Document store (for Phase 2 social data).
- **Jaeger**: Distributed tracing UI (Port 16686).
- **Docker Compose**: Orchestrates all infrastructure components.

---

## 📂 Repository Structure

- `apps/`: Deployable microservices.
- `packages/`: Shared infrastructure internal packages.
- `infra/docker/`: Docker configuration and environment setup.
- `docs/`: Architectural blueprints and standards.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- Postman (for testing)

### 2. Environment Setup
Copy the example environment files:
```bash
cp .env.example .env
cp infra/docker/.env.example infra/docker/.env
```

### 3. Start Infrastructure
Launch the databases and cache systems:
```bash
npm run dev
```

### 4. Run Services (Local Development)
Install dependencies and start services in development mode:
```bash
npm install
# In separate terminals or using Turbo:
npx turbo run dev
```

---

## 🧪 Testing with Postman

We have provided a Postman collection for testing the core flows.

1. **Import**: Import the collection from `docs/postman/Phase0_Collection.json`.
2. **Environment**: Set up a Postman Environment with `baseUrl` = `http://localhost:3000`.
3. **Flow**:
   - `POST /v1/auth/register`: Create a new user.
   - `POST /v1/auth/login`: Get access and refresh tokens.
   - `GET /v1/profiles/user/:userId`: Fetch profile data (needs Bearer token).

---

## 🗺️ Roadmap & Phases

1. **Phase 0: Foundation Platform** (Completed ✅)
2. **Phase 1: Media Platform** (Upcoming 🏗️) - Media lifecycle with **MinIO** & BullMQ.
3. **Phase 2: Social Core** - Interaction engine (Feed, Follow, Reaction).

[View Full Roadmap](docs/plans/ROADMAP.md)

---
*Built with love for high-performance distributed systems.*