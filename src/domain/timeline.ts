import { TimelineResponse, TimelineState } from '../types';

export class TimelineCalculator {
    getCurrentThreadTime(state: TimelineState, nowMs: number): Date {
        const elapsedMs = Math.max(0, nowMs - state.executionStartMs);
        const threadElapsedMs = elapsedMs * state.speedMultiplier;
        const targetMs = state.threadStartTime.getTime() + threadElapsedMs;

        return new Date(targetMs);
    }

    findPreviousResponse(
        responses: TimelineResponse[],
        current: Date,
    ): TimelineResponse | null {
        if (responses.length === 0) {
            return null;
        }

        const currentMs = current.getTime();
        const sorted = [...responses].sort((a, b) => {
            const diff = a.timestamp.getTime() - b.timestamp.getTime();
            if (diff !== 0) {
                return diff;
            }
            return a.index - b.index;
        });

        let low = 0;
        let high = sorted.length - 1;
        let candidate = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midMs = sorted[mid].timestamp.getTime();

            if (midMs <= currentMs) {
                candidate = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (candidate === -1) {
            return null;
        }

        return sorted[candidate];
    }
}
