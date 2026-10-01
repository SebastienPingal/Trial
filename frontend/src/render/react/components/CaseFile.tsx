import { useState } from 'react';
import type { Evidence, Statement } from '../../../core/types';
import { Placeholder } from './Placeholder';

interface CaseFileProps {
  title: string;
  evidence: Evidence[];
  statements: Statement[];
  highlightEvidenceId?: string;
  highlightStatementIndex?: number;
}

/** Exhibits and the player's previous statements. Click an entry to read it. */
export function CaseFile({ title, evidence, statements, highlightEvidenceId, highlightStatementIndex }: CaseFileProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  return (
    <aside className="case-file hud-panel">
      <h1 className="case-title">{title}</h1>

      <h2 className="case-heading">Exhibits</h2>
      <ul className="case-list">
        {evidence.map((item) => (
          <li key={item.id} className={item.id === highlightEvidenceId ? 'highlight' : ''}>
            <button type="button" className="case-entry" onClick={() => toggle(item.id)}>
              <Placeholder className="exhibit-thumb" label={item.id} />
              <span className="case-entry-id">{item.id}</span>
              <span className="case-entry-name">{item.name}</span>
            </button>
            {openId === item.id && <p className="case-entry-detail">{item.description}</p>}
          </li>
        ))}
      </ul>

      <h2 className="case-heading">Your statements</h2>
      <ul className="case-list">
        {statements.length === 0 && <li className="case-empty">…</li>}
        {statements.map((statement, index) => {
          const id = `Q${index + 1}`;
          return (
            <li key={id} className={index === highlightStatementIndex ? 'highlight' : ''}>
              <button type="button" className="case-entry" onClick={() => toggle(id)}>
                <span className="case-entry-id">{id}</span>
                <span className="case-entry-name">{statement.question}</span>
              </button>
              {openId === id && <p className="case-entry-detail">“{statement.answer}”</p>}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
