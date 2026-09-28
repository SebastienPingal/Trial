// Composition root: this is where the swappable modules are chosen.
import { HttpCourtApi } from './api';
import { GameEngine } from './core';
import { ReactRenderer } from './render/react/ReactRenderer';
import type { Renderer } from './render/types';
import { defaultTypingPlugins } from './typing';

const engine = new GameEngine({
  api: new HttpCourtApi('/api'), // backend access
  typingPlugins: defaultTypingPlugins(), // typing events
});

const renderer: Renderer = new ReactRenderer(); // rendering engine
renderer.mount(document.getElementById('root')!, engine);

void engine.load();
