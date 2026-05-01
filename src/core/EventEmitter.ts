export type EventListener = (payload: any) => void | Promise<void>;

export class EventEmitter {
  private listeners: Map<string, EventListener[]> = new Map();

  on(eventName: string, listener: EventListener): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(listener);
  }

  off(eventName: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  async emit(eventName: string, payload?: any): Promise<void> {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      for (const listener of eventListeners) {
        await listener(payload);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const globalEventEmitter = new EventEmitter();
