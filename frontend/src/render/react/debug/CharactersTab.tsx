import { useState } from 'react';
import {
  JUROR_EXPRESSIONS,
  LAWYER_EXPRESSIONS,
  PROSECUTOR_EXPRESSIONS,
  type ReactionOverride,
} from '../../../core/debug';
import type { Expression, LawyerExpression, ProsecutorExpression, Reaction } from '../../../core/reactions';
import { useGame } from '../gameContext';
import type { TabProps } from './DebugPanel';

const AUTO = '';
const PLACEHOLDER = '-';

interface Row {
  expression: string; // AUTO = keep the game's reaction
  intensity: number;
}

const autoRow = (): Row => ({ expression: AUTO, intensity: 1 });

export function CharactersTab({ state }: TabProps) {
  const game = useGame();
  const jurors = state.caseView?.jurors ?? [];
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [flashMs, setFlashMs] = useState(1500);
  const [locked, setLocked] = useState(false);

  const characters = [
    ...jurors.map((j) => ({ key: `juror:${j.id}`, label: j.name, expressions: JUROR_EXPRESSIONS as string[] })),
    { key: 'lawyer', label: 'Your lawyer', expressions: LAWYER_EXPRESSIONS as string[] },
    { key: 'prosecutor', label: 'Prosecutor', expressions: PROSECUTOR_EXPRESSIONS as string[] },
  ];

  const buildOverride = (from: Record<string, Row>): ReactionOverride => {
    const pick = (key: string) => {
      const row = from[key];
      return row && row.expression !== AUTO ? { expression: row.expression, intensity: row.intensity } : undefined;
    };
    const jurorFaces: Record<string, Reaction<Expression>> = {};
    for (const j of jurors) {
      const face = pick(`juror:${j.id}`);
      if (face) jurorFaces[j.id] = face as Reaction<Expression>;
    }
    return {
      jurors: jurorFaces,
      lawyer: pick('lawyer') as Reaction<LawyerExpression> | undefined,
      prosecutor: pick('prosecutor') as Reaction<ProsecutorExpression> | undefined,
    };
  };

  const update = (key: string, patch: Partial<Row>) => {
    const next = { ...rows, [key]: { ...(rows[key] ?? autoRow()), ...patch } };
    setRows(next);
    if (locked) game.debug.setReactionOverride(buildOverride(next));
  };

  const setAllJurors = (expression: string) => {
    const next = { ...rows };
    for (const j of jurors) next[`juror:${j.id}`] = { ...(rows[`juror:${j.id}`] ?? autoRow()), expression };
    setRows(next);
    if (locked) game.debug.setReactionOverride(buildOverride(next));
  };

  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    game.debug.setReactionOverride(next ? buildOverride(rows) : null);
  };

  const reset = () => {
    setRows({});
    if (locked) game.debug.setReactionOverride(buildOverride({}));
  };

  if (!state.caseView) return <p className="debug-hint">Waiting for the case to load…</p>;

  return (
    <div className="debug-section">
      <p className="debug-hint">
        Pick faces, then <b>Flash</b> them briefly or <b>Lock</b> them on top of the game's reactions. “auto” keeps
        the game's own face.
      </p>

      <div className="debug-row">
        <span className="debug-label">All jurors</span>
        <select value={PLACEHOLDER} onChange={(e) => setAllJurors(e.target.value)}>
          <option value={PLACEHOLDER} disabled>
            set…
          </option>
          <option value={AUTO}>auto</option>
          {JUROR_EXPRESSIONS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      {characters.map(({ key, label, expressions }) => {
        const row = rows[key] ?? autoRow();
        return (
          <div className="debug-row" key={key}>
            <span className="debug-label">{label}</span>
            <select value={row.expression} onChange={(e) => update(key, { expression: e.target.value })}>
              <option value={AUTO}>auto</option>
              {expressions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={row.intensity}
              disabled={row.expression === AUTO}
              onChange={(e) => update(key, { intensity: Number(e.target.value) })}
            />
            <span className="debug-value">{row.intensity.toFixed(2)}</span>
          </div>
        );
      })}

      <div className="debug-actions">
        <button type="button" onClick={() => game.debug.flashReaction(buildOverride(rows), flashMs)}>
          Flash
        </button>
        <label className="debug-inline">
          <input type="number" min={100} step={100} value={flashMs} onChange={(e) => setFlashMs(Number(e.target.value))} />
          ms
        </label>
        <button type="button" className={locked ? 'active' : ''} onClick={toggleLock}>
          {locked ? '🔒 Locked' : 'Lock'}
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
