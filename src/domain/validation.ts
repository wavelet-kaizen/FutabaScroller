import { parseTimestamp } from '../parsers/timestamp';
import { Result, ValidationError } from '../types';

function failure<T = never>(error: ValidationError): Result<T, ValidationError> {
    return { success: false, error };
}

function success<T>(value: T): Result<T, ValidationError> {
    return { success: true, value };
}

export function validateResponseIndex(
    input: number,
    responsesLength: number,
): Result<number, ValidationError> {
    if (responsesLength < 1) {
        return failure({
            code: 'RESPONSE_ARRAY_EMPTY',
            message: 'レスが存在しません。スレッドを読み込んでから実行してください。',
            input: { input, responsesLength },
        });
    }

    if (!Number.isInteger(input)) {
        return failure({
            code: 'RESPONSE_INDEX_NOT_INTEGER',
            message: 'レス番号は整数で指定してください。',
            input,
        });
    }

    const maxIndex = Math.max(responsesLength - 1, 0);
    if (input < 0 || input > maxIndex) {
        return failure({
            code: 'RESPONSE_INDEX_OUT_OF_RANGE',
            message: `レス番号は 0〜${maxIndex} の範囲で指定してください。`,
            input,
        });
    }

    return success(input);
}

export function validateSpeedMultiplier(
    input: number,
): Result<number, ValidationError> {
    if (!Number.isFinite(input)) {
        return failure({
            code: 'SPEED_MULTIPLIER_NOT_FINITE',
            message: '再生速度は有限の数値で指定してください。',
            input,
        });
    }

    if (input <= 0) {
        return failure({
            code: 'SPEED_MULTIPLIER_NON_POSITIVE',
            message: '再生速度は0より大きい数値で指定してください。',
            input,
        });
    }

    return success(input);
}

export function validateTimestamp(
    timestamp: string,
): Result<Date, ValidationError> {
    const parsed = parseTimestamp(timestamp, { skipWeekdayCheck: true });
    if (!parsed) {
        return failure({
            code: 'TIMESTAMP_INVALID_FORMAT',
            message:
                "日時は `YY/MM/DD(曜)HH:MM:SS` または `YYYY/MM/DD HH:MM:SS` の形式で入力してください。",
            input: timestamp,
        });
    }

    return success(parsed);
}

export function validateNo(input: string): Result<string, ValidationError> {
    const trimmed = input.trim();
    const match = trimmed.match(/^No\.(\d+)$/);
    if (!match) {
        return failure({
            code: 'NO_INVALID_FORMAT',
            message: 'No.の形式が不正です。`No.123` のように入力してください。',
            input,
        });
    }

    const digits = match[1];
    return success(`No.${digits}`);
}

export function validateUrl(input: string): Result<string, ValidationError> {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return failure({
                code: 'URL_INVALID_FORMAT',
                message: 'URLは http または https で入力してください。',
                input,
            });
        }
        return success(url.toString());
    } catch {
        return failure({
            code: 'URL_INVALID_FORMAT',
            message: '有効なURLを入力してください。',
            input,
        });
    }
}
