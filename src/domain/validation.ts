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

    if (input < 1 || input > responsesLength) {
        return failure({
            code: 'RESPONSE_INDEX_OUT_OF_RANGE',
            message: `レス番号は 1〜${responsesLength} の範囲で指定してください。`,
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
