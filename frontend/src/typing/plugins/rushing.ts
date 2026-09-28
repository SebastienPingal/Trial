import type { TypingEventPlugin } from '../types';

export interface RushingOptions {
  charsPerSecond: number;
  minChars: number;
}

export function createRushing(
  { charsPerSecond, minChars }: RushingOptions = { charsPerSecond: 7, minChars: 25 },
): TypingEventPlugin {
  let fired = false; // once per answer
  return {
    kind: 'rushing',
    description: 'typed unusually fast',
    effect: {
      evaluate: false,
      reaction: {
        prosecutor: { expression: 'suspicious', intensity: 0.4 },
        durationMs: 1500,
      },
    },
    reset() {
      fired = false;
    },
    onInput(metrics, { now, delta }) {
      if (fired || delta <= 0 || metrics.firstKeyAt === null) return false;
      const seconds = (now - metrics.firstKeyAt) / 1000;
      if (metrics.charsTyped < minChars || seconds <= 0 || metrics.charsTyped / seconds <= charsPerSecond) {
        return false;
      }
      fired = true;
      return true;
    },
  };
}
