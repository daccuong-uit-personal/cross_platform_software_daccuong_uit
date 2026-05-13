# Language Strategy by Phase

## Phase 0 — Foundation Platform
Recommended:
- Gateway: NestJS
- Auth Service: NestJS
- Identity Service: NestJS

Reason:
- Fast iteration
- Shared typings
- Strong DX
- Easy onboarding
- Lightweight local infra

Avoid:
- Mixing too many languages too early

---

## Phase 1 — Media Platform
Recommended:
- Media API: NestJS
- Media Worker: Python

Reason:
- Python ecosystem mạnh cho:
  - ffmpeg orchestration
  - image/video processing
  - AI moderation sau này

Worker async phù hợp Python hơn Node.

---

## Phase 2 — Social Core
Recommended:
- Feed Service: NestJS

Reason:
- CRUD-heavy
- Realtime-friendly
- Fast API iteration

---

## Phase 3 — Realtime Platform
Recommended:
- WebSocket Gateway: NestJS

Reason:
- socket ecosystem tốt
- shared auth dễ
- Redis integration đơn giản

---

## Phase 4 — Event-Driven
Recommended:
- Kafka infra independent
- Consumers:
  - NestJS cho business consumer
  - Python cho analytics/data workloads

---

## Phase 5 — Search Platform
Recommended:
- Indexing Worker: Java hoặc Python
- Search API: NestJS

Reason:
- OpenSearch clients mature
- Java mạnh về throughput
- Python mạnh ETL/indexing

Nếu solo/small team:
- dùng Python trước

---

## Phase 6 — Analytics Platform
Recommended:
- Ingestion Worker: Python
- Aggregation: Python
- Heavy analytics pipeline: Python

Reason:
- data ecosystem mạnh
- ClickHouse tooling phù hợp

---

## Phase 7 — Chat Platform
Recommended:
- Chat Service: Java (Spring Boot)
- Realtime Gateway: NestJS

Reason:
- Java mạnh:
  - concurrency
  - long-running systems
  - memory stability
  - websocket scale

NestJS giữ realtime edge layer.

---

## Phase 8 — Shop & Wallet
Recommended:
- Shop Service: NestJS
- Wallet/Payment Service: Java

Reason:
- Financial consistency
- Thread stability
- Transaction control
- Mature retry patterns

Wallet là nơi đáng dùng JVM nhất.

---

## Phase 9 — Live Platform
Recommended:
- Signaling/Gateway: NestJS
- Stream orchestration: Java/Python

Reason:
- Low latency handling
- concurrent session management

---

## Phase 10 — Recommendation
Recommended:
- Recommendation API: Python
- ML pipeline: Python

Reason:
- vector ecosystem
- embedding ecosystem
- ML tooling

---

## Phase 11 — Platform Engineering
Recommended:
- Infra tooling:
  - Terraform
  - Helm
  - GitHub Actions
  - Bash/Python scripts

---

# Final Principle

Không polyglot chỉ để "cool".

Chỉ đổi ngôn ngữ khi:
- workload khác nhau
- operational benefit rõ
- team maintain nổi