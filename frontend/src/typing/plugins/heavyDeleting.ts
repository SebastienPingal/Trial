import type { TypingEventPlugin } from '../types';

export interface HeavyDeletingOptions {
  burst: number; // characters erased in one uninterrupted burst
}

export function createHeavyDeleting({ burst }: HeavyDeletingOptions = { burst: 15 }): TypingEventPlugin {
  let erased = 0;
  return {
    kind: 'heavy-deleting',
    description: 'erased a large part of what they had written',
    effect: {
      evaluate: true,
      reaction: {
        jurors: { expression: 'doubt', intensity: 0.4 },
        lawyer: { expression: 'panic', intensity: 0.5 },
        prosecutor: { expression: 'suspicious', intensity: 0.6 },
        durationMs: 2000,
      },
    },
    reset() {
      erased = 0;
    },
    onInput(_metrics, { delta }) {
      if (delta >= 0) {
        erased = 0;
        return false;
      }
      erased -= delta;
      if (erased < burst) return false;
      erased = 0;
      return true;
    },
  };
}
