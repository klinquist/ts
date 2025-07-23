#! /usr/local/bin/node

let ts = process.argv[2];
let timezone = null;

// Check for timezone flag
const tzIndex = process.argv.indexOf('--tz');
if (tzIndex !== -1 && process.argv[tzIndex + 1]) {
    timezone = process.argv[tzIndex + 1];
    // Remove timezone args from input
    const args = process.argv.slice(2);
    args.splice(tzIndex - 2, 2);
    ts = args.length > 0 ? args.join(' ') : null;
} else if (process.argv[3] && !process.argv[3].startsWith('--')) {
    ts = process.argv.slice(2).join(' ');
}

const isUnixTimestamp = input => /^\d{10,19}$/.test(input);
const isISOTimestamp = input => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(input);

const formatUnixTimestamp = (timestamp, tz = null) => {
    const msTimestamp = timestamp.padEnd(13, '0').slice(0, 13); // Pad to milliseconds if needed
    const date = new Date(Number(msTimestamp));
    const targetTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
        localTime: date.toLocaleString('en-US', {
            timeZone: targetTz,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
        utcISO: date.toISOString(),
        timezone: targetTz,
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
        throw new Error('Invalid date string or timestamp.');
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

const getTimeDifference = (timestamp) => {
    const now = Date.now();
    const diffMs = Math.abs(now - timestamp);
    const diffSeconds = Math.floor(diffMs / 1000);
    const isInFuture = timestamp > now;
    
    if (diffSeconds < 90) {
        return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ${isInFuture ? 'in the future' : 'ago'}`;
    }
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    let parts = [];
    
    if (diffDays > 0) {
        parts.push(`${diffDays} day${diffDays !== 1 ? 's' : ''}`);
        const remainingHours = diffHours % 24;
        if (remainingHours > 0) {
            parts.push(`${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`);
        }
        const remainingMinutes = diffMinutes % 60;
        if (remainingMinutes > 0 && parts.length < 2) {
            parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`);
        }
    } else if (diffHours > 0) {
        parts.push(`${diffHours} hour${diffHours !== 1 ? 's' : ''}`);
        const remainingMinutes = diffMinutes % 60;
        if (remainingMinutes > 0) {
            parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`);
        }
    } else {
        parts.push(`${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`);
    }
    
    return parts.join(', ') + (isInFuture ? ' in the future' : ' ago');
};

const parseISOTimestamp = input => {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date string or timestamp.');
    }
    return {
        unixSeconds: Math.floor(date.getTime() / 1000),
        unixMilliseconds: date.getTime(),
        utcISO: date.toISOString(),
    };
};

const parseInput = (input, tz = null) => {
    if (isUnixTimestamp(input)) {
        const { localTime, utcISO, timezone } = formatUnixTimestamp(input, tz);
        const msTimestamp = input.padEnd(13, '0').slice(0, 13);
        const timeDiff = getTimeDifference(Number(msTimestamp));
        let output = '┌─────────────────────┬─────────────────────────────────────┐\n';
        output += '│ Format              │ Value                               │\n';
        output += '├─────────────────────┼─────────────────────────────────────┤\n';
        output += `│ ${timezone.padEnd(19)} │ ${localTime.padEnd(35)} │\n`;
        output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
        output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
        output += '└─────────────────────┴─────────────────────────────────────┘';
        return output;
    }
    if (isISOTimestamp(input)) {
        const { unixSeconds, unixMilliseconds, utcISO } = parseISOTimestamp(input);
        const timeDiff = getTimeDifference(unixMilliseconds);
        let output = '┌─────────────────────┬─────────────────────────────────────┐\n';
        output += '│ Format              │ Value                               │\n';
        output += '├─────────────────────┼─────────────────────────────────────┤\n';
        output += `│ Unix (seconds)      │ ${unixSeconds.toString().padEnd(35)} │\n`;
        output += `│ Unix (milliseconds) │ ${unixMilliseconds.toString().padEnd(35)} │\n`;
        output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
        output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
        output += '└─────────────────────┴─────────────────────────────────────┘';
        return output;
    }
    const { unixSeconds, unixMilliseconds, utcISO } = parseDateString(input);
    const timeDiff = getTimeDifference(unixMilliseconds);
    let output = '┌─────────────────────┬─────────────────────────────────────┐\n';
    output += '│ Format              │ Value                               │\n';
    output += '├─────────────────────┼─────────────────────────────────────┤\n';
    output += `│ Unix (seconds)      │ ${unixSeconds.toString().padEnd(35)} │\n`;
    output += `│ Unix (milliseconds) │ ${unixMilliseconds.toString().padEnd(35)} │\n`;
    output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
    output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
    output += '└─────────────────────┴─────────────────────────────────────┘';
    return output;
};

try {
    if (!ts) {
        console.log('Usage: ts <unix timestamp | ISO timestamp | "yyyy-MM-dd h:mma"> [--tz timezone]');
        console.log('Examples:');
        console.log('  ts                           # Show current time');
        console.log('  ts 1705123456               # Convert Unix timestamp');
        console.log('  ts 2024-01-13T10:30:00Z     # Convert ISO timestamp');
        console.log('  ts "2024-01-13 10:30am"     # Convert date string (PST)');
        console.log('  ts 1705123456 --tz UTC      # Convert with timezone');
        console.log('');
        const now = Date.now();
        const currentDate = new Date(now);
        const targetTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('┌─────────────────────┬─────────────────────────────────────┐');
        console.log('│ Format              │ Current Time                        │');
        console.log('├─────────────────────┼─────────────────────────────────────┤');
        console.log(`│ Unix (seconds)      │ ${Math.floor(now / 1000).toString().padEnd(35)} │`);
        console.log(`│ Unix (milliseconds) │ ${now.toString().padEnd(35)} │`);
        console.log(`│ ISO timestamp       │ ${currentDate.toISOString().padEnd(35)} │`);
        if (timezone) {
            const tzTime = currentDate.toLocaleString('en-US', { timeZone: targetTz });
            console.log(`│ ${targetTz.padEnd(19)} │ ${tzTime.padEnd(35)} │`);
        }
        console.log('└─────────────────────┴─────────────────────────────────────┘');
    } else {
        console.log(parseInput(ts, timezone));
    }
} catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('\nUsage: ts <unix timestamp | ISO timestamp | "yyyy-MM-dd h:mma"> [--tz timezone]');
    console.log('Examples:');
    console.log('  ts                           # Show current time');
    console.log('  ts 1705123456               # Convert Unix timestamp');
    console.log('  ts 2024-01-13T10:30:00Z     # Convert ISO timestamp');
    console.log('  ts "2024-01-13 10:30am"     # Convert date string (PST)');
    console.log('  ts 1705123456 --tz UTC      # Convert with timezone');
}