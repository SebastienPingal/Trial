// Mirrors backend/app/schemas.py (camelCase on the wire).

export interface Evidence {
  id: string;
  name: string;
  description: string;
}

export interface Juror {
  id: string;
  name: string;
  portrait: string;
  description: string;
}

export interface CaseSummary {
  id: string;
  title: string;
}

export interface CaseView {
  id: string;
  title: string;
  situation: string;
  evidence: Evidence[];
  prosecutorQuestions: string[];
  jurors: Juror[];
}

export interface Statement {
  question: string;
  answer: string;
}

export type EvaluationMode = 'preview' | 'final';

export interface EvaluationRequest {
  caseId: string;
  history: Statement[];
  questionIndex: number;
  answer: string;
  mode: EvaluationMode;
}

export interface ScoreResult {
  value: number;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ChoiceResult {
  value: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ProbabilityResult {
  probability: number;
}

export interface EvaluationResult {
  credibility: ScoreResult;
  statementContradiction: ProbabilityResult;
  evidenceContradiction: ProbabilityResult;
  contradictedEvidence: ChoiceResult;
  contradictedStatement: ChoiceResult;
  evasiveness: ScoreResult;
  hurtsDefense: ProbabilityResult;
  jurors: Record<string, ScoreResult>;
  evaluator: string;
  model: string;
  latencyMs: number;
}
