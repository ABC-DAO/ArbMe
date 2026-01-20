/**
 * Simple reactive state management
 */

import type { AppState } from './utils/types';

type Subscriber = () => void;

class Store {
  private state: AppState = {
    wallet: null,
    pools: [],
    positions: [],
    loading: false,
    error: null,
  };

  private subscribers = new Set<Subscriber>();

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  /**
   * Update state and notify subscribers
   */
  setState(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<AppState> {
    return this.state;
  }

  private notify(): void {
    this.subscribers.forEach((fn) => fn());
  }
}

export const store = new Store();
