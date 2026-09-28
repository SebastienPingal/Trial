import type { Evidence } from '../../../core/types';

interface EvidenceFileProps {
  evidence: Evidence[];
  open: boolean;
  onToggle: () => void;
  highlightId?: string;
}

export function EvidenceFile({ evidence, open, onToggle, highlightId }: EvidenceFileProps) {
  return (
    <aside className={`evidence-file ${open ? 'open' : ''}`}>
      <button type="button" className="evidence-toggle" onClick={onToggle}>
        {open ? 'Close case file' : `Case file (${evidence.length})`}
      </button>
      {open && (
        <ul>
          {evidence.map((item) => (
            <li key={item.id} className={item.id === highlightId ? 'highlight' : ''}>
              <span className="evidence-id">{item.id}</span>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
