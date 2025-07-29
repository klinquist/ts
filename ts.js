#! /usr/local/bin/node

let ts = process.argv[2];
let timezone = null;
let outputFormat = "table";

// Check for output format flag
const outputIndex = process.argv.indexOf("--output");
if (outputIndex !== -1 && process.argv[outputIndex + 1]) {
  outputFormat = process.argv[outputIndex + 1];
}

// Check for timezone flag
const tzIndex = process.argv.indexOf("--tz");
if (tzIndex !== -1 && process.argv[tzIndex + 1]) {
  timezone = process.argv[tzIndex + 1];
}

// Extract the actual input by removing flags and their values
const args = process.argv.slice(2);
const filteredArgs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" || args[i] === "--tz") {
    i++; // Skip the flag value
  } else {
    filteredArgs.push(args[i]);
  }
}

ts = filteredArgs.length > 0 ? filteredArgs.join(" ") : null;

const isUnixTimestamp = (input) => /^\d{10,19}$/.test(input);
const isISOTimestamp = (input) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(input);
const isRelativeTime = (input) =>
  /^[+-]\d+\s*(second|minute|hour|day|week|month|year)s?$/i.test(input);

const parseRelativeTime = (input) => {
  const regex = /^([+-])(\d+)\s*(second|minute|hour|day|week|month|year)s?$/i;
  const match = input.match(regex);

  if (!match) {
    throw new Error(
      "Invalid relative time format. Use: +/-<number><unit> (e.g., +1day, -2hours)"
    );
  }

  const [_, operator, amount, unit] = match;
  const numAmount = parseInt(amount);
  const isAdd = operator === "+";

  const now = new Date();
  let resultDate;

  switch (unit.toLowerCase()) {
    case "s":
    case "second":
    case "seconds":
      resultDate = new Date(
        now.getTime() + (isAdd ? numAmount : -numAmount) * 1000
      );
      break;
    case "m":
    case "minute":
    case "minutes":
      resultDate = new Date(
        now.getTime() + (isAdd ? numAmount : -numAmount) * 60 * 1000
      );
      break;
    case "h":
    case "hour":
    case "hours":
      resultDate = new Date(
        now.getTime() + (isAdd ? numAmount : -numAmount) * 60 * 60 * 1000
      );
      break;
    case "d":
    case "day":
    case "days":
      resultDate = new Date(
        now.getTime() + (isAdd ? numAmount : -numAmount) * 24 * 60 * 60 * 1000
      );
      break;
    case "w":
    case "week":
    case "weeks":
      resultDate = new Date(
        now.getTime() +
          (isAdd ? numAmount : -numAmount) * 7 * 24 * 60 * 60 * 1000
      );
      break;
    case "m":
    case "month":
    case "months":
      resultDate = new Date(
        now.getFullYear(),
        now.getMonth() + (isAdd ? numAmount : -numAmount),
        now.getDate()
      );
      break;
    case "y":
    case "year":
    case "years":
      resultDate = new Date(
        now.getFullYear() + (isAdd ? numAmount : -numAmount),
        now.getMonth(),
        now.getDate()
      );
      break;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }

  return {
    unixSeconds: Math.floor(resultDate.getTime() / 1000),
    unixMilliseconds: resultDate.getTime(),
    utcISO: resultDate.toISOString(),
  };
};

