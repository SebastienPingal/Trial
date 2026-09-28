import type { CaseView } from '../types';

interface IntroScreenProps {
  caseView: CaseView;
  onStart: () => void;
}

export function IntroScreen({ caseView, onStart }: IntroScreenProps) {
  return (
    <main className="screen intro-screen">
      <h1>{caseView.title}</h1>
      <p className="situation">{caseView.situation}</p>

      <h2>Evidence known to the court</h2>
      <ul className="evidence-list">
        {caseView.evidence.map((item) => (
          <li key={item.id}>
            <span className="evidence-id">{item.id}</span> <strong>{item.name}</strong> — {item.description}
          </li>
        ))}
      </ul>

      <p className="hint">
        You don't have to tell the truth — but your story must never contradict the evidence or your own previous
        statements. The jury is watching.
      </p>

      <button type="button" className="primary" onClick={onStart}>
        Enter the courtroom
      </button>
    </main>
  );
}
