import { TimelineCalculator } from '../domain/timeline';
import { resolveStartPosition } from '../domain/start_position';
import { scrollResponseIntoView } from '../dom/scroll';
import { SpeedOverlay } from './speed_overlay';
import { StatusOverlay } from './status_overlay';
import {
    ResponseEntry,
    ThreadSettings,
    StartPositionResult,
    TimelineResponse,
    TimelineState,
} from '../types';

const UPDATE_INTERVAL_MS = 500;
const SPEED_MULTIPLIER_MIN = 0.1;
const SPEED_MULTIPLIER_MAX = 10;
const SPEED_MULTIPLIER_STEP = 0.1;

enum PlaybackState {
    STOPPED = 'STOPPED',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
}

type StartOptions = {
    startPaused?: boolean;
    startTime?: Date;
};

export class ScrollController {
    private intervalId: number | null = null;
    private executionStartMs: number | null = null;
    private baselineThreadTime: Date | null = null;
    private timelineResponses: TimelineResponse[];
    private responseMap: Map<number, ResponseEntry>;
    private readonly speedOverlay = new SpeedOverlay();
    private readonly statusOverlay = new StatusOverlay();
    private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
    private speedMultiplier: number;
    private playbackState: PlaybackState = PlaybackState.STOPPED;
    private currentThreadTime: Date | null = null;
    private startThreadTime: Date | null = null;
    private hasScrolledInitial = false;
    private lastResponseTimestamp: Date | null = null;
    private timelineEnded = false;

    constructor(
        private responses: ResponseEntry[],
        private readonly settings: ThreadSettings,
        private readonly timeline: TimelineCalculator,
        private readonly scrollFn: (element: HTMLElement) => void = scrollResponseIntoView,
        private readonly onError?: (message: string) => void,
    ) {
        this.timelineResponses = responses.map((response) => ({
            timestamp: response.timestamp,
            index: response.index,
        }));

        this.responseMap = new Map(
            responses.map((response) => [response.index, response] as const),
        );

        this.speedMultiplier = settings.speedMultiplier;
        this.lastResponseTimestamp = this.getLastResponseTimestamp();
    }

    start(options: StartOptions = {}): void {
        if (this.intervalId !== null) {
            this.stop();
        }

        const resolvedStart: StartPositionResult = options.startTime
            ? { success: true, value: options.startTime }
            : resolveStartPosition(this.settings, this.responses);

        if (!resolvedStart.success) {
            console.error(resolvedStart.error.message);
            this.onError?.(resolvedStart.error.message);
            return;
        }

        this.startThreadTime = resolvedStart.value;
        this.currentThreadTime = resolvedStart.value;
        this.executionStartMs = options.startPaused ? null : Date.now();
        this.baselineThreadTime = null;
        this.speedMultiplier = this.settings.speedMultiplier;
        this.hasScrolledInitial = false;
        this.timelineEnded = false;
        this.playbackState = options.startPaused
            ? PlaybackState.PAUSED
            : PlaybackState.PLAYING;
        this.updateStatusOverlay(true);
        if (options.startPaused) {
            this.statusOverlay.showMessage('準備完了、xキーでスクロール開始');
        }

        this.lastResponseTimestamp = this.getLastResponseTimestamp();

        this.tick();
        this.intervalId = window.setInterval(() => this.tick(), UPDATE_INTERVAL_MS);
        this.bindKeyboard();
    }

    stop(): void {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.executionStartMs = null;
        this.baselineThreadTime = null;
        this.unbindKeyboard();
        this.speedOverlay.destroy();
        this.statusOverlay.destroy();
        this.playbackState = PlaybackState.STOPPED;
        this.currentThreadTime = null;
        this.startThreadTime = null;
        this.hasScrolledInitial = false;
        this.timelineEnded = false;
    }

    isRunning(): boolean {
        return this.playbackState !== PlaybackState.STOPPED && !this.timelineEnded;
    }

    private tick(): void {
        if (!this.startThreadTime) {
            return;
        }

        if (
            this.playbackState !== PlaybackState.PAUSED &&
            this.executionStartMs !== null
        ) {
            const state: TimelineState = {
                threadStartTime: this.startThreadTime,
                executionStartMs: this.executionStartMs,
                speedMultiplier: this.speedMultiplier,
                baselineThreadTime: this.baselineThreadTime ?? undefined,
            };

            const currentThreadTime = this.timeline.getCurrentThreadTime(
                state,
                Date.now(),
            );
            this.currentThreadTime = currentThreadTime;
        } else if (!this.currentThreadTime) {
            // 一時停止中でも現在時刻を持っておく（起動時即終了判定用）
            this.currentThreadTime = this.startThreadTime;
        }

        this.updateStatusOverlay();

        if (!this.currentThreadTime) {
            return;
        }

        if (
            this.lastResponseTimestamp &&
            this.currentThreadTime.getTime() >
                this.lastResponseTimestamp.getTime()
        ) {
            this.handleTimelineEnd();
            return;
        }

        if (
            this.playbackState === PlaybackState.PAUSED ||
            this.executionStartMs === null
        ) {
            return;
        }

        const target = this.timeline.findPreviousResponse(
            this.timelineResponses,
            this.currentThreadTime,
        );

        if (!target) {
            return;
        }

        if (!this.hasScrolledInitial && this.settings.startMode === 'index') {
            const initial = this.responseMap.get(
                this.settings.startResponseIndex,
            );
            if (initial) {
                this.scrollFn(initial.element);
                this.hasScrolledInitial = true;
                return;
            }
        }

        const entry = this.responseMap.get(target.index);
        if (!entry) {
            console.error(`レス番号${target.index}に対応する要素が見つかりません。`);
            return;
        }

        this.scrollFn(entry.element);
    }

