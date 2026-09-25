/**
 * ElectraKart Real-Time Event Hub
 * Provides an in-memory pub/sub broker for Server-Sent Events (SSE) streaming
 * and multi-channel domain event distribution.
 */

import { EventEmitter } from 'events';

export type RealtimeEntityType = 'ORDER' | 'DELIVERY' | 'ELECTRICIAN' | 'NOTIFICATION';

export interface DomainEvent<T = any> {
  eventId: string;
  eventType: string;
  entityType: RealtimeEntityType;
  entityId: string;
  timestamp: string;
  version: number;
  payload: T;
}

class RealtimeEventHub {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(500); // Support high concurrent client SSE connections
  }

  /**
   * Publish a typed domain event to a specific channel.
   * e.g., 'order:ord-123', 'delivery:del-456', 'electrician:job-789', 'user:usr-999'
   */
  publish<T>(channel: string, event: Omit<DomainEvent<T>, 'eventId' | 'timestamp' | 'version'> & Partial<Pick<DomainEvent<T>, 'eventId' | 'timestamp' | 'version'>>): DomainEvent<T> {
    const fullEvent: DomainEvent<T> = {
      eventId: event.eventId || `evt-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      timestamp: event.timestamp || new Date().toISOString(),
      version: event.version || 1,
      payload: event.payload as T,
    };

    // Emit on specific channel
    this.emitter.emit(channel, fullEvent);

    // Also emit on global broadcast channel for authorized admin listeners
    if (!channel.startsWith('admin:')) {
      this.emitter.emit('admin:all', fullEvent);
    }

    return fullEvent;
  }

  /**
   * Subscribe to a channel. Returns an unsubscribe teardown function.
   */
  subscribe<T = any>(channel: string, handler: (event: DomainEvent<T>) => void): () => void {
    this.emitter.on(channel, handler);
    return () => {
      this.emitter.off(channel, handler);
    };
  }

  /**
   * Get active listener count for monitoring.
   */
  getListenerCount(channel?: string): number {
    if (channel) return this.emitter.listenerCount(channel);
    return this.emitter.eventNames().reduce((sum, evt) => sum + this.emitter.listenerCount(evt), 0);
  }
}

export const eventHub = new RealtimeEventHub();
