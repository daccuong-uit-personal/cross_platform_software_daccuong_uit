# Cross Platform Software (Production Ecosystem)

This repository contains the full source code and architectural blueprints for a production-oriented Social + Commerce + Creator platform.

## 📂 Repository Structure & Roles

### 🛠️ Core Project (Mã nguồn dự án)
Những thư mục này chứa mã nguồn sẽ được build và deploy lên production.
- `apps/`: Deployable microservices (Gateway, Auth, Identity, etc.).
- `packages/`: Shared infrastructure packages (Logger, DB, Redis, etc.).
- `infra/`: Infrastructure configuration (Docker, Kubernetes).

### 🤖 AI-Generated & Documentation (Tài liệu & Blueprints)
Những thư mục này dành cho việc thiết kế, hướng dẫn AI và lưu trữ kiến trúc.
- `docs/`: Toàn bộ tài liệu kiến trúc, tiêu chuẩn API, ADRs và Roadmap.
- `.ai/`: Context dành riêng cho AI để hiểu sâu về hệ thống.
- `package.json`: Cấu hình Monorepo (Root).

## 🗺️ Roadmap & Phases

The implementation is divided into several phases to ensure scalability and operational maturity:

1. **Phase 0: Foundation Platform** (Current) - Establishing shared infrastructure and core identity.
2. **Phase 1: Media Platform** - Media lifecycle and async processing.
3. **Phase 2: Social Core** - Interaction engine (Feed, Follow, Reaction).
4. **Phase 3: Realtime Platform** - WebSocket and presence systems.
5. ... [View Full Roadmap](docs/plans/ROADMAP.md)

## 🛠️ Tech Stack (Core)

- **Language**: Node.js / TypeScript (Primary)
- **Database**: PostgreSQL (Relational), Redis (Caching/Pub-Sub)
- **Messaging**: Kafka (Event-driven)
- **Search**: OpenSearch
- **Analytics**: ClickHouse
- **Deployment**: Docker Compose (Local), Kubernetes (Production)

## 📖 Standards

- [Backend Rules & Guidelines](docs/ai/backend-rules.md)
- [API Conventions](docs/standards/api-conventions.md)
- [Database Selection Strategy](docs/architecture/database-strategy.md)
- [Logging & Tracing](docs/standards/observability.md)

---
*Built with love for high-performance distributed systems.*