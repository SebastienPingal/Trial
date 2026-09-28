type Handler<T> = (payload: T) => void;

/** Minimal typed pub/sub. `Events` maps each event name to its payload type. */
export class EventBus<Events extends object> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  /** Subscribes to an event; returns the unsubscribe function. */
  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    this.handlers.get(type)?.forEach((handler) => (handler as Handler<Events[K]>)(payload));
  }

  clear(): void {
    this.handlers.clear();
  }
}
