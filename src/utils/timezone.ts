type DateParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

const DEFAULT_TIME_ZONE = 'Asia/Seoul';

const getTimeZone = (): string => {
    return process.env.LOG_TIMEZONE || process.env.TZ || DEFAULT_TIME_ZONE;
};

const getZonedParts = (date: Date, timeZone: string): DateParts => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    }

    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute),
        second: Number(map.second),
    };
};

const getTimeZoneOffsetMinutes = (date: Date, timeZone: string): number => {
    const parts = getZonedParts(date, timeZone);
    const asUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );
    return (asUtc - date.getTime()) / 60000;
};

const zonedTimeToUtc = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    timeZone: string
): Date => {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
    return new Date(utcGuess.getTime() - offsetMinutes * 60000);
};

export const getDateKey = (date = new Date()): string => {
    const timeZone = getTimeZone();
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

export const getSecondsUntilEndOfDay = (date = new Date()): number => {
    const timeZone = getTimeZone();
    const parts = getZonedParts(date, timeZone);
    const endOfDayUtc = zonedTimeToUtc(parts.year, parts.month, parts.day + 1, 0, 0, 0, timeZone);
    return Math.max(0, Math.floor((endOfDayUtc.getTime() - date.getTime()) / 1000));
};

export const formatLogTimestamp = (date = new Date()): string => {
    const timeZone = getTimeZone();
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
};