    private handleTimelineEnd(): void {
        if (this.timelineEnded) {
            return;
        }
        this.timelineEnded = true;

        const lastEntry =
            this.responses.length > 0
                ? this.responses[this.responses.length - 1]
                : null;
        if (lastEntry) {
            this.currentThreadTime = lastEntry.timestamp;
            this.scrollFn(lastEntry.element);
        }

        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.executionStartMs = null;
        this.playbackState = PlaybackState.PAUSED;
        this.updateStatusOverlay(true);
        this.statusOverlay.showMessage('タイムライン終了');
        this.unbindKeyboard();
    }

    private bindKeyboard(): void {
        if (this.keydownHandler) {
            window.removeEventListener('keydown', this.keydownHandler);
        }

        this.keydownHandler = (event: KeyboardEvent) => {
            const target = event.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                (target instanceof HTMLElement && target.isContentEditable)
            ) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key === 'd') {
                this.adjustSpeed(SPEED_MULTIPLIER_STEP);
            } else if (key === 's') {
                this.adjustSpeed(-SPEED_MULTIPLIER_STEP);
            } else if (key === 'x') {
                this.togglePause();
            }
        };

        window.addEventListener('keydown', this.keydownHandler);
    }

    private unbindKeyboard(): void {
        if (this.keydownHandler) {
            window.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
    }

    private adjustSpeed(delta: number): void {
        // 再生開始前は倍率変更を受け付けない
        if (
            this.executionStartMs === null &&
            this.playbackState !== PlaybackState.PAUSED
        ) {
            return;
        }

        const rounded = Number((this.speedMultiplier + delta).toFixed(1));
        const clamped = Math.min(
            SPEED_MULTIPLIER_MAX,
            Math.max(SPEED_MULTIPLIER_MIN, rounded),
        );

        if (clamped === this.speedMultiplier) {
            return;
        }

        if (!this.startThreadTime) {
            return;
        }

        if (
            this.playbackState === PlaybackState.PAUSED ||
            this.executionStartMs === null
        ) {
            this.speedMultiplier = clamped;
            this.speedOverlay.show(this.speedMultiplier);
            this.updateStatusOverlay(true);
            return;
        }

        const currentState: TimelineState = {
            threadStartTime: this.startThreadTime,
            executionStartMs: this.executionStartMs,
            speedMultiplier: this.speedMultiplier,
            baselineThreadTime: this.baselineThreadTime ?? undefined,
        };

        const currentThreadTime = this.timeline.getCurrentThreadTime(
            currentState,
            Date.now(),
        );

        this.baselineThreadTime = currentThreadTime;
        this.currentThreadTime = currentThreadTime;
        this.executionStartMs = Date.now();
        this.speedMultiplier = clamped;
        this.speedOverlay.show(this.speedMultiplier);
        this.updateStatusOverlay(true);
    }

    private pause(): void {
        if (this.playbackState !== PlaybackState.PLAYING) {
            return;
        }

        if (!this.startThreadTime) {
            return;
        }

        if (this.executionStartMs !== null) {
            const state: TimelineState = {
                threadStartTime: this.startThreadTime,
                executionStartMs: this.executionStartMs,
                speedMultiplier: this.speedMultiplier,
                baselineThreadTime: this.baselineThreadTime ?? undefined,
            };
            const currentThreadTime = this.timeline.getCurrentThreadTime(
                state,
                Date.now(),
            );
            this.baselineThreadTime = currentThreadTime;
            this.currentThreadTime = currentThreadTime;
        }

        this.executionStartMs = null;
        this.playbackState = PlaybackState.PAUSED;
        this.updateStatusOverlay(true);
    }

    private resume(): void {
        if (this.playbackState !== PlaybackState.PAUSED) {
            return;
        }

        this.executionStartMs = Date.now();
        this.playbackState = PlaybackState.PLAYING;
        this.updateStatusOverlay(true);
    }

    private togglePause(): void {
        if (this.playbackState === PlaybackState.PAUSED) {
            this.resume();
        } else {
            this.pause();
        }
    }

    private updateStatusOverlay(showTemporarily = false): void {
        this.statusOverlay.updateState(
            this.currentThreadTime,
            this.speedMultiplier,
            this.playbackState === PlaybackState.PAUSED,
        );
        if (showTemporarily) {
            this.statusOverlay.showTemporarily();
        }
    }

    private getLastResponseTimestamp(): Date | null {
        if (this.responses.length === 0) {
            return null;
        }

        let latest = this.responses[0].timestamp;
        for (const response of this.responses) {
            if (response.timestamp.getTime() > latest.getTime()) {
                latest = response.timestamp;
            }
        }
        return latest;
    }

    /**
     * 新しいレスを追加する
     * 内部の配列とマップを更新し、既存の再生状態を維持する
     */
    appendResponses(newResponses: ResponseEntry[]): void {
        if (newResponses.length === 0) {
            return;
        }

        // 既存の配列に追加
        this.responses.push(...newResponses);

        // タイムラインレスポンスを追加
        const newTimelineResponses = newResponses.map((response) => ({
            timestamp: response.timestamp,
            index: response.index,
        }));
        this.timelineResponses.push(...newTimelineResponses);

        // レスポンスマップを更新
        for (const response of newResponses) {
            this.responseMap.set(response.index, response);
        }

        this.lastResponseTimestamp = this.getLastResponseTimestamp();
    }
}
