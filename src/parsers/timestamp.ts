const TIMESTAMP_PATTERN =
    /^(\d{2})\/(\d{2})\/(\d{2})\((.)\)(\d{2}):(\d{2}):(\d{2})$/;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** Futaba のタイムスタンプ文字列 (YY/MM/DD(曜)HH:MM:SS) を Date に変換する。 */
export function parseTimestamp(text: string): Date | null {
    const trimmed = text.trim();
    const match = trimmed.match(TIMESTAMP_PATTERN);
    if (!match) {
        return null;
    }

    const [, yy, mm, dd, weekday, hh, min, ss] = match;
    const year = 2000 + Number.parseInt(yy, 10);
    const monthIndex = Number.parseInt(mm, 10) - 1;
    const day = Number.parseInt(dd, 10);
    const hour = Number.parseInt(hh, 10);
    const minute = Number.parseInt(min, 10);
    const second = Number.parseInt(ss, 10);

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

    // Date コンストラクタはローカルタイムとして解釈される。
    const date = new Date(year, monthIndex, day, hour, minute, second, 0);

    // 不正な日付 (例: 2024-02-30) を排除。
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

    // 曜日チェック。
    if (WEEKDAYS[date.getDay()] !== weekday) {
        return null;
    }

    return date;
}
