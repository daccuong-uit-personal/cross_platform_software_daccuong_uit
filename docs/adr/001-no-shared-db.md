# ADR-001 — No Shared Database

Status: Accepted

## Context

Microservices require independent evolution.

## Decision

Every service owns:
- schema
- migration
- data lifecycle

## Consequences

Pros:
- loose coupling
- independent deployment
- safer scaling

Cons:
- eventual consistency
- API/event dependency