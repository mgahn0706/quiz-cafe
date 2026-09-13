export class RecentRequestCache<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly capacity = 500) {}

  get(requestId: string) {
    return this.entries.get(requestId);
  }

  set(requestId: string, result: T) {
    this.entries.set(requestId, result);
    if (this.entries.size <= this.capacity) return;

    const oldestRequestId = this.entries.keys().next().value;
    if (oldestRequestId !== undefined) this.entries.delete(oldestRequestId);
  }
}
