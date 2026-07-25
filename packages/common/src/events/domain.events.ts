/**
 * Domain Events - Shared across services
 * Format: domain.entity.action.v1
 *
 * Example:
 * - auth.user.created.v1
 * - social.user-profile.created.v1
 */

export interface DomainEvent {
  event_id: string;
  event_name: string;
  trace_id?: string;
  occurred_at: string;
  producer: string; // service name: 'auth-service', 'social-service'
  payload: Record<string, any>;
}

/**
 * auth.user.created.v1
 * Published when a new user account is created
 */
export interface UserCreatedEvent extends DomainEvent {
  event_name: 'user.created.v1';
  payload: {
    userId: string; // UUID from auth-service
    email?: string;
    phoneNumber?: string;
    username: string;
    displayName: string;
    preferredContactMethod?: 'EMAIL' | 'PHONE';
  };
}

/**
 * user.account-status-updated.v1
 * Published when user account status changes
 */
export interface UserAccountStatusUpdatedEvent extends DomainEvent {
  event_name: 'user.account-status-updated.v1';
  payload: {
    userId: string;
    status: 'PENDING' | 'ACTIVE' | 'BANNED' | 'DELETED';
  };
}

// Union type for all user events
export type UserDomainEvent = UserCreatedEvent | UserAccountStatusUpdatedEvent;

// Event type guard
export const isUserCreatedEvent = (event: DomainEvent): event is UserCreatedEvent =>
  event.event_name === 'user.created.v1';

export const isUserAccountStatusUpdatedEvent = (
  event: DomainEvent,
): event is UserAccountStatusUpdatedEvent => event.event_name === 'user.account-status-updated.v1';
