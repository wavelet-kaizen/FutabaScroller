const TIMESTAMP_PATTERN =
    /^(\d{2})\/(\d{2})\/(\d{2})\((.)\)(\d{2}):(\d{2}):(\d{2})$/;
const FLEXIBLE_TIMESTAMP_PATTERN =
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export interface ParseTimestampOptions {
    /**
     * 曜日チェックをスキップするかどうか。
     * trueの場合、曜日不一致でもDateを返す。
     */
    skipWeekdayCheck?: boolean;
}

/**
 * Futaba のタイムスタンプ文字列を Date に変換する。
 * - `YY/MM/DD(曜)HH:MM:SS` (曜日付き)
 * - `YYYY/MM/DD HH:MM:SS` (4桁年・曜日なし)
 */
export function parseTimestamp(
    text: string,
    options: ParseTimestampOptions = {},
): Date | null {
    const trimmed = text.trim();
    const match = trimmed.match(TIMESTAMP_PATTERN);

    if (match) {
        const [, yy, mm, dd, weekday, hh, min, ss] = match;
        const year = 2000 + Number.parseInt(yy, 10);
        return buildDate(
            year,
            Number.parseInt(mm, 10) - 1,
            Number.parseInt(dd, 10),
            Number.parseInt(hh, 10),
            Number.parseInt(min, 10),
            Number.parseInt(ss, 10),
            options.skipWeekdayCheck ? null : weekday,
        );
    }

    const flexibleMatch = trimmed.match(FLEXIBLE_TIMESTAMP_PATTERN);
    if (flexibleMatch) {
        const [, yyyy, mm, dd, hh, min, ss] = flexibleMatch;
        return buildDate(
            Number.parseInt(yyyy, 10),
            Number.parseInt(mm, 10) - 1,
            Number.parseInt(dd, 10),
            Number.parseInt(hh, 10),
            Number.parseInt(min, 10),
            Number.parseInt(ss, 10),
        );
    }

    return null;
}

function buildDate(
    year: number,
    monthIndex: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    weekdayIfNeeded: string | null = null,
): Date | null {
    if (
        Number.isNaN(year) ||
        Number.isNaN(monthIndex) ||
        Number.isNaN(day) ||
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        Number.isNaN(second)
    ) {
        return null;
    }

    const date = new Date(year, monthIndex, day, hour, minute, second, 0);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== monthIndex ||
        date.getDate() !== day ||
        date.getHours() !== hour ||
        date.getMinutes() !== minute ||
        date.getSeconds() !== second
    ) {
        return null;
    }

    if (weekdayIfNeeded && WEEKDAYS[date.getDay()] !== weekdayIfNeeded) {
        return null;
    }

    return date;
}
