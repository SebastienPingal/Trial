import type { GameController } from '../core/engine';

/**
 * A rendering engine. It draws `game.getState()`, listens to `game.bus`
 * for state changes and one-shot effects (typing events, objections, verdict),
 * and forwards player input through the controller methods.
 *
 * Implementations: render/react (DOM + React). A canvas/WebGL renderer
 * (PixiJS, Phaser, Three…) would implement the same interface.
 */
export interface Renderer {
  mount(container: HTMLElement, game: GameController): void;
  destroy(): void;
}
