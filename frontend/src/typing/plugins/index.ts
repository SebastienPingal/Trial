import type { TypingEventPlugin } from '../types';
import { createHeavyDeleting } from './heavyDeleting';
import { createLongHesitation } from './longHesitation';
import { createRushing } from './rushing';

export { createHeavyDeleting, createLongHesitation, createRushing };

/** The typing events active in the game. Add or remove a plugin here. */
export function defaultTypingPlugins(): TypingEventPlugin[] {
  return [createHeavyDeleting(), createLongHesitation(), createRushing()];
}
