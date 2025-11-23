import { describe, expect, test } from '@jest/globals';

import { resolveStartPosition } from '../../src/domain/start_position';
import { ResponseEntry, ThreadSettings } from '../../src/types';

function createResponse(
    index: number,
    timestamp: Date,
    noText: string,
    options?: { asMultiNode?: boolean },
): ResponseEntry {
    if (options?.asMultiNode) {
        const cnw = document.createElement('span');
        cnw.className = 'cnw';
        cnw.textContent = timestamp.toISOString();

        const cno = document.createElement('span');
        cno.className = 'cno';
        cno.textContent = noText;

        const nodes = [cnw, document.createTextNode(' '), cno];

        return {
            index,
            timestamp,
            element: cnw,
            contentHash: `hash-${index}`,
            allNodes: nodes,
        };
    }

    const element = document.createElement('table');
    const cno = document.createElement('span');
    cno.className = 'cno';
    cno.textContent = noText;
    element.appendChild(cno);
    return {
        index,
        timestamp,
        element,
        contentHash: `hash-${index}`,
    };
}

const baseSettings: ThreadSettings = {
    startMode: 'index',
    startValue: 1,
    startResponseIndex: 1,
    speedMultiplier: 1,
    additionalThreadUrls: [],
};

describe('resolveStartPosition', () => {
    const responses: ResponseEntry[] = [
        createResponse(1, new Date(2024, 10, 2, 12, 0, 0), 'No.100'),
        createResponse(2, new Date(2024, 10, 2, 12, 1, 0), 'No.101'),
        createResponse(3, new Date(2024, 10, 2, 12, 2, 0), 'No.102'),
    ];

    test('indexモードで指定レスの時刻を返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'index',
            startValue: 2,
            startResponseIndex: 2,
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(true);
        expect(result.success && result.value.getTime()).toBe(
            responses[1].timestamp.getTime(),
        );
    });

    test('noモードでマルチノードレスのNo.を解決できる', () => {
        const multiResponses: ResponseEntry[] = [
            createResponse(
                1,
                new Date(2024, 10, 2, 12, 0, 0),
                'No.200',
                { asMultiNode: true },
            ),
        ];

        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'no',
            startValue: 'No.200',
        };

        const result = resolveStartPosition(settings, multiResponses);

        expect(result.success).toBe(true);
        expect(result.success && result.value.getTime()).toBe(
            multiResponses[0].timestamp.getTime(),
        );
    });

    test('indexモードで範囲外の場合はエラーを返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'index',
            startValue: 5,
            startResponseIndex: 5,
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(false);
        if (!result.success && result.error.type === 'index_out_of_range') {
            expect(result.error.type).toBe('index_out_of_range');
            expect(result.error.validRange).toEqual({ min: 1, max: 3 });
        }
    });

    test('timestampモードはパース可能なら該当レスがなくても成功を返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'timestamp',
            startValue: '2025/11/16 22:48:03',
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(true);
        expect(result.success && result.value.getFullYear()).toBe(2025);
    });

    test('timestampモードで不正形式の場合はエラーを返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'timestamp',
            startValue: 'invalid',
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(false);
        if (!result.success && result.error.type === 'timestamp_parse_error') {
            expect(result.error.type).toBe('timestamp_parse_error');
            expect(result.error.inputValue).toBe('invalid');
        }
    });

    test('timestampモードでスレッド終了後の日時でも成功を返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'timestamp',
            startValue: '2040/01/01 00:00:00',
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(true);
        expect(result.success && result.value.getFullYear()).toBe(2040);
    });

    test('timestampモードでスレッド開始前の日時でも成功を返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'timestamp',
            startValue: '2020/01/01 00:00:00',
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(true);
        expect(result.success && result.value.getFullYear()).toBe(2020);
    });

    test('noモードで一致するNo.のレスを返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'no',
            startValue: 'No.101',
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(true);
        expect(result.success && result.value.getTime()).toBe(
            responses[1].timestamp.getTime(),
        );
    });

    test('No.が見つからない場合はエラーを返す', () => {
        const settings: ThreadSettings = {
            ...baseSettings,
            startMode: 'no',
            startValue: 'No.999',
        };

        const result = resolveStartPosition(settings, responses);

        expect(result.success).toBe(false);
        if (!result.success && result.error.type === 'no_not_found') {
            expect(result.error.type).toBe('no_not_found');
            expect(result.error.searchedNo).toBe('No.999');
        }
    });
});
