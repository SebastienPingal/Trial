import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluate } from '../api';
import { AnswerInput } from '../components/AnswerInput';
import { Courtroom } from '../components/Courtroom';
import { EvidenceFile } from '../components/EvidenceFile';
import { ObjectionBanner } from '../components/ObjectionBanner';
import { computeReactions, type CourtReaction } from '../game/reactions';
import {
  applyEventReaction,
  TYPING_EVENT_EFFECTS,
  type TypingEvent,
  type TypingEventEffect,
} from '../game/typingEvents';
import type { TurnRecord } from '../game/verdict';
import { useEventPreview } from '../hooks/useEventPreview';
import { useTypingTracker } from '../hooks/useTypingTracker';
import type { CaseView, Statement } from '../types';

type Phase = 'answering' | 'evaluating' | 'reacting';

interface TrialScreenProps {
  caseView: CaseView;
  onFinish: (turns: TurnRecord[]) => void;
}

export function TrialScreen({ caseView, onFinish }: TrialScreenProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [phase, setPhase] = useState<Phase>('answering');
  const [finalReaction, setFinalReaction] = useState<CourtReaction | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = caseView.prosecutorQuestions[questionIndex];
  const isLastQuestion = questionIndex === caseView.prosecutorQuestions.length - 1;

  const history = useMemo<Statement[]>(() => turns.map(({ question, answer }) => ({ question, answer })), [turns]);
  const base = useMemo(
    () => ({ caseId: caseView.id, history, questionIndex }),
    [caseView.id, history, questionIndex],
  );

  const { preview, requestPreview, invalidate } = useEventPreview();

  // Short-lived local reaction triggered by a typing event (hesitation, deleting…).
  const [eventOverlay, setEventOverlay] = useState<TypingEventEffect['reaction'] | null>(null);
  const overlayTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(overlayTimer.current), []);

  const handleTypingEvent = (event: TypingEvent) => {
    const effect = TYPING_EVENT_EFFECTS[event.kind];
    window.clearTimeout(overlayTimer.current);
    setEventOverlay(effect.reaction);
    overlayTimer.current = window.setTimeout(() => setEventOverlay(null), effect.reaction.durationMs);

    if (effect.evaluate && event.text.trim()) {
      requestPreview({ ...base, answer: event.text.trim(), typing: tracker.getSummary() });
    }
  };

  const tracker = useTypingTracker(phase === 'answering', handleTypingEvent);

  const handleAnswerChange = (value: string) => {
    setAnswer(value);
    tracker.track(value);
  };

  const previewReaction = preview && phase === 'answering' ? computeReactions(preview, 'preview') : null;
  const reaction =
    phase === 'reacting'
      ? finalReaction
      : eventOverlay && phase === 'answering'
        ? applyEventReaction(
            previewReaction,
            caseView.jurors.map((j) => j.id),
            eventOverlay,
          )
        : previewReaction;

  const handleSubmit = async () => {
    const text = answer.trim();
    invalidate();
    window.clearTimeout(overlayTimer.current);
    setEventOverlay(null);
    setPhase('evaluating');
    setError(null);
    try {
      const result = await evaluate({ ...base, answer: text, mode: 'final', typing: tracker.getSummary() });
      const courtReaction = computeReactions(result, 'final');
      setTurns((previous) => [...previous, { question, answer: text, result, action: courtReaction.prosecutor.action }]);
      setFinalReaction(courtReaction);
      if (courtReaction.prosecutor.action.kind === 'objection-evidence') setEvidenceOpen(true);
      setPhase('reacting');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
      setPhase('answering');
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onFinish(turns);
      return;
    }
    setQuestionIndex((i) => i + 1);
    setAnswer('');
    tracker.reset();
    setFinalReaction(null);
    setEvidenceOpen(false);
    setPhase('answering');
  };

  const action = finalReaction?.prosecutor.action;

  return (
    <main className="screen trial-screen">
      <header className="trial-header">
        <h1>{caseView.title}</h1>
        <span>
          Question {questionIndex + 1} / {caseView.prosecutorQuestions.length}
        </span>
      </header>

      <Courtroom jurors={caseView.jurors} reaction={reaction} question={question} />

      {phase === 'reacting' && action && (
        <ObjectionBanner action={action} evidence={caseView.evidence} history={history} />
      )}

      {phase === 'reacting' ? (
        <div className="submitted-answer">
          <p>
            <em>“{answer.trim()}”</em>
          </p>
          <button type="button" className="primary" onClick={handleNext}>
            {isLastQuestion ? 'The jury deliberates…' : 'Next question'}
          </button>
        </div>
      ) : (
        <AnswerInput value={answer} onChange={handleAnswerChange} onSubmit={handleSubmit} disabled={phase === 'evaluating'} />
      )}

      {error && <p className="error">{error}</p>}

      <EvidenceFile
        evidence={caseView.evidence}
        open={evidenceOpen}
        onToggle={() => setEvidenceOpen((o) => !o)}
        highlightId={action?.kind === 'objection-evidence' ? action.evidenceId : undefined}
      />
    </main>
  );
}
