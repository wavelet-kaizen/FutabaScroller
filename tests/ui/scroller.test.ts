import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { TimelineCalculator } from '../../src/domain/timeline';
import { TimelineResponse, TimelineState } from '../../src/types';
import { ScrollController } from '../../src/ui/scroller';

function createResponses() {
    const first = document.createElement('div');
    const second = document.createElement('div');

    return [
        {
            timestamp: new Date(2024, 10, 2, 12, 0, 0),
            element: first,
            index: 1,
        },
        {
            timestamp: new Date(2024, 10, 2, 12, 1, 0),
            element: second,
            index: 2,
        },
    ];
}

describe('ScrollController', () => {
    let dateNowSpy: jest.SpiedFunction<typeof Date.now>;

    beforeEach(() => {
        jest.useFakeTimers();
        dateNowSpy = jest.spyOn(Date, 'now');
    });

    afterEach(() => {
        jest.useRealTimers();
        dateNowSpy.mockRestore();
    });

    test('startでタイマーが作成されスクロールが実行される', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 1, speedMultiplier: 1 };
        const scrollMock = jest.fn();
        const errorMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2024, 10, 2, 12, 0, 30)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue({ timestamp: responses[1].timestamp, index: 2 }),
        };

        dateNowSpy
            .mockReturnValueOnce(1_000) // start時
            .mockReturnValueOnce(1_500) // 初回tick
            .mockReturnValue(2_000); // 以降

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
            errorMock,
        );

        controller.start();

        expect(controller.isRunning()).toBe(true);
        expect(scrollMock).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(500);
        expect(scrollMock).toHaveBeenCalledTimes(2);

        controller.stop();
        expect(controller.isRunning()).toBe(false);
    });

    test('startResponseIndexが存在しない場合はエラーを出して停止する', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 99, speedMultiplier: 1 };
        const scrollMock = jest.fn();
        const errorMock = jest.fn();
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2024, 10, 2, 12, 0, 30)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 1 }),
        };

        dateNowSpy.mockReturnValue(1_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
            errorMock,
        );

        controller.start();

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(controller.isRunning()).toBe(false);
        expect(errorMock).toHaveBeenCalledWith('レス番号99が存在しません。');
        expect(scrollMock).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    test('スクロール対象が見つからない場合はスクロールを行わない', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 1, speedMultiplier: 1 };
        const scrollMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2024, 10, 2, 12, 5, 0)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue(null),
        };

        dateNowSpy.mockReturnValue(1_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start();

        expect(scrollMock).not.toHaveBeenCalled();
        controller.stop();
    });
});
