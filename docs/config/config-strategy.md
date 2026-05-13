# Config Strategy

## Rules

Each service:
- own env
- own config validation
- own secrets

Never:
- global shared env

---

## Required Config Categories

- app
- db
- redis
- auth
- tracing
- timeout

---

## Validation

Fail fast on startup.