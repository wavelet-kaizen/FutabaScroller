import { TimelineCalculator } from '../domain/timeline';
import { scrollResponseIntoView } from '../dom/scroll';
import { SpeedOverlay } from './speed_overlay';
import { StatusOverlay } from './status_overlay';
import {
    ResponseEntry,
    ThreadSettings,
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

export class ScrollController {
    private intervalId: number | null = null;
    private executionStartMs: number | null = null;
    private baselineThreadTime: Date | null = null;
    private readonly timelineResponses: TimelineResponse[];
    private readonly responseMap: Map<number, ResponseEntry>;
    private readonly speedOverlay = new SpeedOverlay();
    private readonly statusOverlay = new StatusOverlay();
    private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
    private speedMultiplier: number;
    private playbackState: PlaybackState = PlaybackState.STOPPED;
    private currentThreadTime: Date | null = null;

    constructor(
        private readonly responses: ResponseEntry[],
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
    }

    start(): void {
        if (this.intervalId !== null) {
            this.stop();
        }

        const startResponse = this.responseMap.get(
            this.settings.startResponseIndex,
        );
        if (!startResponse) {
            const message = `レス番号${this.settings.startResponseIndex}が存在しません。`;
            console.error(message);
            this.onError?.(message);
            return;
        }

        this.executionStartMs = Date.now();
        this.baselineThreadTime = null;
        this.speedMultiplier = this.settings.speedMultiplier;
        this.playbackState = PlaybackState.PLAYING;
        this.currentThreadTime = startResponse.timestamp;
        this.updateStatusOverlay(true);

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
    }

    isRunning(): boolean {
        return this.playbackState !== PlaybackState.STOPPED;
    }

    private tick(): void {
        const startResponse = this.responseMap.get(
            this.settings.startResponseIndex,
        );
        if (!startResponse) {
            const message = `レス番号${this.settings.startResponseIndex}が存在しません。`;
            console.error(message);
            this.onError?.(message);
            this.stop();
            return;
        }

        if (
            this.playbackState !== PlaybackState.PAUSED &&
            this.executionStartMs !== null
        ) {
            const state: TimelineState = {
                threadStartTime: startResponse.timestamp,
                executionStartMs: this.executionStartMs,
                speedMultiplier: this.speedMultiplier,
                baselineThreadTime: this.baselineThreadTime ?? undefined,
            };

            const currentThreadTime = this.timeline.getCurrentThreadTime(
                state,
                Date.now(),
            );
            this.currentThreadTime = currentThreadTime;
        }

        this.updateStatusOverlay();

        if (
            this.playbackState === PlaybackState.PAUSED ||
            this.executionStartMs === null
        ) {
            return;
        }

        if (!this.currentThreadTime) {
            return;
        }

        const target = this.timeline.findPreviousResponse(
            this.timelineResponses,
            this.currentThreadTime,
        );

        if (!target) {
            return;
        }

        const entry = this.responseMap.get(target.index);
        if (!entry) {
            console.error(`レス番号${target.index}に対応する要素が見つかりません。`);
            return;
        }

        this.scrollFn(entry.element);
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

        const startResponse = this.responseMap.get(
            this.settings.startResponseIndex,
        );
        if (!startResponse) {
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
            threadStartTime: startResponse.timestamp,
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

        const startResponse = this.responseMap.get(
            this.settings.startResponseIndex,
        );
        if (!startResponse) {
            return;
        }

        if (this.executionStartMs !== null) {
            const state: TimelineState = {
                threadStartTime: startResponse.timestamp,
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
}
