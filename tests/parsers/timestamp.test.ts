import { describe, expect, test } from '@jest/globals';

import { parseTimestamp } from '../../src/parsers/timestamp';

describe('parseTimestamp', () => {
    test('有効なタイムスタンプ文字列をDateに変換できる', () => {
        const result = parseTimestamp('24/11/02(土)12:34:56');
        const expected = new Date(2024, 10, 2, 12, 34, 56);

        expect(result).not.toBeNull();
        expect(result?.getTime()).toBe(expected.getTime());
    });

    test('余分な空白があっても正しくパースできる', () => {
        const result = parseTimestamp(' 24/11/02(土)12:34:56 ');
        const expected = new Date(2024, 10, 2, 12, 34, 56);

        expect(result).not.toBeNull();
        expect(result?.getTime()).toBe(expected.getTime());
    });

    test('00年代初頭の日付を正しくパースできる', () => {
        const result = parseTimestamp('00/01/01(土)00:00:00');
        const expected = new Date(2000, 0, 1, 0, 0, 0);

        expect(result).not.toBeNull();
        expect(result?.getTime()).toBe(expected.getTime());
    });

    test('閏年の2月29日を正しくパースできる', () => {
        const result = parseTimestamp('24/02/29(木)12:00:00');
        const expected = new Date(2024, 1, 29, 12, 0, 0);

        expect(result).not.toBeNull();
        expect(result?.getTime()).toBe(expected.getTime());
    });

    test('日付境界の時刻を正しくパースできる', () => {
        const result = parseTimestamp('24/12/31(火)23:59:59');
        const expected = new Date(2024, 11, 31, 23, 59, 59);

        expect(result).not.toBeNull();
        expect(result?.getTime()).toBe(expected.getTime());
    });

    test('曜日が一致しない場合はnullを返す', () => {
        const result = parseTimestamp('24/11/02(日)12:34:56');

        expect(result).toBeNull();
    });

    test('存在しない日付の場合はnullを返す', () => {
        const result = parseTimestamp('24/02/30(金)12:34:56');

        expect(result).toBeNull();
    });

    test('フォーマットが不正な場合はnullを返す', () => {
        const result = parseTimestamp('invalid');

        expect(result).toBeNull();
    });

    test('時刻部分が欠けている場合はnullを返す', () => {
        const result = parseTimestamp('24/11/02(土)');

        expect(result).toBeNull();
    });
});
