import { parseTimestamp } from '../parsers/timestamp';
import {
    ResponseEntry,
    StartPositionError,
    StartPositionResult,
    ThreadSettings,
} from '../types';

export function resolveStartPosition(
    settings: ThreadSettings,
    responses: ResponseEntry[],
): StartPositionResult {
    if (settings.startMode === 'index') {
        const targetIndex = settings.startResponseIndex;
        if (!Number.isInteger(targetIndex) || targetIndex < 0) {
            return failure({
                type: 'index_out_of_range',
                message: `レス番号が範囲外です（0〜${Math.max(
                    responses.length - 1,
                    0,
                )}）`,
                validRange: {
                    min: 0,
                    max: Math.max(responses.length - 1, 0),
                },
            });
        }

        const byResNo = responses.find((response) => {
            const resNo = extractResNo(response);
            return resNo !== null && resNo === targetIndex;
        });
        if (byResNo) {
            return success(byResNo.timestamp);
        }

        if (targetIndex >= responses.length) {
            return failure({
                type: 'index_out_of_range',
                message: `レス番号が範囲外です（0〜${Math.max(
                    responses.length - 1,
                    0,
                )}）`,
                validRange: {
                    min: 0,
                    max: Math.max(responses.length - 1, 0),
                },
            });
        }

        const target =
            responses.find((response) => response.index === targetIndex) ??
            responses[targetIndex];
        if (!target) {
            return failure({
                type: 'index_out_of_range',
                message: `レス番号が範囲外です（1〜${responses.length}）`,
                validRange: {
                    min: responses.length > 0 ? 1 : 0,
                    max: responses.length,
                },
            });
        }

        return success(target.timestamp);
    }

    if (settings.startMode === 'timestamp') {
        if (typeof settings.startValue !== 'string') {
            return failure({
                type: 'timestamp_parse_error',
                message:
                    '日時形式が不正です（例: 25/11/16(日)22:48:03 または 2025/11/16 22:48:03）',
                inputValue: String(settings.startValue),
            });
        }

        const parsed = parseTimestamp(settings.startValue, {
            skipWeekdayCheck: true,
        });
        if (!parsed) {
            return failure({
                type: 'timestamp_parse_error',
                message:
                    '日時形式が不正です（例: 25/11/16(日)22:48:03 または 2025/11/16 22:48:03）',
                inputValue: settings.startValue,
            });
        }
        return success(parsed);
    }

    // startMode === 'no'
    const targetNo = extractNo(settings.startValue);
    if (targetNo === null) {
        return failure({
            type: 'no_not_found',
            message: '指定されたNo.が見つかりません',
            searchedNo: String(settings.startValue),
        });
    }

    const matched = responses.find((response) => {
        const noText = findNoText(response);
        const responseNo = noText ? extractNo(noText) : null;
        return responseNo !== null && responseNo === targetNo;
    });

    if (!matched) {
        return failure({
            type: 'no_not_found',
            message: '指定されたNo.が見つかりません',
            searchedNo: typeof settings.startValue === 'string'
                ? settings.startValue
                : `No.${targetNo}`,
        });
    }

    return success(matched.timestamp);
}

function findNoText(response: ResponseEntry): string | null {
    const direct = response.element
        .querySelector('.cno')
        ?.textContent?.trim();
    if (direct) {
        return direct;
    }

    if (!response.allNodes) {
        return null;
    }

    for (const node of response.allNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.classList.contains('cno')) {
                return element.textContent?.trim() ?? null;
            }
            const nested = element.querySelector('.cno');
            if (nested?.textContent) {
                return nested.textContent.trim();
            }
        }
    }

    return null;
}

function extractNo(text: string | number): number | null {
    if (typeof text === 'number') {
        return Number.isInteger(text) ? text : null;
    }
    const match = text.trim().match(/No\.(\d+)/);
    if (!match) {
        return null;
    }
    const value = Number.parseInt(match[1], 10);
    return Number.isNaN(value) ? null : value;
}

function extractResNo(response: ResponseEntry): number | null {
    const fromElement = response.element
        .querySelector('.res_no')
        ?.textContent?.trim();
    const parsedFromElement = fromElement ? Number.parseInt(fromElement, 10) : NaN;
    if (!Number.isNaN(parsedFromElement)) {
        return parsedFromElement;
    }

    if (response.allNodes) {
        for (const node of response.allNodes) {
            if (node instanceof HTMLElement) {
                const res = node.querySelector('.res_no');
                if (res?.textContent) {
                    const parsed = Number.parseInt(res.textContent.trim(), 10);
                    if (!Number.isNaN(parsed)) {
                        return parsed;
                    }
                }
            }
        }
    }

    return null;
}

function success(
    value: Date,
): StartPositionResult {
    return { success: true, value };
}

function failure(
    error: StartPositionError,
): StartPositionResult {
    return { success: false, error };
}
