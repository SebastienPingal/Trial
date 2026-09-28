import type { CSSProperties } from 'react';

// Placeholder faces until real character art exists. Keys are expression names.
const FACES: Record<string, string> = {
  neutral: '😐',
  convinced: '🙂',
  doubt: '🤨',
  shocked: '😱',
  confident: '😌',
  panic: '😰',
  impassive: '😶',
  suspicious: '🧐',
  attacking: '😠',
};

interface CharacterProps {
  name: string;
  role: string;
  portrait?: string;
  expression: string;
  intensity: number; // 0..1 — preview reactions are drawn at half strength
  caption?: string;
}

export function Character({ name, role, portrait, expression, intensity, caption }: CharacterProps) {
  const style = { '--intensity': intensity } as CSSProperties;
  return (
    <figure className={`character expr-${expression}`} style={style}>
      <div className="character-face" aria-label={expression}>
        {portrait && <span className="character-portrait">{portrait}</span>}
        <span className="character-expression">{FACES[expression] ?? FACES.neutral}</span>
      </div>
      <figcaption>
        <strong>{name}</strong>
        <span className="character-role">{role}</span>
        {caption && <span className="character-caption">{caption}</span>}
      </figcaption>
    </figure>
  );
}
