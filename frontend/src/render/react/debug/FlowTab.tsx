import { useState } from 'react';
import type { FakeEvaluationParams } from '../../../core/debug';
import { useGame } from '../gameContext';
import type { TabProps } from './DebugPanel';

type Scores = Omit<FakeEvaluationParams, 'jurorScores'> & { juror: number };

const NEUTRAL: Scores = {
  juror: 3,
  confidence: 0.9,
  credibility: 3,
  evasiveness: 1,
  hurtsDefense: 0.3,
  evidenceContradiction: 0,
  contradictedEvidence: 'none',
  statementContradiction: 0,
  contradictedStatement: 'none',
};

const PRESETS: Record<string, Partial<Scores>> = {
  Convincing: { juror: 5, credibility: 5, hurtsDefense: 0.05 },
  Doubtful: { juror: 1.5, credibility: 2, hurtsDefense: 0.4 },
  Damaging: { juror: 1.5, credibility: 1.5, hurtsDefense: 0.9 },
  Evasive: { juror: 2.5, evasiveness: 5 },
  'Low confidence': { juror: 5, confidence: 0.3 },
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="debug-row">
      <span className="debug-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="debug-value">{value.toFixed(2)}</span>
    </div>
  );
}

export function FlowTab({ state }: TabProps) {
  const game = useGame();
  const caseView = state.caseView;
  const [scores, setScores] = useState<Scores>(NEUTRAL);
  const [jurorScores, setJurorScores] = useState<Record<string, number>>({});

  if (!caseView) return <p className="debug-hint">Waiting for the case to load…</p>;

  const set = (patch: Partial<Scores>) => setScores((s) => ({ ...s, ...patch }));
  const applyPreset = (preset: Partial<Scores>) => {
    setScores({ ...NEUTRAL, ...preset });
    setJurorScores({});
  };
  const jurorScore = (id: string) => jurorScores[id] ?? scores.juror;

  const simulate = () => {
    const { juror, ...rest } = scores;
    const all = Object.fromEntries(caseView.jurors.map((j) => [j.id, jurorScore(j.id)]));
    game.debug.simulateAnswer({ ...rest, jurorScores: all });
  };

  return (
    <div className="debug-section">
      <h4>Questions</h4>
      <div className="debug-actions">
        {caseView.prosecutorQuestions.map((q, i) => (
          <button
            key={i}
            type="button"
            title={q}
            className={state.phase !== 'intro' && state.phase !== 'verdict' && i === state.questionIndex ? 'active' : ''}
            onClick={() => game.debug.goToQuestion(i)}
          >
            Q{i + 1}
          </button>
        ))}
      </div>
      <div className="debug-actions">
        <button type="button" disabled={state.phase !== 'reacting'} onClick={() => game.next()}>
          Next ▶
        </button>
        <button type="button" onClick={() => game.debug.showVerdict()}>
          Verdict now
        </button>
        <button type="button" onClick={() => game.restart()}>
          Restart
        </button>
      </div>
      <p className="debug-hint">Jumping to Qn keeps only the first n−1 answers.</p>

      <h4>Simulate an answer</h4>
      <p className="debug-hint">
        Submits the current text (or a placeholder) with these scores instead of calling the backend. Reactions,
        objections and the verdict are computed by the real game rules.
      </p>
      <div className="debug-actions">
        {Object.entries(PRESETS).map(([name, preset]) => (
          <button key={name} type="button" onClick={() => applyPreset(preset)}>
            {name}
          </button>
        ))}
      </div>

      <Slider label="All jurors" value={scores.juror} min={1} max={5} step={0.1} onChange={(juror) => {
        set({ juror });
        setJurorScores({});
      }} />
      {caseView.jurors.map((j) => (
        <Slider
          key={j.id}
          label={`· ${j.name}`}
          value={jurorScore(j.id)}
          min={1}
          max={5}
          step={0.1}
          onChange={(v) => setJurorScores((s) => ({ ...s, [j.id]: v }))}
        />
      ))}
      <Slider label="Confidence" value={scores.confidence} min={0} max={1} step={0.05} onChange={(confidence) => set({ confidence })} />
      <Slider label="Credibility" value={scores.credibility} min={1} max={5} step={0.1} onChange={(credibility) => set({ credibility })} />
      <Slider label="Evasiveness" value={scores.evasiveness} min={1} max={5} step={0.1} onChange={(evasiveness) => set({ evasiveness })} />
      <Slider label="Hurts defense" value={scores.hurtsDefense} min={0} max={1} step={0.05} onChange={(hurtsDefense) => set({ hurtsDefense })} />

      <Slider
        label="Evidence contrad."
        value={scores.evidenceContradiction}
        min={0}
        max={1}
        step={0.05}
        onChange={(evidenceContradiction) => set({ evidenceContradiction })}
      />
      <div className="debug-row">
        <span className="debug-label">· which</span>
        <select value={scores.contradictedEvidence} onChange={(e) => set({ contradictedEvidence: e.target.value })}>
          <option value="none">none</option>
          {caseView.evidence.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id} — {item.name}
            </option>
          ))}
        </select>
      </div>

      <Slider
        label="Statement contrad."
        value={scores.statementContradiction}
        min={0}
        max={1}
        step={0.05}
        onChange={(statementContradiction) => set({ statementContradiction })}
      />
      <div className="debug-row">
        <span className="debug-label">· which</span>
        <select value={scores.contradictedStatement} onChange={(e) => set({ contradictedStatement: e.target.value })}>
          <option value="none">none</option>
          {state.turns.map((turn, i) => (
            <option key={i} value={`S${i + 1}`}>
              S{i + 1} — {turn.answer.slice(0, 40)}
            </option>
          ))}
        </select>
      </div>

      <div className="debug-actions">
        <button type="button" className="active" disabled={state.phase !== 'answering'} onClick={simulate}>
          Submit simulated answer
        </button>
      </div>
    </div>
  );
}
