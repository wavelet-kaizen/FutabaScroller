import { TimelineCalculator } from '../domain/timeline';
import { scrollResponseIntoView } from '../dom/scroll';
import { SpeedOverlay } from './speed_overlay';
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

export class ScrollController {
    private intervalId: number | null = null;
    private executionStartMs: number | null = null;
    private baselineThreadTime: Date | null = null;
    private readonly timelineResponses: TimelineResponse[];
    private readonly responseMap: Map<number, ResponseEntry>;
    private readonly overlay = new SpeedOverlay();
    private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
    private speedMultiplier: number;
    private running = false;

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
            if (this.onError) {
                this.onError(message);
            }
            return;
        }

        this.executionStartMs = Date.now();
        this.baselineThreadTime = null;
        this.speedMultiplier = this.settings.speedMultiplier;
        this.running = true;

        this.tick();
        this.intervalId = window.setInterval(
            () => this.tick(),
            UPDATE_INTERVAL_MS,
        ) as unknown as number;
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
        this.overlay.destroy();
        this.running = false;
    }

    isRunning(): boolean {
        return this.running;
    }

    private tick(): void {
        if (this.executionStartMs === null) {
            return;
        }

        const startResponse = this.responseMap.get(
            this.settings.startResponseIndex,
        );
        if (!startResponse) {
            const message = `レス番号${this.settings.startResponseIndex}が存在しません。`;
            console.error(message);
            if (this.onError) {
                this.onError(message);
            }
            this.stop();
            return;
        }

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

        const target = this.timeline.findPreviousResponse(
            this.timelineResponses,
            currentThreadTime,
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
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            if (event.key === 'd') {
                this.adjustSpeed(SPEED_MULTIPLIER_STEP);
            } else if (event.key === 's') {
                this.adjustSpeed(-SPEED_MULTIPLIER_STEP);
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
        if (this.executionStartMs === null) {
            return;
        }

        const next = Math.min(
            SPEED_MULTIPLIER_MAX,
            Math.max(SPEED_MULTIPLIER_MIN, this.speedMultiplier + delta),
        );

        if (next === this.speedMultiplier) {
            return;
        }

        const startResponse = this.responseMap.get(
            this.settings.startResponseIndex,
        );
        if (!startResponse) {
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
        this.executionStartMs = Date.now();
        this.speedMultiplier = Math.round(next * 10) / 10;
        this.overlay.show(this.speedMultiplier);
    }
}
