import type { EvaluationMode, EvaluationResult, ScoreResult } from '../types';

// Starting thresholds from the spec — tune them with real playthroughs.
export const THRESHOLDS = {
  jurorConvinced: 4,
  jurorDoubt: 2,
  jurorShockedContradiction: 0.7,
  lawyerPanic: 0.6,
  objectionEvidence: 0.75,
  objectionStatement: 0.75,
  evasive: 4,
  // Below this confidence, a reaction is shown subdued instead of clear-cut.
  lowConfidence: 0.45,
} as const;

const PREVIEW_INTENSITY = 0.5;
const LOW_CONFIDENCE_FACTOR = 0.6;

export type Expression = 'neutral' | 'convinced' | 'doubt' | 'shocked';
export type LawyerExpression = 'neutral' | 'confident' | 'panic';
export type ProsecutorExpression = 'impassive' | 'suspicious' | 'attacking';

export type ProsecutorAction =
  | { kind: 'none' }
  | { kind: 'objection-evidence'; evidenceId: string }
  | { kind: 'objection-statement'; statementIndex: number } // 0-based index in history
  | { kind: 'answer-the-question' };

export interface Reaction<E> {
  expression: E;
  intensity: number; // 0..1, drives how pronounced the animation is
}

export interface CourtReaction {
  jurors: Record<string, Reaction<Expression>>;
  lawyer: Reaction<LawyerExpression>;
  prosecutor: Reaction<ProsecutorExpression> & { action: ProsecutorAction };
}

export const NEUTRAL_EXPRESSION: Reaction<Expression> = { expression: 'neutral', intensity: 0 };

function jurorReaction(score: ScoreResult, contradiction: number, base: number): Reaction<Expression> {
  const intensity = score.confidence < THRESHOLDS.lowConfidence ? base * LOW_CONFIDENCE_FACTOR : base;
  if (score.value <= THRESHOLDS.jurorDoubt) {
    const shocked = contradiction > THRESHOLDS.jurorShockedContradiction;
    return { expression: shocked ? 'shocked' : 'doubt', intensity };
  }
  if (score.value >= THRESHOLDS.jurorConvinced) {
    return { expression: 'convinced', intensity };
  }
  return { expression: 'neutral', intensity };
}

function prosecutorAction(result: EvaluationResult, mode: EvaluationMode): ProsecutorAction {
  // Objections only on submit, never in preview: don't interrupt the player mid-sentence.
  if (mode === 'preview') return { kind: 'none' };

  const evidenceId = result.contradictedEvidence.value;
  if (result.evidenceContradiction.probability > THRESHOLDS.objectionEvidence && evidenceId !== 'none') {
    return { kind: 'objection-evidence', evidenceId };
  }

  const statementId = result.contradictedStatement.value;
  if (result.statementContradiction.probability > THRESHOLDS.objectionStatement && statementId !== 'none') {
    return { kind: 'objection-statement', statementIndex: Number(statementId.slice(1)) - 1 };
  }

  if (result.evasiveness.value >= THRESHOLDS.evasive) {
    return { kind: 'answer-the-question' };
  }
  return { kind: 'none' };
}

export function computeReactions(result: EvaluationResult, mode: EvaluationMode): CourtReaction {
  const base = mode === 'preview' ? PREVIEW_INTENSITY : 1;
  const contradiction = Math.max(result.evidenceContradiction.probability, result.statementContradiction.probability);

  const jurors: Record<string, Reaction<Expression>> = {};
  for (const [id, score] of Object.entries(result.jurors)) {
    jurors[id] = jurorReaction(score, contradiction, base);
  }

  const hurts = result.hurtsDefense.probability;
  const lawyer: Reaction<LawyerExpression> =
    hurts > THRESHOLDS.lawyerPanic
      ? { expression: 'panic', intensity: base }
      : hurts < 0.2
        ? { expression: 'confident', intensity: base * 0.6 }
        : { expression: 'neutral', intensity: 0 };

  const action = prosecutorAction(result, mode);
  const prosecutorExpression: ProsecutorExpression =
    action.kind !== 'none' ? 'attacking' : contradiction > 0.5 ? 'suspicious' : 'impassive';

  return {
    jurors,
    lawyer,
    prosecutor: { expression: prosecutorExpression, intensity: base, action },
  };
}
