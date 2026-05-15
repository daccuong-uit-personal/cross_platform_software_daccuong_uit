# Cross Platform Software (Production Ecosystem)

This repository contains the full source code and architectural blueprints for a production-oriented Social + Commerce + Creator platform.

## 🚀 Current Status: Phase 1 (Media Platform) ✅

We have successfully established the foundational infrastructure, core identity services, and media handling capabilities.

### 🛠️ Core Services (Implemented)
- **API Gateway (Port 3000)**: Central entry point with rate limiting, tracing, and proxy routing.
- **Auth Service (Port 3001)**: Handles registration, login, and JWT management (Access & Refresh tokens).
- **Identity Service (Port 3002)**: Manages user profiles and account metadata.
- **Media Service (Port 3003)**: Handles media upload, storage, processing, and streaming (images, videos).

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
- **MinIO**: S3-compatible object storage for media files.
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
Copy the example environment files and update them for your local environment:
```bash
cp .env.example .env
cp infra/docker/.env.example infra/docker/.env
```

The root `.env.example` contains shared service configuration for:
- `Auth Service`
- `Identity Service`
- `Media Service`
- `Gateway`
- local infrastructure (Postgres, Redis, MongoDB, MinIO)

Update the following values as needed:
- `NODE_ENV`: `development` for local dev, `production` for production.
- `LOG_LEVEL`: log verbosity, e.g. `info`, `debug`, or `error`.
- `AUTH_DATABASE_URL`, `IDENTITY_DATABASE_URL`, `MEDIA_DATABASE_URL`: change host/user/password/db/schema when using a different database.
- `AUTH_REDIS_URL` / `REDIS_URL`: update when Redis is not on localhost or uses a different password.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: replace with secure random secrets in production.
- `CORS_ORIGIN`: set to your frontend origin in production instead of `http://localhost:5173`.
- `AUTH_SERVICE_URL`, `IDENTITY_SERVICE_URL`, `MEDIA_SERVICE_URL`: point to the actual deployed service URLs when not running locally.

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

You can also use the Media Service docs at `docs/api/media-service.md` and the Postman collection at `docs/postman/media-service.postman_collection.json`.

---

## 🗺️ Roadmap & Phases

1. **Phase 0: Foundation Platform** (Completed ✅)
2. **Phase 1: Media Platform** (Upcoming 🏗️) - Media lifecycle with **MinIO** & BullMQ.
3. **Phase 2: Social Core** - Interaction engine (Feed, Follow, Reaction).

[View Full Roadmap](docs/plans/ROADMAP.md)

---
*Built with love for high-performance distributed systems.*