import type { CourtReaction, ProsecutorAction } from './reactions';
import type { CaseView, EvaluationMode, EvaluationResult } from './types';
import type { TurnRecord, Verdict } from './verdict';
import type { TypingEvent } from '../typing/types';

export type Phase = 'loading' | 'error' | 'intro' | 'answering' | 'evaluating' | 'reacting' | 'verdict';

/** Everything a renderer needs to draw the game. Immutable: a new object on every change. */
export interface GameState {
  phase: Phase;
  error: string | null;
  caseView: CaseView | null;
  questionIndex: number;
  question: string | null;
  isLastQuestion: boolean;
  answer: string;
  turns: TurnRecord[];
  reaction: CourtReaction | null; // faces to display right now (preview, event overlay or final)
  action: ProsecutorAction | null; // prosecutor action after the last submitted answer
  lawyerHint: string | null; // what the lawyer whispers after the last submitted answer
  verdict: Verdict | null;
}

export const initialState: GameState = {
  phase: 'loading',
  error: null,
  caseView: null,
  questionIndex: 0,
  question: null,
  isLastQuestion: false,
  answer: '',
  turns: [],
  reaction: null,
  action: null,
  lawyerHint: null,
  verdict: null,
};

/** Events published on the engine's bus. Renderers, audio, analytics… can subscribe. */
export interface GameEvents {
  'state:changed': GameState;
  'typing:event': TypingEvent;
  'evaluation:received': { mode: EvaluationMode; result: EvaluationResult };
  'prosecutor:action': ProsecutorAction;
  'lawyer:hint': string;
  verdict: Verdict;
}
