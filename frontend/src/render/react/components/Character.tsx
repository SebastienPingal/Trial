import type { CSSProperties, ReactNode } from 'react';
import { Placeholder } from './Placeholder';

interface CharacterProps {
  name: string;
  expression: string;
  intensity: number; // 0..1 — preview reactions are drawn at half strength
  overlay?: ReactNode; // drawn above the character (e.g. the "Objection!" burst)
}

/** A character sprite. The placeholder will be replaced by one image per expression. */
export function Character({ name, expression, intensity, overlay }: CharacterProps) {
  const style = { '--intensity': intensity } as CSSProperties;
  return (
    <figure className={`character expr-${expression}`} style={style}>
      <Placeholder className="character-sprite" label={`${name} · ${expression}`} />
      {overlay}
    </figure>
  );
}
