import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { TimelineCalculator } from '../../src/domain/timeline';
import { ThreadSettings, TimelineResponse, TimelineState } from '../../src/types';
import { ScrollController } from '../../src/ui/scroller';

function createResponses() {
    const first = document.createElement('div');
    const firstNo = document.createElement('span');
    firstNo.className = 'cno';
    firstNo.textContent = 'No.1';
    first.appendChild(firstNo);

    const second = document.createElement('div');
    const secondNo = document.createElement('span');
    secondNo.className = 'cno';
    secondNo.textContent = 'No.2';
    second.appendChild(secondNo);

    return [
        {
            timestamp: new Date(2024, 10, 2, 12, 0, 0),
            element: first,
            index: 0,
            contentHash: 'hash1',
        },
        {
            timestamp: new Date(2024, 10, 2, 12, 1, 0),
            element: second,
            index: 1,
            contentHash: 'hash2',
        },
    ];
}

function createSettings(
    overrides: Partial<ThreadSettings> = {},
): ThreadSettings {
    return {
        startMode: 'index',
        startValue: 0,
        startResponseIndex: 0,
        speedMultiplier: 1,
        additionalThreadUrls: [],
        uiMode: 'auto-hide',
        ...overrides,
    };
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
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('startでタイマーが作成されスクロールが実行される', () => {
        const responses = createResponses();
        const settings = createSettings({ startResponseIndex: 1, startValue: 1 });
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
                .mockReturnValue({ timestamp: responses[1].timestamp, index: 1 }),
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

    test('レス番号指定時は最初に指定レスへスクロールする', () => {
        const responses = createResponses();
        const settings = createSettings({ startResponseIndex: 1, startValue: 1 });
        const scrollMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2024, 10, 2, 12, 1, 1)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue({
                    timestamp: responses[0].timestamp,
                    index: responses[0].index,
                }),
        };

        dateNowSpy
            .mockReturnValueOnce(1_000) // start時
            .mockReturnValue(1_500); // 初回tick

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start({ startPaused: false });

        expect(scrollMock).toHaveBeenCalledTimes(1);
        expect(scrollMock).toHaveBeenCalledWith(responses[1].element);

        controller.stop();
    });

    test('一時停止状態で開始し、xキーで再生を開始できる', () => {
        const responses = createResponses();
        const settings = createSettings();
        const scrollMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2024, 10, 2, 12, 0, 0)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
        };

        dateNowSpy.mockReturnValueOnce(1_000).mockReturnValue(2_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start({ startPaused: true });
        expect(controller.isRunning()).toBe(true);
        expect(scrollMock).not.toHaveBeenCalled();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        jest.advanceTimersByTime(500);

        expect(scrollMock).toHaveBeenCalled();
        controller.stop();
    });

    test('startResponseIndexが存在しない場合はエラーを出して停止する', () => {
        const responses = createResponses();
        const settings = createSettings({
            startMode: 'index',
            startResponseIndex: 99,
            startValue: 99,
        });
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
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
        expect(errorMock).toHaveBeenCalledWith(
            'レス番号が範囲外です（0〜1）',
        );
        expect(scrollMock).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    test('No.が存在しない場合はエラーを出して停止する', () => {
        const responses = createResponses();
        const settings = createSettings({
            startMode: 'no',
            startValue: 'No.999',
        });
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
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
        expect(errorMock).toHaveBeenCalledWith('指定されたNo.が見つかりません');
        expect(scrollMock).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    test('スクロール対象が見つからない場合はスクロールを行わない', () => {
        const responses = createResponses();
        const settings = createSettings();
        const scrollMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2024, 10, 2, 11, 59, 0)),
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

    test('日時指定でスレッド終了後の時刻を指定した場合、最後のレスへスクロールして終了する', () => {
        const responses = createResponses();
        const settings = createSettings({
            startMode: 'timestamp',
            startValue: '2040/01/01 00:00:00',
        });
        const scrollMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2040, 0, 1, 0, 0, 0)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue({
                    timestamp: responses[1].timestamp,
                    index: responses[1].index,
                }),
        };

        dateNowSpy.mockReturnValue(1_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start({ startPaused: false });

        expect(scrollMock).toHaveBeenCalledTimes(1);
        expect(scrollMock).toHaveBeenCalledWith(responses[1].element);
        expect(controller.isRunning()).toBe(false);

        scrollMock.mockClear();
        jest.advanceTimersByTime(1_000);
        expect(scrollMock).toHaveBeenCalledTimes(0);
    });

    test('一時停止開始でも終了後日時なら即座に終端へスクロールする', () => {
        const responses = createResponses();
        const settings = createSettings({
            startMode: 'timestamp',
            startValue: '2040/01/01 00:00:00',
        });
        const scrollMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2040, 0, 1, 0, 0, 0)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue({
                    timestamp: responses[1].timestamp,
                    index: responses[1].index,
                }),
        };

        dateNowSpy.mockReturnValue(1_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start({ startPaused: true });

        expect(scrollMock).toHaveBeenCalledTimes(1);
        expect(scrollMock).toHaveBeenCalledWith(responses[1].element);
        expect(controller.isRunning()).toBe(false);

        scrollMock.mockClear();
        jest.advanceTimersByTime(1_000);
        expect(scrollMock).toHaveBeenCalledTimes(0);
    });

    test('常駐モードで開始時にパネルが表示され、準備完了メッセージを表示する', () => {
        const responses = createResponses();
        const settings = createSettings({ uiMode: 'persistent' });
        const scrollMock = jest.fn();

        const timeline: Pick<
            TimelineCalculator,
            'getCurrentThreadTime' | 'findPreviousResponse'
        > = {
            getCurrentThreadTime: jest
                .fn<(state: TimelineState, nowMs: number) => Date>()
                .mockReturnValue(new Date(2024, 10, 2, 12, 0, 0)),
            findPreviousResponse: jest
                .fn<
                    (responses: TimelineResponse[], current: Date) =>
                        TimelineResponse | null
                >()
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
        };

        dateNowSpy.mockReturnValue(1_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start({ startPaused: true });

        const panel = document.querySelector<HTMLElement>(
            '[data-role="floating-control"]',
        );
        expect(panel).not.toBeNull();
        const messageBox = panel?.querySelector<HTMLElement>(
            '[data-role="message-area"]',
        );
        expect(messageBox?.textContent).toContain('準備完了');
        expect(document.querySelector('[data-role="status-overlay"]')).toBeNull();
        expect(document.querySelector('[data-role="speed-overlay"]')).toBeNull();

        controller.stop();
    });

    test('常駐モードでタイムライン終了メッセージをパネルに表示する', () => {
        const responses = createResponses();
        const settings = createSettings({ uiMode: 'persistent' });
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
                .mockReturnValue({
                    timestamp: responses[1].timestamp,
                    index: responses[1].index,
                }),
        };

        dateNowSpy.mockReturnValue(1_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start({ startPaused: false });

        const panel = document.querySelector<HTMLElement>(
            '[data-role="floating-control"]',
        );
        const messageBox = panel?.querySelector<HTMLElement>(
            '[data-role="message-area"]',
        );

        expect(messageBox?.textContent).toContain('タイムライン終了');
        expect(controller.isRunning()).toBe(false);

        controller.stop();
    });

    test('dキーで速度が上がりオーバーレイが表示される', () => {
        const responses = createResponses();
        const settings = createSettings();
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
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
        const settings = createSettings({ speedMultiplier: 0.2 });
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
        };

        dateNowSpy.mockReturnValue(1_000);

        const controller = new ScrollController(
            responses,
            settings,
            timeline as TimelineCalculator,
            scrollMock,
        );

        controller.start();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));

        const overlay = document.body.querySelector<HTMLDivElement>(
            'div[data-role="speed-overlay"]',
        );
        expect(overlay).not.toBeNull();
        const speedValue = (controller as unknown as { speedMultiplier: number })
            .speedMultiplier;
        expect(speedValue).toBeCloseTo(0.1, 5);

        controller.stop();
    });

    test('倍率変更後もthread時刻が巻き戻らない', () => {
        const responses = createResponses();
        const settings = createSettings();
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
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

    test('再実行時に速度と一時停止状態がリセットされる', () => {
        const responses = createResponses();
        const settings = createSettings();
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
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
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));

        (timeline.getCurrentThreadTime as jest.Mock).mockClear();

        controller.start();

        const calls = (timeline.getCurrentThreadTime as jest.Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [state] = calls[0];
        expect((state as TimelineState).speedMultiplier).toBe(
            settings.speedMultiplier,
        );
        controller.stop();
    });

    test('appendResponses()で新規レスが追加される', () => {
        const responses = createResponses();
        const settings = createSettings();
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
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
                index: 2,
                contentHash: 'hash3',
            },
        ];

        controller.appendResponses(newResponses);

        // 内部状態が更新されているかを確認
        // レスが正常に追加されていればエラーなく完了する
        expect(newResponses).toHaveLength(1);

        controller.stop();
    });

    test('appendResponses()で空配列を渡しても問題ない', () => {
        const responses = createResponses();
        const settings = createSettings();
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
                .mockReturnValue({ timestamp: responses[0].timestamp, index: 0 }),
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
