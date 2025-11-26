import { describe, expect, test } from '@jest/globals';

import { ThreadSettings } from '../src/types';

describe('ThreadSettings 型定義', () => {
    test('全ての必須フィールドを含む設定を受け付ける', () => {
        const settings: ThreadSettings = {
            startMode: 'index',
            startValue: 3,
            startResponseIndex: 3,
            speedMultiplier: 1.2,
            additionalThreadUrls: ['https://example.com/thread.htm'],
            uiMode: 'auto-hide',
        };

        expect(settings.startMode).toBe('index');
        expect(settings.startValue).toBe(3);
        expect(settings.additionalThreadUrls).toHaveLength(1);
    });

    test('timestamp / no モードでも文字列の開始値を扱える', () => {
        const timestampSettings: ThreadSettings = {
            startMode: 'timestamp',
            startValue: '2025/11/16 22:48:03',
            startResponseIndex: 0,
            speedMultiplier: 1,
            additionalThreadUrls: [],
            uiMode: 'auto-hide',
        };
        const noSettings: ThreadSettings = {
            startMode: 'no',
            startValue: 'No.123',
            startResponseIndex: 0,
            speedMultiplier: 1,
            additionalThreadUrls: [],
            uiMode: 'auto-hide',
        };

        expect(typeof timestampSettings.startValue).toBe('string');
        expect(noSettings.startMode).toBe('no');
    });
});
