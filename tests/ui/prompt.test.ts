import { describe, expect, jest, test } from '@jest/globals';

import { promptUserForSettings } from '../../src/ui/prompt';

describe('promptUserForSettings', () => {
    test('有効な入力を返す', () => {
        const promptMock = jest
            .fn<(message: string, defaultValue?: string) => string | null>()
            .mockReturnValue('2, 1.5');
        const alertMock = jest
            .fn<(message: string) => void>()
            .mockImplementation(() => undefined);

        const settings = promptUserForSettings(5, promptMock, alertMock);

        expect(settings).not.toBeNull();
        expect(settings).toEqual({ startResponseIndex: 2, speedMultiplier: 1.5 });
        expect(alertMock).not.toHaveBeenCalled();
    });

    test('無効な入力は再入力を促す', () => {
        const promptMock = jest
            .fn<(message: string, defaultValue?: string) => string | null>()
            .mockReturnValueOnce('0, 1')
            .mockReturnValueOnce('2,1');
        const alertMock = jest
            .fn<(message: string) => void>()
            .mockImplementation(() => undefined);

        const settings = promptUserForSettings(5, promptMock, alertMock);

        expect(settings).not.toBeNull();
        expect(settings).toEqual({ startResponseIndex: 2, speedMultiplier: 1 });
        expect(alertMock).toHaveBeenCalledTimes(1);
    });

    test('キャンセル時はnullを返す', () => {
        const promptMock = jest
            .fn<(message: string, defaultValue?: string) => string | null>()
            .mockReturnValue(null);
        const alertMock = jest
            .fn<(message: string) => void>()
            .mockImplementation(() => undefined);

        const settings = promptUserForSettings(5, promptMock, alertMock);

        expect(settings).toBeNull();
        expect(alertMock).toHaveBeenCalledWith('ブックマークレットをキャンセルしました。');
    });

    test('入力が繰り返し失敗すると終了する', () => {
        const promptMock = jest
            .fn<(message: string, defaultValue?: string) => string | null>()
            .mockReturnValue('0,0');
        const alertMock = jest
            .fn<(message: string) => void>()
            .mockImplementation(() => undefined);

        const settings = promptUserForSettings(5, promptMock, alertMock);

        expect(settings).toBeNull();
        expect(alertMock).toHaveBeenCalledWith(
            '入力が繰り返し失敗したため、ブックマークレットを終了します。',
        );
    });
});
