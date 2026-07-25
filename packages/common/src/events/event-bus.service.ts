import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { DomainEvent } from './domain.events';

/**
 * Event Bus Service using Redis Pub/Sub
 * Manages publishing and subscribing to domain events
 */
@Injectable()
export class EventBusService {
  private logger = new Logger('EventBusService');
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Set<(event: DomainEvent) => Promise<void>>> = new Map();

  constructor(redisUrl: string) {
    // Separate instances for pub (single) and sub (blocking)
    this.publisher = new Redis(redisUrl, {
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3,
    });

    this.subscriber = new Redis(redisUrl, {
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3,
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Publisher error', err);
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Subscriber error', err);
    });
  }

  /**
   * Publish event to Redis channel
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      const channel = this.getChannelName(event.event_name);
      const payload = JSON.stringify({
        ...event,
        event_id: event.event_id || randomUUID(),
        occurred_at: event.occurred_at || new Date().toISOString(),
      });

      const numSubscribers = await this.publisher.publish(channel, payload);
      this.logger.debug(
        `Event published: ${event.event_name} (subscribers: ${numSubscribers})`,
        { event_id: event.event_id },
      );
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.event_name}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribe(
    eventName: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): Promise<void> {
    try {
      const channel = this.getChannelName(eventName);

      // Add handler to map
      if (!this.handlers.has(channel)) {
        this.handlers.set(channel, new Set());

        // Subscribe to Redis channel only once per event name
        this.subscriber.subscribe(channel, (err) => {
          if (err) {
            this.logger.error(`Failed to subscribe to ${channel}`, err);
          } else {
            this.logger.debug(`Subscribed to channel: ${channel}`);
          }
        });
      }

      this.handlers.get(channel)!.add(handler);

      // Listen for messages
      this.subscriber.on('message', async (channel, message) => {
        await this.handleMessage(channel, message);
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${eventName}`, error);
      throw error;
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(channel: string, message: string): Promise<void> {
    try {
      const event: DomainEvent = JSON.parse(message);
      const handlers = this.handlers.get(channel);

      if (!handlers) {
        this.logger.warn(`No handlers registered for channel: ${channel}`);
        return;
      }

      // Execute all handlers for this event
      const promises = Array.from(handlers).map((handler) =>
        handler(event).catch((err) => {
          this.logger.error(`Handler error for event ${event.event_name}`, err);
          // Don't rethrow - continue processing other handlers
        }),
      );

      await Promise.all(promises);
    } catch (error) {
      this.logger.error(`Failed to handle message on ${channel}`, error);
    }
  }

  /**
   * Convert event name to Redis channel name
   * Example: user.created.v1 -> events:user.created.v1
   */
  private getChannelName(eventName: string): string {
    return `events:${eventName}`;
  }

  /**
   * Cleanup - called on app shutdown
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.debug('Disconnecting Redis connections');
    await Promise.all([this.publisher.disconnect(), this.subscriber.disconnect()]);
  }
}
