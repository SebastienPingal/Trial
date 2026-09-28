import type { Expression, LawyerExpression, ProsecutorExpression, Reaction } from '../core/reactions';

// Measurements shared by all typing plugins, maintained by the TypingTracker.
export interface TypingMetrics {
  shownAt: number; // when the question was shown
  firstKeyAt: number | null;
  lastKeyAt: number | null;
  text: string;
  charsTyped: number;
  charsDeleted: number;
  longestPauseMs: number;
}

export interface TextChange {
  now: number;
  delta: number; // characters added (> 0) or removed (< 0)
  previousText: string;
  pauseMs: number | null; // time since the previous keystroke
}

export interface TypingEventEffect {
  // Whether this event sends the current partial answer to the evaluator.
  evaluate: boolean;
  // Instant local reaction, shown for durationMs on top of the current faces.
  reaction: {
    jurors?: Reaction<Expression>;
    lawyer?: Reaction<LawyerExpression>;
    prosecutor?: Reaction<ProsecutorExpression>;
    durationMs: number;
  };
}

/**
 * A typing event plugin: detection + effect, self-contained in one file.
 * Plugins keep their own state; the tracker calls reset() for each new answer.
 */
export interface TypingEventPlugin {
  kind: string;
  // Plain-language description sent to Jev as part of the defendant's demeanor.
  description: string;
  effect: TypingEventEffect;
  reset(): void;
  // Called on every text change. Return true to fire the event.
  onInput?(metrics: TypingMetrics, change: TextChange): boolean;
  // Called periodically while the player is answering. Return true to fire the event.
  onTick?(metrics: TypingMetrics, now: number): boolean;
}

export interface TypingEvent {
  kind: string;
  atMs: number; // time since the question was shown
  text: string; // answer text when the event fired
  effect: TypingEventEffect;
}

// Sent to the backend with each evaluation so Jev can factor in the defendant's demeanor.
export interface TypingSummary {
  durationMs: number;
  timeToFirstKeyMs: number | null;
  charsTyped: number;
  charsDeleted: number;
  longestPauseMs: number;
  charsPerSecond: number;
  events: { kind: string; description: string }[];
}
