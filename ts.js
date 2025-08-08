#! /usr/local/bin/node

let ts = process.argv[2];
let timezone = null;
let outputFormat = "table";

// Check for output format flag
const outputIndex = process.argv.indexOf("--output");
if (outputIndex !== -1 && process.argv[outputIndex + 1]) {
  outputFormat = process.argv[outputIndex + 1];
}

// Check for timezone flag (will process after functions are defined)
const tzIndex = process.argv.indexOf("--tz");
if (tzIndex !== -1 && process.argv[tzIndex + 1]) {
  timezone = process.argv[tzIndex + 1]; // Store raw input for now
}

// Check for list-timezones flag
if (process.argv.includes("--list-timezones")) {
  const availableTimezones = Intl.supportedValuesOf('timeZone');
  console.log("Available timezones:");
  console.log("====================");
  console.log("\nCommon shortcuts:");
  console.log("  pacific, central, mountain, eastern");
  console.log("  pst, cst, mst, est");
  console.log("  utc, gmt");
  console.log("  Common cities: denver, chicago, nyc, la, london, paris, tokyo, etc.");
  console.log("\nFull IANA timezone list:");
  availableTimezones.forEach(tz => console.log(`  ${tz}`));
  process.exit(0);
}

// Extract the actual input by removing flags and their values
const args = process.argv.slice(2);
const filteredArgs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" || args[i] === "--tz") {
    i++; // Skip the flag value
  } else if (args[i] === "--list-timezones") {
    // Skip this flag (no value)
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

const findTimezone = (input) => {
  if (!input) return null;
  
  // Get all available timezones
  const availableTimezones = Intl.supportedValuesOf('timeZone');
  
  // Common city/region mappings for fuzzy matching
  const cityMappings = {
    // US Timezone abbreviations and names
    'pacific': 'America/Los_Angeles',
    'central': 'America/Chicago',
    'mountain': 'America/Denver', 
    'eastern': 'America/New_York',
    'est': 'America/New_York',
    'cst': 'America/Chicago', 
    'mst': 'America/Denver',
    'pst': 'America/Los_Angeles',
    
    // North America cities - Top 20 US cities by population
    'new york': 'America/New_York',
    'newyork': 'America/New_York',
    'nyc': 'America/New_York',
    'la': 'America/Los_Angeles',
    'los angeles': 'America/Los_Angeles',
    'losangeles': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'houston': 'America/Chicago',
    'phoenix': 'America/Phoenix',
    'philadelphia': 'America/New_York',
    'san antonio': 'America/Chicago',
    'sanantonio': 'America/Chicago',
    'san diego': 'America/Los_Angeles',
    'sandiego': 'America/Los_Angeles',
    'dallas': 'America/Chicago',
    'austin': 'America/Chicago',
    'san jose': 'America/Los_Angeles',
    'sanjose': 'America/Los_Angeles',
    'fort worth': 'America/Chicago',
    'fortworth': 'America/Chicago',
    'jacksonville': 'America/New_York',
    'charlotte': 'America/New_York',
    'columbus': 'America/New_York',
    'indianapolis': 'America/New_York',
    'sf': 'America/Los_Angeles',
    'san francisco': 'America/Los_Angeles',
    'sanfrancisco': 'America/Los_Angeles',
    'seattle': 'America/Los_Angeles',
    'denver': 'America/Denver',
    'oklahoma city': 'America/Chicago',
    'oklahomacity': 'America/Chicago',
    'nashville': 'America/Chicago',
    'el paso': 'America/Denver',
    'elpaso': 'America/Denver',
    'boston': 'America/New_York',
    'portland': 'America/Los_Angeles',
    'vegas': 'America/Los_Angeles',
    'las vegas': 'America/Los_Angeles',
    'lasvegas': 'America/Los_Angeles',
    'detroit': 'America/New_York',
    'memphis': 'America/Chicago',
    'louisville': 'America/New_York',
    'baltimore': 'America/New_York',
    'milwaukee': 'America/Chicago',
    'albuquerque': 'America/Denver',
    'tucson': 'America/Phoenix',
    'fresno': 'America/Los_Angeles',
    'mesa': 'America/Phoenix',
    'sacramento': 'America/Los_Angeles',
    'atlanta': 'America/New_York',
    'kansas city': 'America/Chicago',
    'kansascity': 'America/Chicago',
    'colorado springs': 'America/Denver',
    'coloradosprings': 'America/Denver',
    'miami': 'America/New_York',
    'raleigh': 'America/New_York',
    'omaha': 'America/Chicago',
    'long beach': 'America/Los_Angeles',
    'longbeach': 'America/Los_Angeles',
    'virginia beach': 'America/New_York',
    'virginiabeach': 'America/New_York',
    'toronto': 'America/Toronto',
    'vancouver': 'America/Vancouver',
    'montreal': 'America/Montreal',
    'mexico city': 'America/Mexico_City',
    'mexicocity': 'America/Mexico_City',
    
    // Europe
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'berlin': 'Europe/Berlin',
    'frankfurt': 'Europe/Berlin',
    'munich': 'Europe/Berlin',
    'hamburg': 'Europe/Berlin',
    'cologne': 'Europe/Berlin',
    'stuttgart': 'Europe/Berlin',
    'rome': 'Europe/Rome',
    'milan': 'Europe/Rome',
    'naples': 'Europe/Rome',
    'madrid': 'Europe/Madrid',
    'barcelona': 'Europe/Madrid',
    'valencia': 'Europe/Madrid',
    'seville': 'Europe/Madrid',
    'amsterdam': 'Europe/Amsterdam',
    'rotterdam': 'Europe/Amsterdam',
    'the hague': 'Europe/Amsterdam',
    'brussels': 'Europe/Brussels',
    'antwerp': 'Europe/Brussels',
    'vienna': 'Europe/Vienna',
    'graz': 'Europe/Vienna',
    'salzburg': 'Europe/Vienna',
    'zurich': 'Europe/Zurich',
    'geneva': 'Europe/Zurich',
    'basel': 'Europe/Zurich',
    'bern': 'Europe/Zurich',
    'stockholm': 'Europe/Stockholm',
    'gothenburg': 'Europe/Stockholm',
    'malmo': 'Europe/Stockholm',
    'oslo': 'Europe/Oslo',
    'bergen': 'Europe/Oslo',
    'copenhagen': 'Europe/Copenhagen',
    'aarhus': 'Europe/Copenhagen',
    'helsinki': 'Europe/Helsinki',
    'espoo': 'Europe/Helsinki',
    'tampere': 'Europe/Helsinki',
    'moscow': 'Europe/Moscow',
    'saint petersburg': 'Europe/Moscow',
    'saintpetersburg': 'Europe/Moscow',
    'st petersburg': 'Europe/Moscow',
    'stpetersburg': 'Europe/Moscow',
    'istanbul': 'Europe/Istanbul',
    'ankara': 'Europe/Istanbul',
    'izmir': 'Europe/Istanbul',
    'athens': 'Europe/Athens',
    'thessaloniki': 'Europe/Athens',
    'prague': 'Europe/Prague',
    'brno': 'Europe/Prague',
    'ostrava': 'Europe/Prague',
    'budapest': 'Europe/Budapest',
    'debrecen': 'Europe/Budapest',
    'szeged': 'Europe/Budapest',
    'warsaw': 'Europe/Warsaw',
    'krakow': 'Europe/Warsaw',
    'lodz': 'Europe/Warsaw',
    'wroclaw': 'Europe/Warsaw',
    'poznan': 'Europe/Warsaw',
    'gdansk': 'Europe/Warsaw',
    
    // Asia
    'tokyo': 'Asia/Tokyo',
    'beijing': 'Asia/Shanghai',
    'shanghai': 'Asia/Shanghai',
    'hong kong': 'Asia/Hong_Kong',
    'hongkong': 'Asia/Hong_Kong',
    'singapore': 'Asia/Singapore',
    'seoul': 'Asia/Seoul',
    'mumbai': 'Asia/Kolkata',
    'delhi': 'Asia/Kolkata',
    'kolkata': 'Asia/Kolkata',
    'calcutta': 'Asia/Kolkata',
    'bangkok': 'Asia/Bangkok',
    'jakarta': 'Asia/Jakarta',
    'manila': 'Asia/Manila',
    'kuala lumpur': 'Asia/Kuala_Lumpur',
    'kualalumpur': 'Asia/Kuala_Lumpur',
    'dubai': 'Asia/Dubai',
    'riyadh': 'Asia/Riyadh',
    'tehran': 'Asia/Tehran',
    
    // Australia
    'sydney': 'Australia/Sydney',
    'melbourne': 'Australia/Melbourne',
    'brisbane': 'Australia/Brisbane',
    'perth': 'Australia/Perth',
    'adelaide': 'Australia/Adelaide',
    'darwin': 'Australia/Darwin',
    'canberra': 'Australia/Sydney',
    
    // Countries (using capital/major city timezone)
    'usa': 'America/New_York',
    'united states': 'America/New_York',
    'unitedstates': 'America/New_York',
    'canada': 'America/Toronto',
    'mexico': 'America/Mexico_City',
    'uk': 'Europe/London',
    'united kingdom': 'Europe/London',
    'unitedkingdom': 'Europe/London',
    'britain': 'Europe/London',
    'england': 'Europe/London',
    'scotland': 'Europe/London',
    'wales': 'Europe/London',
    'ireland': 'Europe/Dublin',
    'germany': 'Europe/Berlin',
    'deutschland': 'Europe/Berlin',
    'france': 'Europe/Paris',
    'italy': 'Europe/Rome',
    'italia': 'Europe/Rome',
    'spain': 'Europe/Madrid',
    'espana': 'Europe/Madrid',
    'netherlands': 'Europe/Amsterdam',
    'holland': 'Europe/Amsterdam',
    'belgium': 'Europe/Brussels',
    'austria': 'Europe/Vienna',
    'switzerland': 'Europe/Zurich',
    'sweden': 'Europe/Stockholm',
    'norway': 'Europe/Oslo',
    'denmark': 'Europe/Copenhagen',
    'finland': 'Europe/Helsinki',
    'russia': 'Europe/Moscow',
    'turkey': 'Europe/Istanbul',
    'greece': 'Europe/Athens',
    'czech republic': 'Europe/Prague',
    'czechrepublic': 'Europe/Prague',
    'hungary': 'Europe/Budapest',
    'poland': 'Europe/Warsaw',
    'portugal': 'Europe/Lisbon',
    'romania': 'Europe/Bucharest',
    'bulgaria': 'Europe/Sofia',
    'croatia': 'Europe/Zagreb',
    'serbia': 'Europe/Belgrade',
    'ukraine': 'Europe/Kiev',
    'japan': 'Asia/Tokyo',
    'china': 'Asia/Shanghai',
    'india': 'Asia/Kolkata',
    'south korea': 'Asia/Seoul',
    'southkorea': 'Asia/Seoul',
    'korea': 'Asia/Seoul',
    'singapore': 'Asia/Singapore',
    'thailand': 'Asia/Bangkok',
    'vietnam': 'Asia/Ho_Chi_Minh',
    'malaysia': 'Asia/Kuala_Lumpur',
    'indonesia': 'Asia/Jakarta',
    'philippines': 'Asia/Manila',
    'taiwan': 'Asia/Taipei',
    'hong kong': 'Asia/Hong_Kong',
    'hongkong': 'Asia/Hong_Kong',
    'israel': 'Asia/Jerusalem',
    'uae': 'Asia/Dubai',
    'saudi arabia': 'Asia/Riyadh',
    'saudiarabia': 'Asia/Riyadh',
    'iran': 'Asia/Tehran',
    'australia': 'Australia/Sydney',
    'new zealand': 'Pacific/Auckland',
    'newzealand': 'Pacific/Auckland',
    'brazil': 'America/Sao_Paulo',
    'argentina': 'America/Argentina/Buenos_Aires',
    'chile': 'America/Santiago',
    'colombia': 'America/Bogota',
    'peru': 'America/Lima',
    'venezuela': 'America/Caracas',
    'egypt': 'Africa/Cairo',
    'south africa': 'Africa/Johannesburg',
    'southafrica': 'Africa/Johannesburg',
    'nigeria': 'Africa/Lagos',
    'kenya': 'Africa/Nairobi',
    'morocco': 'Africa/Casablanca',
    
    // US States with unique timezones
    'alaska': 'America/Anchorage',
    'hawaii': 'Pacific/Honolulu',
    'anchorage': 'America/Anchorage',
    'honolulu': 'Pacific/Honolulu',
    
    // Common abbreviations
    'utc': 'UTC',
    'gmt': 'GMT',
    'cet': 'Europe/Paris',
    'eet': 'Europe/Helsinki',
    'jst': 'Asia/Tokyo',
    'ist': 'Asia/Kolkata'
  };
  
  const inputLower = input.toLowerCase().replace(/[_-]/g, ' ').trim();
  
  // Check direct city mappings first (prioritize our mappings)
  if (cityMappings[inputLower]) {
    return cityMappings[inputLower];
  }
  
  // If it's already a valid IANA timezone and not in our mappings, return it
  try {
    Intl.DateTimeFormat(undefined, { timeZone: input });
    return input;
  } catch {
    // Continue with fuzzy matching
  }
  
  // Fuzzy search through available timezones
  const matches = availableTimezones.filter(tz => {
    const tzLower = tz.toLowerCase();
    const tzParts = tzLower.split('/');
    
    // Check if input matches any part of the timezone
    return tzLower.includes(inputLower) || 
           tzParts.some(part => part.includes(inputLower)) ||
           inputLower.split(' ').every(word => tzLower.includes(word));
  });
  
  if (matches.length === 1) {
    return matches[0];
  }
  
  if (matches.length > 1) {
    // Prefer more specific matches
    const exactMatches = matches.filter(tz => 
      tz.toLowerCase().split('/').some(part => part === inputLower)
    );
    if (exactMatches.length === 1) {
      return exactMatches[0];
    }
    
    console.error(`Multiple timezones match "${input}":`)
    matches.slice(0, 10).forEach(tz => console.error(`  ${tz}`));
    if (matches.length > 10) {
      console.error(`  ... and ${matches.length - 10} more`);
    }
    console.error('Please be more specific or use --list-timezones to see all options');
    process.exit(1);
  }
  
  console.error(`No timezone found matching "${input}"`);
  console.error('Use --list-timezones to see available options');
  process.exit(1);
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
    const { localTime, timezone } = formatUnixTimestamp(unixMilliseconds.toString(), tz);
    const timeDiff = getTimeDifference(unixMilliseconds);

    if (format === "json") {
      return JSON.stringify(
        {
          unixSeconds,
          unixMilliseconds,
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
    const { localTime, timezone } = formatUnixTimestamp(unixMilliseconds.toString(), tz);
    const timeDiff = getTimeDifference(unixMilliseconds);

    if (format === "json") {
      return JSON.stringify(
        {
          unixSeconds,
          unixMilliseconds,
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
  const { localTime, timezone } = formatUnixTimestamp(unixMilliseconds.toString(), tz);
  const timeDiff = getTimeDifference(unixMilliseconds);

  if (format === "json") {
    return JSON.stringify(
      {
        unixSeconds,
        unixMilliseconds,
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
  output += `│ Unix (seconds)      │ ${unixSeconds.toString().padEnd(35)} │\n`;
  output += `│ Unix (milliseconds) │ ${unixMilliseconds
    .toString()
    .padEnd(35)} │\n`;
  output += `│ UTC ISO timestamp   │ ${utcISO.padEnd(35)} │\n`;
  output += `│ Time difference     │ ${timeDiff.padEnd(35)} │\n`;
  output += "└─────────────────────┴─────────────────────────────────────┘";
  return output;
};

// Process timezone with fuzzy matching now that function is defined
if (timezone) {
  timezone = findTimezone(timezone);
}

try {
  if (!ts) {
    // Only show examples if no arguments were provided at all (not just filtered to empty)
    if (process.argv.length === 2) {
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
          'Usage: ts <unix timestamp | ISO timestamp | "yyyy-MM-dd h:mma" | +/-<number><unit>> [--tz timezone] [--output json] [--list-timezones]'
        );
        console.log("Examples:");
        console.log("  ts                          # Show current time");
        console.log("  ts 1705123456               # Convert Unix timestamp");
        console.log("  ts 2024-01-13T10:30:00Z     # Convert ISO timestamp");
        console.log(
          '  ts "2024-01-13 10:30am"     # Convert date string (local timezone)'
        );
        console.log("  ts 1705123456 --tz UTC      # Convert with timezone");
        console.log("  ts 1705123456 --tz pacific  # Use fuzzy timezone matching");
        console.log("  ts 1705123456 --tz denver   # City names work too");
        console.log("  ts +1day                    # Add 1 day to current time");
        console.log(
          "  ts -2hours                  # Subtract 2 hours from current time"
        );
        console.log("  ts 1705123456 --output json # Output as JSON");
        console.log("  ts --list-timezones         # Show available timezones");
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
          const { localTime } = formatUnixTimestamp(now.toString(), targetTz);
          console.log(`│ ${targetTz.padEnd(19)} │ ${localTime.padEnd(35)} │`);
        }
        console.log(
          "└─────────────────────┴─────────────────────────────────────┘"
        );
      }
    } else {
      // If arguments were provided but filtered to empty (e.g., only --tz denver), show current time without examples
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
          const { localTime } = formatUnixTimestamp(now.toString(), targetTz);
          result.localTime = localTime;
          result.timezone = targetTz;
        }

        console.log(JSON.stringify(result, null, 2));
      } else {
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
          const { localTime } = formatUnixTimestamp(now.toString(), targetTz);
          console.log(`│ ${targetTz.padEnd(19)} │ ${localTime.padEnd(35)} │`);
        }
        console.log(
          "└─────────────────────┴─────────────────────────────────────┘"
        );
      }
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
          const { localTime } = formatUnixTimestamp(now.toString(), targetTz);
          result.localTime = localTime;
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
          const { localTime } = formatUnixTimestamp(now.toString(), targetTz);
          console.log(`│ ${targetTz.padEnd(19)} │ ${localTime.padEnd(35)} │`);
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
      '\nUsage: ts <unix timestamp | ISO timestamp | "yyyy-MM-dd h:mma" | +/-<number><unit>> [--tz timezone] [--output json] [--list-timezones]'
    );
    console.log("Examples:");
    console.log("  ts                           # Show current time");
    console.log("  ts 1705123456               # Convert Unix timestamp");
    console.log("  ts 2024-01-13T10:30:00Z     # Convert ISO timestamp");
    console.log(
      '  ts "2024-01-13 10:30am"     # Convert date string (local timezone)'
    );
    console.log("  ts 1705123456 --tz UTC      # Convert with timezone");
    console.log("  ts 1705123456 --tz pacific  # Use fuzzy timezone matching");
    console.log("  ts 1705123456 --tz denver   # City names work too");
    console.log("  ts +1day                     # Add 1 day to current time");
    console.log(
      "  ts -2hours                   # Subtract 2 hours from current time"
    );
    console.log("  ts 1705123456 --output json # Output as JSON");
    console.log("  ts --list-timezones         # Show available timezones");
  }
}
