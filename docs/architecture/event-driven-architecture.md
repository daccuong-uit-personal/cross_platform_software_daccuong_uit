# Event-Driven Microservices Architecture

## Overview

This document describes the event-driven architecture for inter-service communication between **auth-service** and **social-service** using Redis Pub/Sub. This solves the synchronization problem where user profiles were not automatically created when accounts were created.

## Problem Statement

When a user registered in auth-service, the social-service database remained unaware of the new user. Attempting to access `GET /api/v1/profiles/{userId}` in social-service returned a 404 error with message "Người dùng không tồn tại" (User does not exist).

**Root Cause**: No inter-service communication mechanism existed. Each service maintained separate databases (auth_db, social_db) without automatic synchronization.

## Solution Architecture

### Event-Driven Pattern
- **Transport**: Redis Pub/Sub (selected for Phase 2)
- **Event Format**: `domain.entity.action.v1` (e.g., `user.created.v1`)
- **Channel Naming**: `events:{eventName}` (e.g., `events:user.created.v1`)

### Event Envelope Structure
```typescript
interface DomainEvent {
  event_id: string;              // UUID for event tracking
  event_name: string;            // e.g., "user.created.v1"
  trace_id: string;              // Distributed tracing correlation ID
  occurred_at: string;           // ISO 8601 timestamp
  producer: string;              // Service name (e.g., "auth-service")
  payload: Record<string, any>;  // Event-specific data
}
```

### UserCreatedEvent Payload
```typescript
{
  userId: string;                                    // User ID from auth-service
  username: string;                                  // Username
  displayName: string;                               // Display name
  email?: string;                                    // Email (only if email registration)
  phoneNumber?: string;                              // Phone (only if phone registration)
  preferredContactMethod?: 'EMAIL' | 'PHONE';        // Preferred contact method
}
```

## Implementation

### 1. Event Infrastructure (`packages/common`)

#### `src/events/domain.events.ts`
Central type definitions for events shared across all services.

```typescript
export interface DomainEvent {
  event_id: string;
  event_name: string;
  trace_id: string;
  occurred_at: string;
  producer: string;
  payload: Record<string, any>;
}

export interface UserCreatedEvent extends DomainEvent {
  event_name: 'user.created.v1';
  payload: {
    userId: string;
    email?: string;
    phoneNumber?: string;
    username: string;
    displayName: string;
    preferredContactMethod?: 'EMAIL' | 'PHONE';
  };
}

export function isUserCreatedEvent(event: DomainEvent): event is UserCreatedEvent {
  return event.event_name === 'user.created.v1';
}
```

#### `src/events/event-bus.service.ts`
Redis Pub/Sub implementation for event publishing and subscription.

**Key Features**:
- Separate Redis connections for publisher and subscriber (best practice)
- Auto-generates `event_id` and `occurred_at` if not provided
- Supports multiple handlers per event
- Graceful cleanup on application shutdown
- Error handling without stopping other handlers

**Usage**:
```typescript
// Publishing
const event: UserCreatedEvent = { /* ... */ };
await eventBus.publish(event);

// Subscribing
await eventBus.subscribe('user.created.v1', async (event) => {
  // Handle event
});
```

### 2. Auth Service Integration

#### `apps/auth-service/src/events/event.module.ts`
NestJS module that provides EventBusService globally in auth-service.

```typescript
@Module({
  providers: [
    {
      provide: EventBusService,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || 
          `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
        return new EventBusService(redisUrl);
      },
    },
  ],
  exports: [EventBusService],
})
export class EventModule {}
```

#### Event Publishing in Auth Service
In `apps/auth-service/src/auth/auth.service.ts`:

**Email Registration Flow** (registerByEmail):
```typescript
// After account created...
await this.eventBus.publish({
  event_id: randomUUID(),
  event_name: 'user.created.v1',
  trace_id: randomUUID(),
  occurred_at: new Date().toISOString(),
  producer: 'auth-service',
  payload: {
    userId: account.id,
    email: account.email ?? undefined,
    username: account.username,
    displayName: account.displayName,
    preferredContactMethod: account.preferredContactMethod as 'EMAIL' | 'PHONE',
  },
});
```

**Phone Registration Flow** (registerByPhone):
Similar to email, but publishes phoneNumber instead:
```typescript
phoneNumber: account.phoneNumber ?? undefined,
```

**Error Handling**: Event publishing failures don't block registration:
```typescript
try {
  await this.eventBus.publish(event);
} catch (err) {
  logger.warn('Failed to publish user.created event', { accountId: account.id });
  // Continue - registration succeeds even if event fails
}
```

### 3. Social Service Integration

#### `apps/social-service/src/events/event.module.ts`
Similar to auth-service, provides EventBusService in social-service.

#### User Profile Auto-Creation
In `apps/social-service/src/users/users.service.ts`:

```typescript
async createUserProfile(data: {
  userId: string;
  username: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
}) {
  // Idempotency check
  const existing = await this.prisma.userProfile.findUnique({
    where: { userId: data.userId },
  });
  if (existing) return existing;

  // Create profile with default settings
  const profile = await this.prisma.userProfile.create({
    data: {
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
    },
  });

  // Create default privacy and account settings
  await this.prisma.privacySettings.create({
    data: {
      userId: data.userId,
      isPrivateAccount: false,
      whoCanSeeMyPosts: 'everyone',
      whoCanSendFriendRequest: 'everyone',
      whoCanSeeMyFriendList: 'everyone',
      whoCanTagMe: 'everyone',
    },
  });

  await this.prisma.accountSettings.create({
    data: {
      userId: data.userId,
      language: 'vi',
      emailNotifications: true,
      pushNotifications: true,
      twoFactorEnabled: false,
    },
  });

  return profile;
}
```

**Idempotency**: The check for existing profile ensures that if the same event is processed twice, only one profile is created.

#### Event Listener
In `apps/social-service/src/users/event-listeners.service.ts`:

```typescript
@Injectable()
export class UserEventListenersService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    // Subscribe on app startup
    await this.eventBus.subscribe('user.created.v1', 
      this.handleUserCreated.bind(this));
  }

  private async handleUserCreated(event: any): Promise<void> {
    try {
      const { userId, username, displayName } = event.payload;
      await this.usersService.createUserProfile({
        userId,
        username,
        displayName,
      });
    } catch (error) {
      logger.error('Failed to handle user.created event', error);
      // In production: save to dead-letter queue or retry
    }
  }
}
```

The listener subscribes to `user.created.v1` events during module initialization and calls `createUserProfile()` with the event payload.

### 4. Module Registration

#### Auth Service Modules
- `auth.module.ts`: Imports EventModule, provides AuthService
- `app.module.ts`: Imports EventModule at root level

#### Social Service Modules
- `users.module.ts`: Imports EventModule, provides UserEventListenersService
- `app.module.ts`: Imports EventModule at root level

## Event Flow Diagram

```
┌─────────────────────┐
│  User Registration  │
│  (auth-service)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 1. Create Account in auth_db        │
│ 2. Publish user.created.v1 event    │
└──────────┬──────────────────────────┘
           │
           │ Redis Pub/Sub
           │ Channel: events:user.created.v1
           │
           ▼
