    # Platform Roadmap — Implementation Phases
    ## Production-Oriented Social + Commerce + Creator Ecosystem

    ### Phase 0: Foundation Platform (Current)
    - **Goal**: Build production foundation with real microservices.
    - **Core Components**:
        - Shared Packages: `logger`, `config`, `db`, `redis`, `tracing`, `auth-sdk`.
        - Initial Services: `gateway`, `auth-service`, `identity-service`.
        - Infra: `docker-compose`, `PostgreSQL`, `Redis`.
    - **Standards**: REST, Error format, Pagination, Auth Middleware.

    ### Phase 1: Media Platform
    - **Goal**: Build media lifecycle (upload, storage, processing).
    - **Core Components**: `media-service`, `object-storage`, `worker`.
    - **Tech**: Redis Pub/Sub, BullMQ.

    ### Phase 2: Social Core
    - **Goal**: Interaction engine (Feed, Follow, Comment).
    - **Tech**: **MongoDB** (Feed/Comments), **PostgreSQL** (Relations).
    - **Domain Boundary**: Feed owns posts/comments; Identity owns accounts.

    ### Phase 3: Realtime Platform
    - **Goal**: WebSocket platform for notifications and status.
    - **Components**: `ws-gateway`, `presence-service`.

    ### Phase 4: Event-Driven Architecture
    - **Goal**: Async-first with Kafka.
    - **Migration**: Redis Pub/Sub -> Kafka.

    ### Phase 5: Search Platform
    - **Goal**: Global search with OpenSearch.
    - **Pipeline**: DB -> Event -> Indexing Worker -> OpenSearch.

    ### Phase 6: Analytics Platform
    - **Goal**: Observability + Creator Analytics (ClickHouse).

    ### Phase 7: Chat Platform
    - **Goal**: Messaging domain (Realtime, History, Media).

    ### Phase 8: Shop & Wallet
    - **Goal**: Commerce (Products, Orders, Ledger-based Wallet).

    ### Phase 9: Live Platform
    - **Goal**: Low-latency livestreaming and interaction.

    ### Phase 10: Recommendation Platform
    - **Goal**: Personalized ranking and vector search.

    ### Phase 11: Platform Engineering
    - **Goal**: Operational maturity (K8s, CI/CD, Canary, Feature Flags, Advanced Monitoring).
