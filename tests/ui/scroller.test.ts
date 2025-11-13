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
            contentHash: 'hash1',
        },
        {
            timestamp: new Date(2024, 10, 2, 12, 1, 0),
            element: second,
            index: 2,
            contentHash: 'hash2',
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

    test('dキーで速度が上がりオーバーレイが表示される', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 1, speedMultiplier: 1 };
        const scrollMock = jest.fn();

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
        );

        controller.start();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));

        const overlay = document.body.querySelector<HTMLDivElement>(
            'div[data-role="speed-overlay"]',
        );
        expect(overlay).not.toBeNull();
        expect(overlay?.textContent).toBe('倍速: 1.1x');

        jest.advanceTimersByTime(2000);
        expect(overlay?.style.display).toBe('none');

        controller.stop();
    });

    test('sキーで速度が下限を下回らない', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 1, speedMultiplier: 0.1 };
        const scrollMock = jest.fn();

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
        );

        controller.start();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));

        const overlay = document.body.querySelector<HTMLDivElement>(
            'div[data-role="speed-overlay"]',
        );
        expect(overlay).not.toBeNull();
        expect(overlay?.textContent).toBe('倍速: 0.1x');

        controller.stop();
    });

    test('倍率変更後もthread時刻が巻き戻らない', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 1, speedMultiplier: 1 };
        const scrollMock = jest.fn();

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

        const nowSequence = [1_000, 31_000, 31_000, 46_000, 46_000];
        dateNowSpy.mockImplementation(() =>
            nowSequence.length > 0 ? nowSequence.shift()! : 46_000,
        );

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start();

        // 1回目のtick: baseline未設定
        expect(timeline.getCurrentThreadTime).toHaveBeenCalledWith(
            expect.objectContaining({
                speedMultiplier: 1,
                baselineThreadTime: undefined,
            }),
            31_000,
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));

        jest.advanceTimersByTime(500);

        const calls = (timeline.getCurrentThreadTime as jest.Mock).mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall).toBeDefined();
        const [stateRaw, nowMs] = lastCall!;
        const state = stateRaw as TimelineState;
        expect(state.speedMultiplier).toBeCloseTo(1.1, 5);
        expect(state.executionStartMs).toBeGreaterThanOrEqual(31_000);
        expect(state.baselineThreadTime?.getTime()).toBe(
            new Date(2024, 10, 2, 12, 0, 30).getTime(),
        );
        expect(nowMs).toBeGreaterThanOrEqual(46_000);

        controller.stop();
    });

    test('appendResponses()で新規レスが追加される', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 1, speedMultiplier: 1 };
        const scrollMock = jest.fn();

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

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        // 新規レスを追加
        const third = document.createElement('div');
        const newResponses = [
            {
                timestamp: new Date(2024, 10, 2, 12, 2, 0),
                element: third,
                index: 3,
                contentHash: 'hash3',
            },
        ];

        controller.appendResponses(newResponses);

        // 内部状態が更新されているかを確認（コンソールログで検証）
        const consoleSpy = jest
            .spyOn(console, 'log')
            .mockImplementation(() => undefined);

        controller.appendResponses(newResponses);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('レスを追加: 1件'),
        );

        consoleSpy.mockRestore();
        controller.stop();
    });

    test('appendResponses()で空配列を渡しても問題ない', () => {
        const responses = createResponses();
        const settings = { startResponseIndex: 1, speedMultiplier: 1 };
        const scrollMock = jest.fn();

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

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        // 空配列を渡しても エラーが発生しないことを確認
        expect(() => controller.appendResponses([])).not.toThrow();

        controller.stop();
    });
});
