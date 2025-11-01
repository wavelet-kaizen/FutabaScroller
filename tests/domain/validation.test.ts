import { describe, expect, test } from '@jest/globals';

import {
    validateResponseIndex,
    validateSpeedMultiplier,
} from '../../src/domain/validation';

describe('validateResponseIndex', () => {
    test('1以上かつレス配列長以下の値を許可する', () => {
        const result = validateResponseIndex(2, 5);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBe(2);
        }
    });

    test('文字列由来の数値でも許可する', () => {
        const result = validateResponseIndex(Number('3'), 5);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBe(3);
        }
    });

    test('0や負数は拒否する', () => {
        const resultZero = validateResponseIndex(0, 5);
        const resultNegative = validateResponseIndex(-1, 5);

        expect(resultZero.success).toBe(false);
        expect(resultNegative.success).toBe(false);
    });

    test('上限を超える値は拒否する', () => {
        const result = validateResponseIndex(6, 5);

        expect(result.success).toBe(false);
    });

    test('小数は拒否する', () => {
        const result = validateResponseIndex(1.5, 5);

        expect(result.success).toBe(false);
    });

    test('レスが存在しない場合は常にエラーを返す', () => {
        const result = validateResponseIndex(1, 0);

        expect(result.success).toBe(false);
    });

    test('非常に大きな数値は拒否する', () => {
        const result = validateResponseIndex(Number.MAX_SAFE_INTEGER, 10);

        expect(result.success).toBe(false);
    });

    test('指数表記の数値でも検証できる', () => {
        const valid = validateResponseIndex(Number('1e1'), 20);
        const invalid = validateResponseIndex(Number('1e2'), 50);

        expect(valid.success).toBe(true);
        expect(invalid.success).toBe(false);
    });
});

describe('validateSpeedMultiplier', () => {
    test('正の有限数値を許可する', () => {
        const result = validateSpeedMultiplier(1.5);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBeCloseTo(1.5);
        }
    });

    test('極端に小さい正の値を許可する', () => {
        const result = validateSpeedMultiplier(0.01);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBeCloseTo(0.01);
        }
    });

    test('極端に大きい正の値を許可する', () => {
        const result = validateSpeedMultiplier(1000);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBeCloseTo(1000);
        }
    });

    test('0以下の値は拒否する', () => {
        const zero = validateSpeedMultiplier(0);
        const negative = validateSpeedMultiplier(-2);

        expect(zero.success).toBe(false);
        expect(negative.success).toBe(false);
    });

    test('NaNやInfinityは拒否する', () => {
        const nan = validateSpeedMultiplier(Number.NaN);
        const inf = validateSpeedMultiplier(Number.POSITIVE_INFINITY);

        expect(nan.success).toBe(false);
        expect(inf.success).toBe(false);
    });

    test('-0は拒否する', () => {
        const result = validateSpeedMultiplier(-0);

        expect(result.success).toBe(false);
    });

    test('指数表記の倍率も検証できる', () => {
        const small = validateSpeedMultiplier(1e-4);
        const large = validateSpeedMultiplier(1e4);

        expect(small.success).toBe(true);
        expect(large.success).toBe(true);
    });
});
