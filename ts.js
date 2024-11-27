#! /usr/local/bin/node

let ts = process.argv[2];

if (process.argv[3]) {
    ts = process.argv.slice(2).join(' ');
}

const isUnixTimestamp = input => /^\d{10,19}$/.test(input);

const formatUnixTimestamp = timestamp => {
    const msTimestamp = timestamp.padEnd(13, '0').slice(0, 13); // Pad to milliseconds if needed
    const date = new Date(Number(msTimestamp));
    return {
        localTime: date.toLocaleString('en-US', {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
        utcISO: date.toISOString(),
    };
};
const getTimeZoneOffset = (timeZone, date = new Date()) => {
    const localTime = date.getTime();
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return (localTime - tzDate.getTime()) / 60000; // Offset in minutes
};

const parseDateString = input => {
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(am|pm)$/i;
    const match = input.match(dateRegex);

    if (!match) {
        throw new Error('Invalid date string. Use "yyyy-MM-dd h:mma".');
    }

    let [_, year, month, day, hour, minute, period] = match;
    year = Number(year);
    month = Number(month);
    day = Number(day);
    hour = Number(hour);
    minute = Number(minute);

    // Adjust for AM/PM
    if (period.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
    } else if (period.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
    }

    // Create a Date object assuming America/Los_Angeles time zone
    const localDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    const localDate = new Date(localDateString + '-08:00'); // Hardcode PST offset (-08:00)

    if (isNaN(localDate.getTime())) {
        throw new Error('Invalid date. Please check the day, month, and year.');
    }

    return {
        unixSeconds: Math.floor(localDate.getTime() / 1000),
        unixMilliseconds: localDate.getTime(),
        utcISO: localDate.toISOString(),
    };
};

const parseInput = input => {
    if (isUnixTimestamp(input)) {
        const { localTime, utcISO } = formatUnixTimestamp(input);
        return `Time in your timezone: ${localTime}\nUTC ISO timestamp: ${utcISO}`;
    }
    const { unixSeconds, unixMilliseconds, utcISO } = parseDateString(input);
    return `Unix time (seconds): ${unixSeconds}\nUnix time (milliseconds): ${unixMilliseconds}\nUTC ISO timestamp: ${utcISO}`;
};

try {
    if (!ts) {
        console.log('Usage: ts <unix timestamp | "yyyy-MM-dd h:mma">');
        const now = Date.now();
        console.log(`Current time in seconds: ${Math.floor(now / 1000)}\nCurrent time in milliseconds: ${now}`);
    } else {
        console.log(parseInput(ts));
    }
} catch (error) {
    console.error(`Error: ${error.message}`);
}