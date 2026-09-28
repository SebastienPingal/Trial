import type { CourtApi } from '../api/types';
import { TypingTracker } from '../typing/tracker';
import type { TypingEvent, TypingEventEffect, TypingEventPlugin } from '../typing/types';
import { EventBus } from './eventBus';
import { applyOverlay, computeReactions, type CourtReaction } from './reactions';
import { initialState, type GameEvents, type GameState } from './state';
import type { EvaluationRequest } from './types';
import { computeVerdict } from './verdict';

const TICK_MS = 500;

export interface EngineOptions {
  api: CourtApi;
  typingPlugins: TypingEventPlugin[];
}

/** What a renderer is allowed to use: read state, subscribe, send player input. */
export interface GameController {
  readonly bus: EventBus<GameEvents>;
  getState(): GameState;
  start(): void;
  input(text: string): void;
  submit(): Promise<void>;
  next(): void;
  restart(): void;
}

/**
 * Headless game engine: trial flow, evaluations, reactions and verdict.
 * No UI code here — renderers read `getState()` and listen to the bus.
 */
export class GameEngine implements GameController {
  readonly bus = new EventBus<GameEvents>();
  private state: GameState = initialState;
  private readonly api: CourtApi;
  private readonly tracker: TypingTracker;

  private previewReaction: CourtReaction | null = null;
  private overlay: TypingEventEffect['reaction'] | null = null;
  private overlayTimer: number | undefined;
  private tickTimer: number | undefined;
  private previewSeq = 0; // numbers preview requests; stale responses are dropped

  constructor({ api, typingPlugins }: EngineOptions) {
    this.api = api;
    this.tracker = new TypingTracker(typingPlugins, (event) => this.onTypingEvent(event));
  }

  getState(): GameState {
    return this.state;
  }

  async load(): Promise<void> {
    try {
      // Only one case for now: load the first available.
      const cases = await this.api.fetchCases();
      if (cases.length === 0) throw new Error('No case available');
      const caseView = await this.api.fetchCase(cases[0].id);
      this.setState({ caseView, phase: 'intro' });
    } catch (e) {
      this.setState({ phase: 'error', error: e instanceof Error ? e.message : 'Failed to load case' });
    }
  }

  start(): void {
    if (this.state.phase !== 'intro') return;
    this.beginQuestion(0);
  }

  input(text: string): void {
    if (this.state.phase !== 'answering') return;
    this.setState({ answer: text });
    this.tracker.input(text);
  }

  async submit(): Promise<void> {
    const text = this.state.answer.trim();
    if (this.state.phase !== 'answering' || !text) return;

    this.previewSeq += 1; // a late preview must not overwrite the final result
    this.stopTicking();
    this.clearOverlay();
    this.setState({ phase: 'evaluating', error: null });

    try {
      const result = await this.api.evaluate({
        ...this.baseRequest(),
        answer: text,
        mode: 'final',
        typing: this.tracker.summary(),
      });
      const reaction = computeReactions(result, 'final');
      const { action } = reaction.prosecutor;
      const turn = { question: this.state.question ?? '', answer: text, result, action };
      this.setState({ phase: 'reacting', turns: [...this.state.turns, turn], reaction, action });
      this.bus.emit('evaluation:received', { mode: 'final', result });
      if (action.kind !== 'none') this.bus.emit('prosecutor:action', action);
    } catch (e) {
      this.setState({ phase: 'answering', error: e instanceof Error ? e.message : 'Evaluation failed' });
      this.startTicking();
    }
  }

  next(): void {
    if (this.state.phase !== 'reacting') return;
    if (this.state.isLastQuestion) {
      const verdict = computeVerdict(this.state.caseView?.jurors ?? [], this.state.turns);
      this.setState({ phase: 'verdict', verdict });
      this.bus.emit('verdict', verdict);
      return;
    }
    this.beginQuestion(this.state.questionIndex + 1);
  }

  restart(): void {
    this.stopTicking();
    this.clearOverlay();
    this.setState({ ...initialState, caseView: this.state.caseView, phase: 'intro' });
  }

  destroy(): void {
    this.stopTicking();
    this.clearOverlay();
    this.bus.clear();
  }

  // --- internals -------------------------------------------------------------

  private setState(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch };
    this.bus.emit('state:changed', this.state);
  }

  private baseRequest(): Omit<EvaluationRequest, 'answer' | 'mode'> {
    return {
      caseId: this.state.caseView?.id ?? '',
      history: this.state.turns.map(({ question, answer }) => ({ question, answer })),
      questionIndex: this.state.questionIndex,
    };
  }

  private beginQuestion(index: number): void {
    const questions = this.state.caseView?.prosecutorQuestions ?? [];
    this.previewReaction = null;
    this.clearOverlay();
    this.tracker.reset();
    this.setState({
      phase: 'answering',
      questionIndex: index,
      question: questions[index] ?? null,
      isLastQuestion: index === questions.length - 1,
      answer: '',
      reaction: null,
      action: null,
      error: null,
    });
    this.startTicking();
  }

  private onTypingEvent(event: TypingEvent): void {
    this.bus.emit('typing:event', event);

    window.clearTimeout(this.overlayTimer);
    this.overlay = event.effect.reaction;
    this.overlayTimer = window.setTimeout(() => this.clearOverlay(), event.effect.reaction.durationMs);
    this.refreshLiveReaction();

    const text = event.text.trim();
    if (event.effect.evaluate && text) void this.requestPreview(text);
  }

  private async requestPreview(text: string): Promise<void> {
    const seq = ++this.previewSeq;
    try {
      const result = await this.api.evaluate({
        ...this.baseRequest(),
        answer: text,
        mode: 'preview',
        typing: this.tracker.summary(),
      });
      if (seq !== this.previewSeq || this.state.phase !== 'answering') return;
      this.previewReaction = computeReactions(result, 'preview');
      this.bus.emit('evaluation:received', { mode: 'preview', result });
      this.refreshLiveReaction();
    } catch {
      // Previews are best-effort; ignore failures.
    }
  }

  // While answering, the faces show the last preview with any event overlay on top.
  private refreshLiveReaction(): void {
    if (this.state.phase !== 'answering') return;
    const jurorIds = this.state.caseView?.jurors.map((j) => j.id) ?? [];
    const reaction = this.overlay ? applyOverlay(this.previewReaction, jurorIds, this.overlay) : this.previewReaction;
    this.setState({ reaction });
  }

  private clearOverlay(): void {
    window.clearTimeout(this.overlayTimer);
    if (this.overlay === null) return;
    this.overlay = null;
    this.refreshLiveReaction();
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickTimer = window.setInterval(() => this.tracker.tick(), TICK_MS);
  }

  private stopTicking(): void {
    window.clearInterval(this.tickTimer);
  }
}