┌──────────────────────────────────────┐
│ social-service event listener        │
│ onModuleInit() subscribes to channel │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 1. Receive user.created.v1 event     │
│ 2. Call createUserProfile()          │
│ 3. Create profile in social_db       │
└──────────────────────────────────────┘
           │
           ▼
    ✅ User accessible in social-service
    GET /api/v1/profiles/{userId} → 200 OK
```

## Testing Guide

### Prerequisites
- Redis running on localhost:6379 (or set REDIS_URL environment variable)
- Both services built and ready to start

### End-to-End Test
1. **Start services**:
   ```bash
   # Terminal 1: auth-service
   cd apps/auth-service
   npm start

   # Terminal 2: social-service
   cd apps/social-service
   npm start
   ```

2. **Register new user** (auth-service):
   ```bash
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "newuser@example.com",
       "username": "newuser",
       "displayName": "New User",
       "password": "SecurePassword123!"
     }'
   ```

3. **Check profile creation** (social-service):
   ```bash
   # Get userId from registration response
   curl -X GET http://localhost:3001/api/v1/profiles/{userId} \
     -H "Authorization: Bearer {token}"
   ```

   **Expected Response** (200 OK):
   ```json
   {
     "id": "...",
     "userId": "...",
     "username": "newuser",
     "displayName": "New User",
     "createdAt": "...",
     "updatedAt": "..."
   }
   ```

4. **Verify logs**:
   - Auth-service logs: `Published user.created.v1 event with event_id: xxx`
   - Social-service logs: `User profile created from event with event_id: xxx`

### Debugging
- Check Redis connections: `redis-cli SUBSCRIBE "events:user.created.v1"`
- Monitor event publishing: Add log statements in EventBusService.publish()
- Check database: Query `userProfile` table in social_db for newly created user

## Future Enhancements

### Phase 3: Extended Events
- `user.account_status_updated.v1` - Handle account activation/deactivation
- `user.deleted.v1` - Handle profile deletion when account deleted

### Phase 4: Advanced Features
- **Kafka Migration**: Replace Redis Pub/Sub with Kafka for better durability
- **Event Sourcing**: Store events as primary record of user state changes
- **Dead-Letter Queue**: Capture failed events for manual retry/investigation
- **Event Replay**: Ability to replay historical events to rebuild state

### Phase 5: Error Resilience
- Automatic retry with exponential backoff
- Circuit breaker pattern for Redis failures
- Event buffering during service downtime
- Health check endpoints for event system status

## Troubleshooting

### Issue: 404 "User does not exist" in social-service
**Solution**: 
1. Verify Redis connection is working
2. Check that social-service listener is initialized (check logs for "User event listeners registered")
3. Ensure event was published (check auth-service logs)
4. Query database directly: `SELECT * FROM social_db.userProfile WHERE userId = '{userId}'`

### Issue: Event listener not receiving events
**Possible causes**:
- Redis not running or wrong connection URL
- Social-service crashed during startup (check logs)
- Channel name mismatch (ensure it's `events:user.created.v1`)

### Issue: Duplicate profiles created
**Solution**:
- Already handled by idempotency check in `createUserProfile()`
- If still occurring, check for race conditions with simultaneous requests

## References

- **ADR 001**: No shared database (microservices pattern)
- **ADR 002**: REST-first API design (separate services)
- **Event Bus Pattern**: [Microservices Patterns - Chris Richardson](https://microservices.io/patterns/data/event-sourcing.html)
- **Redis Pub/Sub**: [Redis Documentation](https://redis.io/docs/manual/pubsub/)
