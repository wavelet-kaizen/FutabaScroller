import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { main } from '../src/main';
import { captureResponses } from '../src/dom/capture';
import { promptUserForSettings } from '../src/ui/prompt';
import { ScrollController } from '../src/ui/scroller';

jest.mock('../src/dom/capture');
jest.mock('../src/ui/prompt');
jest.mock('../src/domain/timeline', () => {
    return {
        TimelineCalculator: jest.fn().mockImplementation(() => ({
            getCurrentThreadTime: jest.fn(),
            findPreviousResponse: jest.fn(),
        })),
    };
});
jest.mock('../src/ui/scroller');

const captureMock = captureResponses as jest.MockedFunction<typeof captureResponses>;
const promptMock = promptUserForSettings as jest.MockedFunction<
    typeof promptUserForSettings
>;
const ScrollControllerMock = ScrollController as unknown as jest.Mock;

describe('main', () => {
    let alertSpy: jest.SpiedFunction<typeof window.alert>;

    beforeEach(() => {
        alertSpy = jest
            .spyOn(window, 'alert')
            .mockImplementation(() => undefined) as jest.SpiedFunction<
            typeof window.alert
        >;
        ScrollControllerMock.mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(false),
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
        alertSpy.mockRestore();
    });

    test('レスが存在しない場合はアラートを表示して終了する', () => {
        captureMock.mockReturnValue([]);

        const result = main();

        expect(result).toBeNull();
        expect(alertSpy).toHaveBeenCalled();
    });

    test('設定入力がキャンセルされた場合はnullを返す', () => {
        captureMock.mockReturnValue([
            {
                timestamp: new Date(2024, 10, 2, 12, 0, 0),
                element: document.createElement('div'),
                index: 1,
            },
        ]);
        promptMock.mockReturnValue(null);

        const result = main();

        expect(result).toBeNull();
        expect(alertSpy).not.toHaveBeenCalled();
    });

    test('設定が入力された場合はスクロールを開始する', () => {
        const startMock = jest.fn();
        ScrollControllerMock.mockImplementation(() => ({
            start: startMock,
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
        }));

        const responses = [
            {
                timestamp: new Date(2024, 10, 2, 12, 0, 0),
                element: document.createElement('div'),
                index: 1,
            },
        ];
        captureMock.mockReturnValue(responses);
        promptMock.mockReturnValue({ startResponseIndex: 1, speedMultiplier: 1 });

        const controller = main();

        expect(controller).not.toBeNull();
        expect(startMock).toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();
    });
});
