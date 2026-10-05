import { useState } from 'react';
import { LAWYER_LINES } from '../../../core/lawyer';
import { useGame } from '../gameContext';
import type { TabProps } from './DebugPanel';

type Category = keyof typeof LAWYER_LINES;

export function LawyerTab({ state }: TabProps) {
  const game = useGame();
  const jurors = state.caseView?.jurors ?? [];
  const [jurorId, setJurorId] = useState(jurors[0]?.id ?? '');
  const [custom, setCustom] = useState('');
  const inTrial = state.phase === 'answering' || state.phase === 'evaluating' || state.phase === 'reacting';
  const name = jurors.find((j) => j.id === jurorId)?.name ?? '';

  return (
    <div className="debug-section">
      <p className="debug-hint">
        Shows a whisper above the lawyer until the next question. {!inTrial && <b>Start a question first (Flow tab).</b>}
      </p>

      <div className="debug-row">
        <span className="debug-label">Juror for {'{name}'}</span>
        <select value={jurorId} onChange={(e) => setJurorId(e.target.value)}>
          {jurors.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>

      {(Object.keys(LAWYER_LINES) as Category[]).map((category) => (
        <div key={category}>
          <h4>{category}</h4>
          {LAWYER_LINES[category].map((line) => {
            const text = line.replace('{name}', name);
            return (
              <div className="debug-actions" key={line}>
                <button type="button" disabled={!inTrial} onClick={() => game.debug.showLawyerHint(text)}>
                  {text}
                </button>
              </div>
            );
          })}
        </div>
      ))}

      <h4>Custom</h4>
      <div className="debug-row">
        <input
          className="debug-text"
          type="text"
          value={custom}
          placeholder="Anything the lawyer should whisper…"
          onChange={(e) => setCustom(e.target.value)}
        />
        <button type="button" disabled={!inTrial || !custom.trim()} onClick={() => game.debug.showLawyerHint(custom.trim())}>
          Show
        </button>
      </div>

      <div className="debug-actions">
        <button type="button" disabled={!state.lawyerHint} onClick={() => game.debug.showLawyerHint(null)}>
          Hide whisper
        </button>
      </div>
    </div>
  );
}