const formatUnixTimestamp = (timestamp, tz = null) => {
  const msTimestamp = timestamp.padEnd(13, "0").slice(0, 13); // Pad to milliseconds if needed
  const date = new Date(Number(msTimestamp));
  const targetTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    localTime: date.toLocaleString("en-US", {
      timeZone: targetTz,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    utcISO: date.toISOString(),
    timezone: targetTz,
  };
};
const getTimeZoneOffset = (timeZone, date = new Date()) => {
  const localTime = date.getTime();
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return (localTime - tzDate.getTime()) / 60000; // Offset in minutes
};

const parseDateString = (input, tz = null) => {
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(am|pm)$/i;
  const match = input.match(dateRegex);

  if (!match) {
    throw new Error("Invalid date string or timestamp.");
  }

  let [_, year, month, day, hour, minute, period] = match;
  year = Number(year);
  month = Number(month);
  day = Number(day);
  hour = Number(hour);
  minute = Number(minute);

  // Adjust for AM/PM
  if (period.toLowerCase() === "pm" && hour !== 12) {
    hour += 12;
  } else if (period.toLowerCase() === "am" && hour === 12) {
    hour = 0;
  }

  // Create a Date object using specified timezone or local timezone
  const targetTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Create the date string in the target timezone
  const dateString = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}:00`;

  // Create a date object and convert it to the target timezone
  const localDate = new Date(dateString);

  // Get the timezone offset for the target timezone
  const targetOffset = getTimeZoneOffset(targetTz, localDate);
  const localOffset = localDate.getTimezoneOffset();
  const offsetDiff = targetOffset - localOffset;

  // Adjust the date by the timezone difference
  const adjustedDate = new Date(localDate.getTime() + offsetDiff * 60 * 1000);

  if (isNaN(adjustedDate.getTime())) {
    throw new Error("Invalid date. Please check the day, month, and year.");
  }

  return {
    unixSeconds: Math.floor(adjustedDate.getTime() / 1000),
    unixMilliseconds: adjustedDate.getTime(),
    utcISO: adjustedDate.toISOString(),
  };
};

const getTimeDifference = (timestamp) => {
  const now = Date.now();
  const diffMs = Math.abs(now - timestamp);
  const diffSeconds = Math.floor(diffMs / 1000);
  const isInFuture = timestamp > now;

  if (diffSeconds < 90) {
    return `${diffSeconds} second${diffSeconds !== 1 ? "s" : ""} ${
      isInFuture ? "in the future" : "ago"
    }`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  let parts = [];

  if (diffDays > 0) {
    parts.push(`${diffDays} day${diffDays !== 1 ? "s" : ""}`);
    const remainingHours = diffHours % 24;
    if (remainingHours > 0) {
      parts.push(`${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`);
    }
    const remainingMinutes = diffMinutes % 60;
    if (remainingMinutes > 0 && parts.length < 2) {
      parts.push(
        `${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`
      );
    }
  } else if (diffHours > 0) {
    parts.push(`${diffHours} hour${diffHours !== 1 ? "s" : ""}`);
    const remainingMinutes = diffMinutes % 60;
    if (remainingMinutes > 0) {
      parts.push(
        `${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`
      );
    }
  } else {
    parts.push(`${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`);
  }

  return parts.join(", ") + (isInFuture ? " in the future" : " ago");
};

const parseISOTimestamp = (input) => {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date string or timestamp.");
  }
  return {
    unixSeconds: Math.floor(date.getTime() / 1000),
    unixMilliseconds: date.getTime(),
    utcISO: date.toISOString(),
  };
};

const parseInput = (input, tz = null, format = "table") => {
  if (isUnixTimestamp(input)) {
    const { localTime, utcISO, timezone } = formatUnixTimestamp(input, tz);
    const msTimestamp = input.padEnd(13, "0").slice(0, 13);
    const timeDiff = getTimeDifference(Number(msTimestamp));

    if (format === "json") {
      return JSON.stringify(
        {
          unixSeconds: Math.floor(Number(msTimestamp) / 1000),
          unixMilliseconds: Number(msTimestamp),
          utcISO,
          localTime,
          timezone,
          timeDifference: timeDiff,
        },
        null,
        2
      );
    }

    let output =
      "┌─────────────────────┬─────────────────────────────────────┐\n";
    output += "│ Format              │ Value                               │\n";
    output += "├─────────────────────┼─────────────────────────────────────┤\n";
    output += `│ ${timezone.padEnd(19)} │ ${localTime.padEnd(35)} │\n`;
    output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
    output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
    output += "└─────────────────────┴─────────────────────────────────────┘";
    return output;
  }
  if (isISOTimestamp(input)) {
    const { unixSeconds, unixMilliseconds, utcISO } = parseISOTimestamp(input);
    const timeDiff = getTimeDifference(unixMilliseconds);

    if (format === "json") {
      return JSON.stringify(
        {
          unixSeconds,
          unixMilliseconds,
          utcISO,
          timeDifference: timeDiff,
        },
        null,
        2
      );
    }

    let output =
      "┌─────────────────────┬─────────────────────────────────────┐\n";
    output += "│ Format              │ Value                               │\n";
    output += "├─────────────────────┼─────────────────────────────────────┤\n";
    output += `│ Unix (seconds)      │ ${unixSeconds
      .toString()
      .padEnd(35)} │\n`;
    output += `│ Unix (milliseconds) │ ${unixMilliseconds
      .toString()
      .padEnd(35)} │\n`;
    output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
    output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
    output += "└─────────────────────┴─────────────────────────────────────┘";
    return output;
  }
  if (isRelativeTime(input)) {
    const { unixSeconds, unixMilliseconds, utcISO } = parseRelativeTime(input);
    const timeDiff = getTimeDifference(unixMilliseconds);

    if (format === "json") {
      return JSON.stringify(
        {
          unixSeconds,
          unixMilliseconds,
          utcISO,
          timeDifference: timeDiff,
        },
        null,
        2
      );
    }

    let output =
      "┌─────────────────────┬─────────────────────────────────────┐\n";
    output += "│ Format              │ Value                               │\n";
    output += "├─────────────────────┼─────────────────────────────────────┤\n";
    output += `│ Unix (seconds)      │ ${unixSeconds
      .toString()
      .padEnd(35)} │\n`;
    output += `│ Unix (milliseconds) │ ${unixMilliseconds
      .toString()
      .padEnd(35)} │\n`;
    output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
    output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
    output += "└─────────────────────┴─────────────────────────────────────┘";
    return output;
  }
  const { unixSeconds, unixMilliseconds, utcISO } = parseDateString(input, tz);
  const timeDiff = getTimeDifference(unixMilliseconds);

  if (format === "json") {
    return JSON.stringify(
      {
        unixSeconds,
        unixMilliseconds,
        utcISO,
        timeDifference: timeDiff,
      },
      null,
      2
    );
  }

  let output =
    "┌─────────────────────┬─────────────────────────────────────┐\n";
  output += "│ Format              │ Value                               │\n";
  output += "├─────────────────────┼─────────────────────────────────────┤\n";
  output += `│ Unix (seconds)      │ ${unixSeconds.toString().padEnd(35)} │\n`;
  output += `│ Unix (milliseconds) │ ${unixMilliseconds
    .toString()
    .padEnd(35)} │\n`;
  output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
  output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
  output += "└─────────────────────┴─────────────────────────────────────┘";
  return output;
};

try {
  if (!ts) {
    if (outputFormat === "json") {
      const now = Date.now();
      const currentDate = new Date(now);
      const targetTz =
        timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      const result = {
        unixSeconds: Math.floor(now / 1000),
        unixMilliseconds: now,
        utcISO: currentDate.toISOString(),
      };

      if (timezone) {
        const tzTime = currentDate.toLocaleString("en-US", {
          timeZone: targetTz,
        });
        result.localTime = tzTime;
        result.timezone = targetTz;
      }

      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        'Usage: ts <unix timestamp | ISO timestamp | "yyyy-MM-dd h:mma" | +/-<number><unit>> [--tz timezone] [--output json]'
      );
      console.log("Examples:");
      console.log("  ts                          # Show current time");
      console.log("  ts 1705123456               # Convert Unix timestamp");
      console.log("  ts 2024-01-13T10:30:00Z     # Convert ISO timestamp");
      console.log(
        '  ts "2024-01-13 10:30am"     # Convert date string (local timezone)'
      );
      console.log("  ts 1705123456 --tz UTC      # Convert with timezone");
      console.log("  ts +1day                    # Add 1 day to current time");
      console.log(
        "  ts -2hours                  # Subtract 2 hours from current time"
      );
      console.log("  ts 1705123456 --output json # Output as JSON");
      console.log("");
      const now = Date.now();
      const currentDate = new Date(now);
      const targetTz =
        timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log(
        "┌─────────────────────┬─────────────────────────────────────┐"
      );
      console.log(
        "│ Format              │ Current Time                        │"
      );
      console.log(
        "├─────────────────────┼─────────────────────────────────────┤"
      );
      console.log(
        `│ Unix (seconds)      │ ${Math.floor(now / 1000)
          .toString()
          .padEnd(35)} │`
      );
      console.log(`│ Unix (milliseconds) │ ${now.toString().padEnd(35)} │`);
      console.log(
        `│ ISO timestamp       │ ${currentDate.toISOString().padEnd(35)} │`
      );
      if (timezone) {
        const tzTime = currentDate.toLocaleString("en-US", {
          timeZone: targetTz,
        });
        console.log(`│ ${targetTz.padEnd(19)} │ ${tzTime.padEnd(35)} │`);
      }
      console.log(
        "└─────────────────────┴─────────────────────────────────────┘"
      );
    }
  } else {
    if (ts && ts.trim()) {
      console.log(parseInput(ts, timezone, outputFormat));
    } else {
      if (outputFormat === "json") {
        const now = Date.now();
        const currentDate = new Date(now);
        const targetTz =
          timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

        const result = {
          unixSeconds: Math.floor(now / 1000),
          unixMilliseconds: now,
          utcISO: currentDate.toISOString(),
        };

        if (timezone) {
          const tzTime = currentDate.toLocaleString("en-US", {
            timeZone: targetTz,
          });
          result.localTime = tzTime;
          result.timezone = targetTz;
        }

        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(
          'Usage: ts <unix timestamp | ISO timestamp | "yyyy-MM-dd h:mma" | +/-<number><unit>> [--tz timezone] [--output json]'
        );
        console.log("Examples:");
        console.log("  ts                          # Show current time");
        console.log("  ts 1705123456               # Convert Unix timestamp");
        console.log("  ts 2024-01-13T10:30:00Z     # Convert ISO timestamp");
        console.log(
          '  ts "2024-01-13 10:30am"     # Convert date string (local timezone)'
        );
        console.log("  ts 1705123456 --tz UTC      # Convert with timezone");
        console.log(
          "  ts +1day                    # Add 1 day to current time"
        );
        console.log(
          "  ts -2hours                  # Subtract 2 hours from current time"
        );
        console.log("  ts 1705123456 --output json # Output as JSON");
        console.log("");
        const now = Date.now();
        const currentDate = new Date(now);
        const targetTz =
          timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(
          "┌─────────────────────┬─────────────────────────────────────┐"
        );
        console.log(
          "│ Format              │ Current Time                        │"
        );
        console.log(
          "├─────────────────────┼─────────────────────────────────────┤"
        );
        console.log(
          `│ Unix (seconds)      │ ${Math.floor(now / 1000)
            .toString()
            .padEnd(35)} │`
        );
        console.log(`│ Unix (milliseconds) │ ${now.toString().padEnd(35)} │`);
        console.log(
          `│ ISO timestamp       │ ${currentDate.toISOString().padEnd(35)} │`
        );
        if (timezone) {
          const tzTime = currentDate.toLocaleString("en-US", {
            timeZone: targetTz,
          });
          console.log(`│ ${targetTz.padEnd(19)} │ ${tzTime.padEnd(35)} │`);
        }
        console.log(
          "└─────────────────────┴─────────────────────────────────────┘"
        );
      }
    }
  }
} catch (error) {
  if (outputFormat === "json") {
    console.error(JSON.stringify({ error: error.message }, null, 2));
  } else {
    console.error(`Error: ${error.message}`);
    console.log(
      '\nUsage: ts <unix timestamp | ISO timestamp | "yyyy-MM-dd h:mma" | +/-<number><unit>> [--tz timezone] [--output json]'
    );
    console.log("Examples:");
    console.log("  ts                           # Show current time");
    console.log("  ts 1705123456               # Convert Unix timestamp");
    console.log("  ts 2024-01-13T10:30:00Z     # Convert ISO timestamp");
    console.log(
      '  ts "2024-01-13 10:30am"     # Convert date string (local timezone)'
    );
    console.log("  ts 1705123456 --tz UTC      # Convert with timezone");
    console.log("  ts +1day                     # Add 1 day to current time");
    console.log(
      "  ts -2hours                   # Subtract 2 hours from current time"
    );
    console.log("  ts 1705123456 --output json # Output as JSON");
  }
}
