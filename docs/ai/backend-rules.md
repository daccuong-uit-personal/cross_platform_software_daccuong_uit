# AI Backend Rules — Platform Architecture

## 🎯 Core Philosophy
- **Platform-first**: Build capabilities, not just features.
- **Async-first**: Decouple services using events (Redis/Kafka).
- **Service Isolation**: Each service is a black box with its own lifecycle.

## ✅ Mandatory (The "Must-Haves")
1. **DB Ownership**: A service NEVER queries another service's database. Data exchange happens via API or Events.
2. **Observability**: Every request MUST have `trace_id`, `request_id`, `user_id`, and `service_name`.
3. **Structured Logging**: Log in JSON format. No plain text logs in production.
4. **Resilience**: 
    - Every external call MUST have a timeout.
    - Implement retries for transient failures (idempotent operations only).
    - Use circuit breakers for downstream services.
5. **API Standards**:
    - Consistent error format.
    - Standardized pagination.
    - JWT propagation and cross-service validation.
    - **Database Naming**: Use `snake_case` for all database objects (tables, columns, indexes). In Prisma, use `@@map` and `@map` to enforce this.
6. **Async Integrity**:
    - Every event must be versioned.
    - Consumers must be idempotent.
    - Use DLQ (Dead Letter Queues) for failed processing.

## 🚫 Forbidden (The "Never-Dos")
1. **Shared Database**: No exceptions.
2. **Sync Cross-Service Calls in Critical Path**: Avoid chaining synchronous API calls. Prefer eventual consistency.
3. **Monolithic Shared Packages**: Packages should be focused (e.g., `logger`, `config`) rather than a single `utils` junk drawer.
4. **Hidden Logic in Gateway**: The Gateway is for routing, auth, and rate-limiting ONLY.
5. **Direct File Access**: Services must use the Media Platform (Signed URLs) for file operations.

## 🏗️ Evolution Strategy (Avoid Over-Engineering)
- **Do NOT implement too early**:
    - Service Mesh (use simple service discovery/DNS first).
    - CQRS everywhere (only for complex read/write separation).
    - Event Sourcing (only for audit-critical domains like Wallet).
    - Multi-region orchestration.

## 🛠️ Implementation Mindset
- **Service fail still lives**: The system should degrade gracefully.
- **Traceable flow**: Follow a request from Gateway to the last worker.
- **Replayable events**: Be able to re-process events if a consumer fails.
- **Scalable capabilities**: Each platform component should scale independently.