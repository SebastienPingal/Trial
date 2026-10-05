import { useEffect, useState } from 'react';
import type { GameState } from '../../../core/state';
import { useGame, useGameState } from '../gameContext';
import { CharactersTab } from './CharactersTab';
import { EventLog } from './EventLog';
import { FlowTab } from './FlowTab';
import { LawyerTab } from './LawyerTab';
import { ProsecutorTab } from './ProsecutorTab';
import { TypingTab } from './TypingTab';
import './debug.css';

const TABS = ['Characters', 'Prosecutor', 'Lawyer', 'Typing', 'Flow', 'Log'] as const;
type Tab = (typeof TABS)[number];

export interface TabProps {
  state: GameState;
}

/** Dev-only tools to trigger reactions, objections, typing events and jump through the trial. Toggle with `. */
export function DebugPanel() {
  const game = useGame();
  const state = useGameState();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('Characters');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`') return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) {
    return (
      <button type="button" className="debug-toggle" onClick={() => setOpen(true)} title="Debug tools (`)">
        🐞
      </button>
    );
  }

  return (
    <aside className="debug-panel">
      <header className="debug-header">
        <strong>Debug</strong>
        <span className="debug-phase">
          {state.phase}
          {state.caseView && ` · Q${state.questionIndex + 1}/${state.caseView.prosecutorQuestions.length}`}
          {` · ${state.turns.length} turn(s)`}
        </span>
        <button type="button" onClick={() => setOpen(false)} title="Close (`)">
          ✕
        </button>
      </header>
      <nav className="debug-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <div className="debug-body">
        {tab === 'Characters' && <CharactersTab state={state} />}
        {tab === 'Prosecutor' && <ProsecutorTab state={state} />}
        {tab === 'Lawyer' && <LawyerTab state={state} />}
        {tab === 'Typing' && <TypingTab state={state} />}
        {tab === 'Flow' && <FlowTab state={state} />}
        {/* Always mounted so it records events while another tab is shown. */}
        <EventLog bus={game.bus} hidden={tab !== 'Log'} />
      </div>
    </aside>
  );
}
