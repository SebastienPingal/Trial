import type { TypingEventPlugin } from '../types';

export interface LongHesitationOptions {
  idleMs: number; // idle time mid-answer
  beforeStartMs: number; // idle time before the first keystroke
}

export function createLongHesitation(
  { idleMs, beforeStartMs }: LongHesitationOptions = { idleMs: 5000, beforeStartMs: 8000 },
): TypingEventPlugin {
  let fired = false; // once per pause, re-armed by the next keystroke
  return {
    kind: 'long-hesitation',
    description: 'hesitated for a long time',
    effect: {
      evaluate: false,
      reaction: {
        jurors: { expression: 'doubt', intensity: 0.3 },
        prosecutor: { expression: 'suspicious', intensity: 0.5 },
        durationMs: 2500,
      },
    },
    reset() {
      fired = false;
    },
    onInput() {
      fired = false;
      return false;
    },
    onTick(metrics, now) {
      if (fired) return false;
      const idle = now - (metrics.lastKeyAt ?? metrics.shownAt);
      const limit = metrics.firstKeyAt === null ? beforeStartMs : idleMs;
      if (idle < limit) return false;
      fired = true;
      return true;
    },
  };
}
