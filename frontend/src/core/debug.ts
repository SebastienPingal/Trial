import {
  NEUTRAL_EXPRESSION,
  type CourtReaction,
  type Expression,
  type LawyerExpression,
  type ProsecutorAction,
  type ProsecutorExpression,
  type Reaction,
} from './reactions';
import type { ChoiceResult, EvaluationResult, ScoreResult } from './types';

export const JUROR_EXPRESSIONS: Expression[] = ['neutral', 'convinced', 'doubt', 'shocked'];
export const LAWYER_EXPRESSIONS: LawyerExpression[] = ['neutral', 'confident', 'panic'];
export const PROSECUTOR_EXPRESSIONS: ProsecutorExpression[] = ['impassive', 'suspicious', 'attacking'];

/** Forced faces, per character. Anything left out keeps the game's own reaction. */
export interface ReactionOverride {
  jurors?: Record<string, Reaction<Expression>>;
  lawyer?: Reaction<LawyerExpression>;
  prosecutor?: Reaction<ProsecutorExpression>;
}

/** Hand-picked evaluation scores, turned into a fake EvaluationResult by fakeEvaluation(). */
export interface FakeEvaluationParams {
  jurorScores: Record<string, number>; // 1..5
  confidence: number; // 0..1, applies to every score
  credibility: number; // 1..5
  evasiveness: number; // 1..5
  hurtsDefense: number; // 0..1
  evidenceContradiction: number; // 0..1
  contradictedEvidence: string; // evidence id or 'none'
  statementContradiction: number; // 0..1
  contradictedStatement: string; // 'S1', 'S2'… or 'none'
}

/**
 * Debug hooks into the engine, for the dev tools panel only.
 * They bypass the normal flow (and the backend) to reach any game situation quickly.
 */
export interface DebugController {
  // Faces
  setReactionOverride(override: ReactionOverride | null): void;
  flashReaction(override: ReactionOverride, durationMs: number): void;
  // Prosecutor
  triggerAction(action: ProsecutorAction): void;
  // Lawyer (null hides the whisper)
  showLawyerHint(hint: string | null): void;
  // Typing events
  typingEventKinds(): string[];
  fireTypingEvent(kind: string): void;
  // Flow
  goToQuestion(index: number): void;
  simulateAnswer(params: FakeEvaluationParams): void;
  showVerdict(): void;
}

export function mergeOverrides(...overrides: (ReactionOverride | null)[]): ReactionOverride | null {
  const present = overrides.filter((o): o is ReactionOverride => o !== null);
  if (present.length === 0) return null;
  return present.reduce<ReactionOverride>(
    (acc, o) => ({
      jurors: { ...acc.jurors, ...o.jurors },
      lawyer: o.lawyer ?? acc.lawyer,
      prosecutor: o.prosecutor ?? acc.prosecutor,
    }),
    {},
  );
}

export function applyReactionOverride(
  base: CourtReaction | null,
  jurorIds: string[],
  override: ReactionOverride,
): CourtReaction {
  const jurors: CourtReaction['jurors'] = {};
  for (const id of jurorIds) {
    jurors[id] = override.jurors?.[id] ?? base?.jurors[id] ?? NEUTRAL_EXPRESSION;
  }
  const prosecutor = base?.prosecutor ?? { expression: 'impassive', intensity: 0, action: { kind: 'none' } };
  return {
    jurors,
    lawyer: override.lawyer ?? base?.lawyer ?? { expression: 'neutral', intensity: 0 },
    prosecutor: override.prosecutor ? { ...override.prosecutor, action: prosecutor.action } : prosecutor,
  };
}

function fakeScore(value: number, confidence: number): ScoreResult {
  const probabilities: Record<string, number> = {};
  for (let k = 1; k <= 5; k++) probabilities[String(k)] = k === Math.round(value) ? confidence : (1 - confidence) / 4;
  return { value, probabilities, confidence };
}

function fakeChoice(value: string): ChoiceResult {
  return { value, probabilities: { [value]: 1 }, confidence: 1 };
}

export function fakeEvaluation(p: FakeEvaluationParams): EvaluationResult {
  const jurors: Record<string, ScoreResult> = {};
  for (const [id, score] of Object.entries(p.jurorScores)) jurors[id] = fakeScore(score, p.confidence);
  return {
    credibility: fakeScore(p.credibility, p.confidence),
    statementContradiction: { probability: p.statementContradiction },
    evidenceContradiction: { probability: p.evidenceContradiction },
    contradictedEvidence: fakeChoice(p.contradictedEvidence),
    contradictedStatement: fakeChoice(p.contradictedStatement),
    evasiveness: fakeScore(p.evasiveness, p.confidence),
    hurtsDefense: { probability: p.hurtsDefense },
    jurors,
    evaluator: 'debug',
    model: 'debug',
    latencyMs: 0,
  };
}
