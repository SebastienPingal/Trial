import type { TypingEvent, TypingEventPlugin, TypingMetrics, TypingSummary } from './types';

const freshMetrics = (): TypingMetrics => ({
  shownAt: Date.now(),
  firstKeyAt: null,
  lastKeyAt: null,
  text: '',
  charsTyped: 0,
  charsDeleted: 0,
  longestPauseMs: 0,
});

/**
 * Measures how the player types and runs the typing plugins.
 * Framework-agnostic: call input() on every text change, tick() periodically, reset() per answer.
 */
export class TypingTracker {
  private metrics = freshMetrics();
  private fired: TypingEvent[] = [];

  constructor(
    private readonly plugins: TypingEventPlugin[],
    private readonly onEvent: (event: TypingEvent) => void,
  ) {}

  reset(): void {
    this.metrics = freshMetrics();
    this.fired = [];
    this.plugins.forEach((p) => p.reset());
  }

  input(text: string): void {
    const m = this.metrics;
    const now = Date.now();
    const previousText = m.text;
    const delta = text.length - previousText.length;
    const pauseMs = m.lastKeyAt === null ? null : now - m.lastKeyAt;

    if (pauseMs !== null) m.longestPauseMs = Math.max(m.longestPauseMs, pauseMs);
    m.firstKeyAt ??= now;
    m.lastKeyAt = now;
    m.text = text;
    if (delta < 0) m.charsDeleted -= delta;
    else m.charsTyped += delta;

    for (const plugin of this.plugins) {
      if (plugin.onInput?.(m, { now, delta, previousText, pauseMs })) this.fire(plugin, now);
    }
  }

  tick(): void {
    const now = Date.now();
    for (const plugin of this.plugins) {
      if (plugin.onTick?.(this.metrics, now)) this.fire(plugin, now);
    }
  }

  summary(): TypingSummary {
    const m = this.metrics;
    const now = Date.now();
    const activeSeconds = m.firstKeyAt === null ? 0 : (now - m.firstKeyAt) / 1000;
    const descriptions = new Map(this.plugins.map((p) => [p.kind, p.description]));
    return {
      durationMs: now - m.shownAt,
      timeToFirstKeyMs: m.firstKeyAt === null ? null : m.firstKeyAt - m.shownAt,
      charsTyped: m.charsTyped,
      charsDeleted: m.charsDeleted,
      longestPauseMs: m.longestPauseMs,
      charsPerSecond: activeSeconds > 0 ? Math.round((m.charsTyped / activeSeconds) * 10) / 10 : 0,
      events: this.fired.map((e) => ({ kind: e.kind, description: descriptions.get(e.kind) ?? e.kind })),
    };
  }

  private fire(plugin: TypingEventPlugin, now: number): void {
    const event: TypingEvent = {
      kind: plugin.kind,
      atMs: now - this.metrics.shownAt,
      text: this.metrics.text,
      effect: plugin.effect,
    };
    this.fired.push(event);
    this.onEvent(event);
  }
}
