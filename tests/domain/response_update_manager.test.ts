import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { ResponseUpdateManager } from '../../src/domain/response_update_manager';
import { captureResponses } from '../../src/dom/capture';
import { ResponseEntry } from '../../src/types';

jest.mock('../../src/dom/capture');

const captureMock = captureResponses as jest.MockedFunction<typeof captureResponses>;

function createMockResponse(index: number, timestamp: Date): ResponseEntry {
    const element = document.createElement('div');
    element.textContent = `Response ${index}`;
    return {
        timestamp,
        element,
        index,
        contentHash: `hash${index}`,
    };
}

describe('ResponseUpdateManager', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        captureMock.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('start()で初回取得を行う', () => {
        const responses = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
            createMockResponse(1, new Date(2024, 10, 2, 12, 1, 0)),
        ];
        captureMock.mockReturnValue(responses);

        const manager = new ResponseUpdateManager();
        manager.start();

        expect(captureMock).toHaveBeenCalledTimes(1);
        expect(manager.getCurrentResponses()).toEqual(responses);
    });

    test('定期的にレスを再取得する', () => {
        const initial = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
        ];
        captureMock.mockReturnValue(initial);

        const manager = new ResponseUpdateManager({ intervalMs: 1000 });
        manager.start();

        expect(captureMock).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(1000);
        expect(captureMock).toHaveBeenCalledTimes(2);

        jest.advanceTimersByTime(1000);
        expect(captureMock).toHaveBeenCalledTimes(3);

        manager.stop();
    });

    test('新規レスが追加されたときonResponsesAddedが呼ばれる', () => {
        const initial = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
            createMockResponse(1, new Date(2024, 10, 2, 12, 1, 0)),
        ];

        const updated = [
            ...initial,
            createMockResponse(2, new Date(2024, 10, 2, 12, 2, 0)),
        ];

        captureMock.mockReturnValueOnce(initial).mockReturnValueOnce(updated);

        const onResponsesAdded = jest.fn();
        const manager = new ResponseUpdateManager({
            intervalMs: 1000,
            onResponsesAdded,
        });

        manager.start();
        expect(onResponsesAdded).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);

        expect(onResponsesAdded).toHaveBeenCalledTimes(1);
        expect(onResponsesAdded).toHaveBeenCalledWith([updated[2]]);

        manager.stop();
    });

    test('複数の新規レスが追加された場合も正しく検出する', () => {
        const initial = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
        ];

        const updated = [
            ...initial,
            createMockResponse(1, new Date(2024, 10, 2, 12, 1, 0)),
            createMockResponse(2, new Date(2024, 10, 2, 12, 2, 0)),
            createMockResponse(3, new Date(2024, 10, 2, 12, 3, 0)),
        ];

        captureMock.mockReturnValueOnce(initial).mockReturnValueOnce(updated);

        const onResponsesAdded = jest.fn();
        const manager = new ResponseUpdateManager({
            intervalMs: 1000,
            onResponsesAdded,
        });

        manager.start();
        jest.advanceTimersByTime(1000);

        expect(onResponsesAdded).toHaveBeenCalledWith([
            updated[1],
            updated[2],
            updated[3],
        ]);

        manager.stop();
    });

    test('レス削除後に新規追加された場合も検出する（回帰テスト）', () => {
        const initial = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
            createMockResponse(1, new Date(2024, 10, 2, 12, 1, 0)),
            createMockResponse(2, new Date(2024, 10, 2, 12, 2, 0)),
        ];

        // レス2が削除された状態
        const afterDeletion = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
            createMockResponse(2, new Date(2024, 10, 2, 12, 2, 0)),
        ];

        // その後、レス4が追加された状態
        const afterAddition = [
            ...afterDeletion,
            createMockResponse(3, new Date(2024, 10, 2, 12, 3, 0)),
        ];

        captureMock
            .mockReturnValueOnce(initial)
            .mockReturnValueOnce(afterDeletion)
            .mockReturnValueOnce(afterAddition);

        const onResponsesAdded = jest.fn();
        const manager = new ResponseUpdateManager({
            intervalMs: 1000,
            onResponsesAdded,
        });

        manager.start();

        // 削除発生
        jest.advanceTimersByTime(1000);
        expect(onResponsesAdded).not.toHaveBeenCalled();
        expect(manager.getCurrentResponses()).toEqual(afterDeletion);

        // 追加発生
        jest.advanceTimersByTime(1000);
        expect(onResponsesAdded).toHaveBeenCalledTimes(1);
        expect(onResponsesAdded).toHaveBeenCalledWith([afterAddition[2]]);

        manager.stop();
    });

    test('新規追加がない場合でもcurrentResponsesが更新される', () => {
        const initial = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
            createMockResponse(1, new Date(2024, 10, 2, 12, 1, 0)),
        ];

        // 内容が変わったが追加はない
        const sameLength = [
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
            createMockResponse(2, new Date(2024, 10, 2, 12, 2, 0)), // index 2 -> 2
        ];

        captureMock.mockReturnValueOnce(initial).mockReturnValueOnce(sameLength);

        const manager = new ResponseUpdateManager({ intervalMs: 1000 });
        manager.start();

        jest.advanceTimersByTime(1000);

        // currentResponsesが更新されていることを確認
        expect(manager.getCurrentResponses()).toEqual(sameLength);

        manager.stop();
    });

    test('エラー発生時にonErrorが呼ばれる', () => {
        captureMock.mockReturnValueOnce([
            createMockResponse(0, new Date(2024, 10, 2, 12, 0, 0)),
        ]);

        const error = new Error('Capture failed');
        captureMock.mockImplementationOnce(() => {
            throw error;
        });

        const onError = jest.fn();
        const manager = new ResponseUpdateManager({
            intervalMs: 1000,
            onError,
        });

        manager.start();
        jest.advanceTimersByTime(1000);

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(error);

        manager.stop();
    });

    test('stop()で多重呼び出しでも安全', () => {
        captureMock.mockReturnValue([]);

        const manager = new ResponseUpdateManager();
        manager.start();

        manager.stop();
        manager.stop(); // 2回目の呼び出し

        // エラーが発生しないことを確認
        expect(() => manager.stop()).not.toThrow();
    });

    test('start()の多重呼び出しは警告を出す', () => {
        captureMock.mockReturnValue([]);

        const consoleSpy = jest
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined);

        const manager = new ResponseUpdateManager();
        manager.start();
        manager.start(); // 2回目の呼び出し

        expect(consoleSpy).toHaveBeenCalledWith(
            'ResponseUpdateManager is already running',
        );

        manager.stop();
        consoleSpy.mockRestore();
    });
});
