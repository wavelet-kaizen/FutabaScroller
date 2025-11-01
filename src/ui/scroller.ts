import { TimelineCalculator } from '../domain/timeline';
import { scrollResponseIntoView } from '../dom/scroll';
import {
    ResponseEntry,
    ThreadSettings,
    TimelineResponse,
    TimelineState,
} from '../types';

const UPDATE_INTERVAL_MS = 500;

export class ScrollController {
    private intervalId: number | null = null;
    private executionStartMs: number | null = null;
    private readonly timelineResponses: TimelineResponse[];
    private readonly responseMap: Map<number, ResponseEntry>;

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
    }

    start(): void {
        if (this.intervalId !== null) {
            this.stop();
        }

        this.executionStartMs = Date.now();
        this.tick();
        if (this.executionStartMs === null) {
            return;
        }

        this.intervalId = window.setInterval(
            () => this.tick(),
            UPDATE_INTERVAL_MS,
        );
    }

    stop(): void {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.executionStartMs = null;
    }

    isRunning(): boolean {
        return this.intervalId !== null;
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
            speedMultiplier: this.settings.speedMultiplier,
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
}
