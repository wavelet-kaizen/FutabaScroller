import { describe, expect, test } from '@jest/globals';

import { TimelineCalculator } from '../../src/domain/timeline';
import { TimelineResponse, TimelineState } from '../../src/types';

const calculator = new TimelineCalculator();

describe('TimelineCalculator#getCurrentThreadTime', () => {
    test('経過時間と倍率を考慮したスレッド時刻を返す', () => {
        const base = new Date(2024, 10, 2, 12, 0, 0);
        const state: TimelineState = {
            threadStartTime: base,
            executionStartMs: 1_000,
            speedMultiplier: 2,
        };

        const current = calculator.getCurrentThreadTime(state, 6_000);
        const expected = new Date(base.getTime() + 10_000);

        expect(current.getTime()).toBe(expected.getTime());
    });

    test('倍率が1未満の場合はより遅い進行になる', () => {
        const base = new Date(2024, 10, 2, 12, 0, 0);
        const state: TimelineState = {
            threadStartTime: base,
            executionStartMs: 0,
            speedMultiplier: 0.5,
        };

        const current = calculator.getCurrentThreadTime(state, 4_000);
        const expected = new Date(base.getTime() + 2_000);

        expect(current.getTime()).toBe(expected.getTime());
    });

    test('倍率が極端に大きい場合でも正しく計算できる', () => {
        const base = new Date(2024, 10, 2, 12, 0, 0);
        const state: TimelineState = {
            threadStartTime: base,
            executionStartMs: 0,
            speedMultiplier: 100,
        };

        const current = calculator.getCurrentThreadTime(state, 1_000);
        const expected = new Date(base.getTime() + 100_000);

        expect(current.getTime()).toBe(expected.getTime());
    });

    test('実行開始直後はスレッド開始時刻を返す', () => {
        const base = new Date(2024, 10, 2, 12, 0, 0);
        const state: TimelineState = {
            threadStartTime: base,
            executionStartMs: 10_000,
            speedMultiplier: 1,
        };

        const current = calculator.getCurrentThreadTime(state, 10_000);

        expect(current.getTime()).toBe(base.getTime());
    });

    test('実時間が巻き戻った場合はスレッド開始時刻を下回らない', () => {
        const base = new Date(2024, 10, 2, 12, 0, 0);
        const state: TimelineState = {
            threadStartTime: base,
            executionStartMs: 10_000,
            speedMultiplier: 1,
        };

        const current = calculator.getCurrentThreadTime(state, 5_000);

        expect(current.getTime()).toBe(base.getTime());
    });
});

describe('TimelineCalculator#findPreviousResponse', () => {
    const responses: TimelineResponse[] = [
        { timestamp: new Date(2024, 10, 2, 12, 0, 0), index: 1 },
        { timestamp: new Date(2024, 10, 2, 12, 1, 0), index: 2 },
        { timestamp: new Date(2024, 10, 2, 12, 2, 0), index: 3 },
    ];

    test('現在時刻以前で最も近いレスを返す', () => {
        const current = new Date(2024, 10, 2, 12, 1, 30);
        const result = calculator.findPreviousResponse(responses, current);

        expect(result?.index).toBe(2);
    });

    test('該当レスがない場合はnullを返す', () => {
        const current = new Date(2024, 10, 2, 11, 0, 0);
        const result = calculator.findPreviousResponse(responses, current);

        expect(result).toBeNull();
    });

    test('同一タイムスタンプが複数存在する場合は最後のレスを返す', () => {
        const duplicated: TimelineResponse[] = [
            { timestamp: new Date(2024, 10, 2, 12, 0, 0), index: 1 },
            { timestamp: new Date(2024, 10, 2, 12, 0, 0), index: 2 },
            { timestamp: new Date(2024, 10, 2, 12, 0, 0), index: 3 },
        ];
        const current = new Date(2024, 10, 2, 12, 0, 0);
        const result = calculator.findPreviousResponse(duplicated, current);

        expect(result?.index).toBe(3);
    });

    test('レスが存在しない場合はnullを返す', () => {
        const current = new Date(2024, 10, 2, 12, 0, 0);
        const result = calculator.findPreviousResponse([], current);

        expect(result).toBeNull();
    });

    test('配列がソートされていなくても最も近いレスを返す', () => {
        const unsorted: TimelineResponse[] = [
            { timestamp: new Date(2024, 10, 2, 12, 2, 0), index: 3 },
            { timestamp: new Date(2024, 10, 2, 12, 0, 0), index: 1 },
            { timestamp: new Date(2024, 10, 2, 12, 1, 0), index: 2 },
        ];
        const current = new Date(2024, 10, 2, 12, 1, 30);
        const result = calculator.findPreviousResponse(unsorted, current);

        expect(result?.index).toBe(2);
    });

    test('完全一致するレスが複数ある場合は最後のレスを返す', () => {
        const sameTimestamp: TimelineResponse[] = [
            { timestamp: new Date(2024, 10, 2, 12, 1, 0), index: 1 },
            { timestamp: new Date(2024, 10, 2, 12, 1, 0), index: 2 },
            { timestamp: new Date(2024, 10, 2, 12, 1, 0), index: 3 },
        ];
        const current = new Date(2024, 10, 2, 12, 1, 0);
        const result = calculator.findPreviousResponse(sameTimestamp, current);

        expect(result?.index).toBe(3);
    });
});
