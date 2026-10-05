import type { CourtApi } from '../api/types';
import { TypingTracker } from '../typing/tracker';
import type { TypingEvent, TypingEventEffect, TypingEventPlugin } from '../typing/types';
import {
  applyReactionOverride,
  fakeEvaluation,
  mergeOverrides,
  type DebugController,
  type ReactionOverride,
} from './debug';
import { EventBus } from './eventBus';
import { lawyerHint } from './lawyer';
import { applyOverlay, computeReactions, NEUTRAL_EXPRESSION, type CourtReaction } from './reactions';
import { initialState, type GameEvents, type GameState } from './state';
import type { EvaluationRequest, EvaluationResult } from './types';
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
  readonly debug: DebugController;
}

/**
 * Headless game engine: trial flow, evaluations, reactions and verdict.
 * No UI code here — renderers read `getState()` and listen to the bus.
 */
export class GameEngine implements GameController {
  readonly bus = new EventBus<GameEvents>();
  private state: GameState = initialState;
  private view: GameState = initialState; // state as displayed: `state` with debug overrides applied
  private readonly api: CourtApi;
  private readonly tracker: TypingTracker;

  private previewReaction: CourtReaction | null = null;
  private overlay: TypingEventEffect['reaction'] | null = null;
  private overlayTimer: number | undefined;
  private tickTimer: number | undefined;
  private previewSeq = 0; // numbers preview requests; stale responses are dropped

  private debugOverride: ReactionOverride | null = null;
  private debugFlash: ReactionOverride | null = null;
  private debugFlashTimer: number | undefined;

  constructor({ api, typingPlugins }: EngineOptions) {
    this.api = api;
    this.tracker = new TypingTracker(typingPlugins, (event) => this.onTypingEvent(event));
  }

  getState(): GameState {
    return this.view;
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
      this.applyFinalResult(text, result);
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
    window.clearTimeout(this.debugFlashTimer);
    this.bus.clear();
  }

  readonly debug: DebugController = {
    setReactionOverride: (override) => {
      this.debugOverride = override;
      this.publish();
    },
    flashReaction: (override, durationMs) => {
      window.clearTimeout(this.debugFlashTimer);
      this.debugFlash = override;
      this.publish();
      this.debugFlashTimer = window.setTimeout(() => {
        this.debugFlash = null;
        this.publish();
      }, durationMs);
    },
    triggerAction: (action) => {
      const { phase } = this.state;
      if (phase !== 'answering' && phase !== 'evaluating' && phase !== 'reacting') return;
      this.previewSeq += 1;
      this.stopTicking();
      this.clearOverlay();
      const base = this.state.reaction ?? this.neutralReaction();
      const expression = action.kind === 'none' ? 'impassive' : 'attacking';
      const reaction = { ...base, prosecutor: { expression, intensity: 1, action } } satisfies CourtReaction;
      this.setState({ phase: 'reacting', reaction, action, lawyerHint: null });
      if (action.kind !== 'none') this.bus.emit('prosecutor:action', action);
    },
    showLawyerHint: (hint) => {
      if (!this.state.caseView) return;
      this.setState({ lawyerHint: hint });
      if (hint) this.bus.emit('lawyer:hint', hint);
    },
    typingEventKinds: () => this.tracker.kinds(),
    fireTypingEvent: (kind) => {
      if (this.state.phase === 'answering') this.tracker.trigger(kind);
    },
    goToQuestion: (index) => {
      const count = this.state.caseView?.prosecutorQuestions.length ?? 0;
      if (count === 0) return;
      const target = Math.max(0, Math.min(index, count - 1));
      this.previewSeq += 1;
      this.setState({ turns: this.state.turns.slice(0, target), verdict: null });
      this.beginQuestion(target);
    },
    simulateAnswer: (params) => {
      if (this.state.phase !== 'answering') return;
      this.previewSeq += 1;
      this.stopTicking();
      this.clearOverlay();
      this.applyFinalResult(this.state.answer.trim() || '(debug answer)', fakeEvaluation(params));
    },
    showVerdict: () => {
      if (!this.state.caseView) return;
      this.previewSeq += 1;
      this.stopTicking();
      this.clearOverlay();
      const verdict = computeVerdict(this.state.caseView.jurors, this.state.turns);
      this.setState({ phase: 'verdict', verdict });
      this.bus.emit('verdict', verdict);
    },
  };

  // --- internals -------------------------------------------------------------

  private setState(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch };
    this.publish();
  }

  private publish(): void {
    const override = mergeOverrides(this.debugOverride, this.debugFlash);
    const jurorIds = this.state.caseView?.jurors.map((j) => j.id) ?? [];
    this.view = override
      ? { ...this.state, reaction: applyReactionOverride(this.state.reaction, jurorIds, override) }
      : this.state;
    this.bus.emit('state:changed', this.view);
  }

  private applyFinalResult(answer: string, result: EvaluationResult): void {
    const reaction = computeReactions(result, 'final');
    const { action } = reaction.prosecutor;
    const turn = { question: this.state.question ?? '', answer, result, action };
    const hint = lawyerHint(result, action, this.state.caseView?.jurors ?? [], this.state.turns);
    this.setState({ phase: 'reacting', turns: [...this.state.turns, turn], reaction, action, lawyerHint: hint });
    this.bus.emit('evaluation:received', { mode: 'final', result });
    if (action.kind !== 'none') this.bus.emit('prosecutor:action', action);
    if (hint) this.bus.emit('lawyer:hint', hint);
  }

  private neutralReaction(): CourtReaction {
    const jurors: CourtReaction['jurors'] = {};
    for (const juror of this.state.caseView?.jurors ?? []) jurors[juror.id] = NEUTRAL_EXPRESSION;
    return {
      jurors,
      lawyer: { expression: 'neutral', intensity: 0 },
      prosecutor: { expression: 'impassive', intensity: 0, action: { kind: 'none' } },
    };
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
      lawyerHint: null,
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
