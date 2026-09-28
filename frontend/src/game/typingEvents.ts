import type { CourtReaction, Expression, LawyerExpression, ProsecutorExpression, Reaction } from './reactions';

// Behavioral events detected while the player types their answer.
export type TypingEventKind = 'heavy-deleting' | 'long-hesitation' | 'rushing';

export interface TypingEvent {
  kind: TypingEventKind;
  atMs: number; // time since the question was shown
  text: string; // answer text when the event fired
}

// Sent to the backend with each evaluation so Jev can factor in the defendant's demeanor.
export interface TypingSummary {
  durationMs: number;
  timeToFirstKeyMs: number | null;
  charsTyped: number;
  charsDeleted: number;
  longestPauseMs: number;
  charsPerSecond: number;
  events: TypingEventKind[];
}

// Detection thresholds — tune them with real playthroughs.
export const TYPING_THRESHOLDS = {
  heavyDeleteBurst: 15, // characters erased in one uninterrupted burst
  hesitationMs: 5000, // idle time mid-answer
  hesitationBeforeStartMs: 8000, // idle time before the first keystroke
  rushingCharsPerSecond: 7,
  rushingMinChars: 25,
} as const;

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

// One place to define what each event does. Add new events here.
export const TYPING_EVENT_EFFECTS: Record<TypingEventKind, TypingEventEffect> = {
  'heavy-deleting': {
    evaluate: true,
    reaction: {
      jurors: { expression: 'doubt', intensity: 0.4 },
      lawyer: { expression: 'panic', intensity: 0.5 },
      prosecutor: { expression: 'suspicious', intensity: 0.6 },
      durationMs: 2000,
    },
  },
  'long-hesitation': {
    evaluate: false,
    reaction: {
      jurors: { expression: 'doubt', intensity: 0.3 },
      prosecutor: { expression: 'suspicious', intensity: 0.5 },
      durationMs: 2500,
    },
  },
  rushing: {
    evaluate: false,
    reaction: {
      prosecutor: { expression: 'suspicious', intensity: 0.4 },
      durationMs: 1500,
    },
  },
};

// Overlays an event's local reaction on top of the current faces.
export function applyEventReaction(
  base: CourtReaction | null,
  jurorIds: string[],
  reaction: TypingEventEffect['reaction'],
): CourtReaction {
  const jurors: CourtReaction['jurors'] = {};
  for (const id of jurorIds) {
    jurors[id] = reaction.jurors ?? base?.jurors[id] ?? { expression: 'neutral', intensity: 0 };
  }
  return {
    jurors,
    lawyer: reaction.lawyer ?? base?.lawyer ?? { expression: 'neutral', intensity: 0 },
    prosecutor: {
      ...(reaction.prosecutor ?? base?.prosecutor ?? { expression: 'impassive', intensity: 0 }),
      action: { kind: 'none' },
    },
  };
}
