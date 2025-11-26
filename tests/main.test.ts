import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { main } from '../src/main';
import { ResponseUpdateManager } from '../src/domain/response_update_manager';
import { mergeThreads } from '../src/dom/merge';
import { InputFormOverlay } from '../src/ui/input_form';
import { LoadingOverlay } from '../src/ui/loading_overlay';
import { ScrollController } from '../src/ui/scroller';
import { ThreadSettings } from '../src/types';

jest.mock('../src/ui/input_form');
jest.mock('../src/ui/loading_overlay');
jest.mock('../src/dom/merge');
jest.mock('../src/domain/timeline', () => {
    return {
        TimelineCalculator: jest.fn().mockImplementation(() => ({
            getCurrentThreadTime: jest.fn(),
            findPreviousResponse: jest.fn(),
        })),
    };
});
jest.mock('../src/ui/scroller');
jest.mock('../src/domain/response_update_manager');

const InputFormOverlayMock = InputFormOverlay as unknown as jest.Mock;
const LoadingOverlayMock = LoadingOverlay as unknown as jest.Mock;
const mergeThreadsMock = mergeThreads as jest.MockedFunction<typeof mergeThreads>;
const ScrollControllerMock = ScrollController as unknown as jest.Mock;
const ResponseUpdateManagerMock = ResponseUpdateManager as unknown as jest.Mock;

describe('main', () => {
    let alertSpy: jest.SpiedFunction<typeof window.alert>;
    let inputPromptMock: jest.MockedFunction<
        (getCount: () => number) => Promise<ThreadSettings | null>
    >;
    let showWithErrorMock: jest.MockedFunction<
        (
            settings: ThreadSettings,
            message: string,
            field: 'startValue' | 'speedMultiplier' | 'urls',
        ) => Promise<ThreadSettings | null>
    >;
    let loadingOverlayInstance: {
        show: jest.Mock;
        hide: jest.Mock;
        updateProgress: jest.Mock;
        showError: jest.Mock;
        destroy: jest.Mock;
    };

    beforeEach(() => {
        alertSpy = jest
            .spyOn(window, 'alert')
            .mockImplementation(() => undefined) as jest.SpiedFunction<
            typeof window.alert
        >;
        inputPromptMock = jest.fn();
        showWithErrorMock = jest.fn();
        loadingOverlayInstance = {
            show: jest.fn(),
            hide: jest.fn(),
            updateProgress: jest.fn(),
            showError: jest.fn(),
            destroy: jest.fn(),
        };

        InputFormOverlayMock.mockImplementation(() => ({
            prompt: inputPromptMock,
            showWithError: showWithErrorMock,
        }));
        LoadingOverlayMock.mockImplementation(() => loadingOverlayInstance);
        ScrollControllerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(false),
            appendResponses: jest.fn(),
        }));
        ResponseUpdateManagerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue([]),
        }));
        mergeThreadsMock.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
        alertSpy.mockRestore();
    });

    test('レスが存在しない場合はアラートを表示して終了する', async () => {
        ResponseUpdateManagerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue([]),
        }));

        const result = await main();

        expect(result).toBeNull();
        expect(alertSpy).toHaveBeenCalled();
    });

    test('設定入力がキャンセルされた場合はnullを返す', async () => {
        const responses = [
            {
                timestamp: new Date(2024, 10, 2, 12, 0, 0),
                element: document.createElement('div'),
                index: 0,
                contentHash: 'hash1',
            },
        ];
        ResponseUpdateManagerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue(responses),
        }));
        inputPromptMock.mockResolvedValue(null);

        const result = await main();

        expect(result).toBeNull();
        expect(alertSpy).not.toHaveBeenCalled();
    });

    test('設定が入力された場合はスクロールを一時停止状態で準備する', async () => {
        const startMock = jest.fn();
        ScrollControllerMock.mockImplementation(() => ({
            start: startMock,
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            appendResponses: jest.fn(),
        }));

        const responses = [
            {
                timestamp: new Date(2024, 10, 2, 12, 0, 0),
                element: document.createElement('div'),
                index: 0,
                contentHash: 'hash1',
            },
        ];
        ResponseUpdateManagerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue(responses),
        }));

        const settings: ThreadSettings = {
            startMode: 'index',
            startValue: 0,
            startResponseIndex: 0,
            speedMultiplier: 1,
            additionalThreadUrls: [],
            uiMode: 'auto-hide',
        };
        inputPromptMock.mockResolvedValue(settings);

        const instance = await main();

        expect(instance).not.toBeNull();
        expect(startMock).toHaveBeenCalledWith({
            startPaused: true,
            startTime: expect.any(Date),
        });
        expect(alertSpy).not.toHaveBeenCalled();
        expect(showWithErrorMock).not.toHaveBeenCalled();
    });

    test('追加スレッド取得が失敗した場合は中断する', async () => {
        const responses = [
            {
                timestamp: new Date(2024, 10, 2, 12, 0, 0),
                element: document.createElement('div'),
                index: 0,
                contentHash: 'hash1',
            },
        ];
        const stopMock = jest.fn();
        ResponseUpdateManagerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: stopMock,
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue(responses),
        }));

        const settings: ThreadSettings = {
            startMode: 'index',
            startValue: 0,
            startResponseIndex: 0,
            speedMultiplier: 1,
            additionalThreadUrls: ['https://example.com/thread.htm'],
            uiMode: 'auto-hide',
        };
        inputPromptMock.mockResolvedValue(settings);
        mergeThreadsMock.mockRejectedValue(new Error('取得失敗'));

        const result = await main();

        expect(result).toBeNull();
        expect(alertSpy).toHaveBeenCalledWith('取得失敗');
        expect(stopMock).toHaveBeenCalled();
    });

    test('開始位置解決に失敗した場合はフォームを再表示し、キャンセルされたら終了する', async () => {
        const responses = [
            {
                timestamp: new Date(2024, 10, 2, 12, 0, 0),
                element: document.createElement('div'),
                index: 0,
                contentHash: 'hash1',
            },
        ];
        const stopMock = jest.fn();
        ResponseUpdateManagerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: stopMock,
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue(responses),
        }));

        const settings: ThreadSettings = {
            startMode: 'index',
            startValue: 5,
            startResponseIndex: 5,
            speedMultiplier: 1,
            additionalThreadUrls: [],
            uiMode: 'auto-hide',
        };
        inputPromptMock.mockResolvedValue(settings);
        showWithErrorMock.mockResolvedValue(null);

        const result = await main();

        expect(result).toBeNull();
        expect(showWithErrorMock).toHaveBeenCalledWith(
            settings,
            expect.stringContaining('レス番号が範囲外'),
            'startValue',
        );
        expect(stopMock).toHaveBeenCalled();
        expect(ScrollControllerMock).not.toHaveBeenCalled();
    });
});
