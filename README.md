If you're like me, you deal in unix time all day long. You're probably not like me.

This is a simple command line timestamp converter supporting Unix timestamps, ISO timestamps, date strings, and relative time expressions with intelligent timezone support. No dependencies, just run `npm install -g` to create the "ts" symlink to allow you to use it anywhere (assuming you have your npm/bin folder in the path)

## Usage

### Current Time

`ts` displays current time in a formatted table:

```
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Current Time                        │
├─────────────────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)                  │ 1515176243                          │
│ Unix (milliseconds)             │ 1515176243049                       │
│ ISO timestamp                   │ 2018-01-05T18:05:13.088Z            │
└─────────────────────────────────┴─────────────────────────────────────┘
```

### Unix Timestamp Input

`ts <unix_timestamp>` converts Unix timestamp to readable format with time difference:

```
ts 1515176243
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ America/Los_Angeles             │ Jan 5, 2018, 10:05:13 AM            │
│ UTC ISO timestamp               │ 2018-01-05T18:05:13.000Z            │
│ Time difference                 │ 7 years, 6 months ago               │
└─────────────────────────────────┴─────────────────────────────────────┘
```

### ISO Timestamp Input

`ts <iso_timestamp>` converts ISO timestamp with time difference:

```
ts 2018-01-05T18:05:13.088Z
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)                  │ 1515176713                          │
│ Unix (milliseconds)             │ 1515176713088                       │
│ UTC ISO timestamp               │ 2018-01-05T18:05:13.088Z            │
│ Time difference                 │ 7 years, 6 months ago               │
└─────────────────────────────────┴─────────────────────────────────────┘
```

### Date String Input

`ts "yyyy-mm-dd h:mma"` converts date strings (assumes local timezone by default):

```
ts "2018-01-05 10:05am"
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)                  │ 1515176700                          │
│ Unix (milliseconds)             │ 1515176700000                       │
│ UTC ISO timestamp               │ 2018-01-05T18:05:00.000Z            │
│ Time difference                 │ 7 years, 6 months ago               │
└─────────────────────────────────┴─────────────────────────────────────┘
```

Date strings support timezone specification with separate flags for input and output timezones:

```
# Specify what timezone the input time is in using --sourcetz
ts "2018-01-05 10:05am" --sourcetz America/New_York
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ America/Los_Angeles             │ Jan 5, 2018, 07:05:00 AM            │
│ Unix (seconds)                  │ 1515168300                          │
│ Unix (milliseconds)             │ 1515168300000                       │
│ UTC ISO timestamp               │ 2018-01-05T15:05:00.000Z            │
│ Time difference                 │ 7 years, 6 months ago               │
└─────────────────────────────────┴─────────────────────────────────────┘

# Combine --sourcetz and --tz to specify both input and output timezones
ts "2018-01-05 2:41pm" --sourcetz eastern --tz pacific
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ America/Los_Angeles             │ Jan 5, 2018, 11:41:00 AM            │
│ Unix (seconds)                  │ 1515177660                          │
│ Unix (milliseconds)             │ 1515177660000                       │
│ UTC ISO timestamp               │ 2018-01-05T19:41:00.000Z            │
│ Time difference                 │ 7 years, 6 months ago               │
└─────────────────────────────────┴─────────────────────────────────────┘
```

### Relative Time Input

`ts +/-<number><unit>` calculates relative time from current time:

```
ts +1day
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)                  │ 1753798995                          │
│ Unix (milliseconds)             │ 1753798995329                       │
│ UTC ISO timestamp               │ 2025-07-29T14:23:15.329Z            │
│ Time difference                 │ 23 hours, 59 minutes in the future  │
└─────────────────────────────────┴─────────────────────────────────────┘
```

**Supported relative time formats:**

- `+1day`, `-1day`
- `+2hours`, `-30minutes`
- `+1month`, `-3months`
- `+1year`, `-1year`
- `+2weeks`, `-1week`
- `+45seconds`, `-15seconds`

### Timezone Support

The tool provides two separate timezone flags for maximum flexibility:

- `--tz TIMEZONE`: Specify what timezone to display the output in
- `--sourcetz TIMEZONE`: Specify what timezone the input time should be interpreted as (only applies to date strings like "2024-01-13 10:30am")

Use `--tz` flag to specify output timezone. When specifying a different timezone, the tool automatically shows how many hours ahead or behind it is compared to your local timezone:

```
ts 1705123456 --tz UTC
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ UTC (8 hours ahead)             │ Jan 13, 2024, 05:24:16 AM           │
│ UTC ISO timestamp               │ 2024-01-13T05:24:16.000Z            │
│ Time difference                 │ 573 days, 12 hours ago              │
└─────────────────────────────────┴─────────────────────────────────────┘
```

The timezone offset automatically accounts for daylight saving time based on the specific date being converted:

```
ts 1720123456 --tz UTC
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ UTC (7 hours ahead)             │ Jul 4, 2024, 08:04:16 PM            │
│ UTC ISO timestamp               │ 2024-07-04T20:04:16.000Z            │
│ Time difference                 │ 399 days, 22 hours ago              │
└─────────────────────────────────┴─────────────────────────────────────┘
```

#### Fuzzy Timezone Matching

The tool supports fuzzy timezone matching with common shortcuts and city names:

- **US Timezones**: `pacific`, `central`, `mountain`, `eastern`, `pst`, `cst`, `mst`, `est`
- **Cities**: `denver`, `chicago`, `nyc`, `la`, `london`, `paris`, `tokyo`, `sydney`, etc.
- **Countries**: `usa`, `uk`, `germany`, `japan`, `australia`, etc.
- **Standard IANA names**: `America/New_York`, `Europe/London`, `Asia/Tokyo`

```
ts 1705123456 --tz tokyo
┌─────────────────────────────────┬─────────────────────────────────────┐
│ Format                          │ Value                               │
├─────────────────────────────────┼─────────────────────────────────────┤
│ Asia/Tokyo (17 hours ahead)     │ Jan 13, 2024, 02:24:16 PM           │
│ UTC ISO timestamp               │ 2024-01-13T05:24:16.000Z            │
│ Time difference                 │ 573 days, 12 hours ago              │
└─────────────────────────────────┴─────────────────────────────────────┘
```

Use `--list-timezones` to see all available timezone options and shortcuts.

### JSON Output

Use `--output json` to get structured JSON output instead of a table. This works for all input types, including current time, timestamps, date strings, and relative time.

```
ts 1705123456 --tz UTC --output json
{
  "unixSeconds": 1705123456,
  "unixMilliseconds": 1705123456000,
  "utcISO": "2024-01-13T05:24:16.000Z",
  "localTime": "Jan 13, 2024, 05:24:16 AM",
  "timezone": "UTC",
  "timeDifference": "573 days, 12 hours ago",
  "timezoneOffsetText": "8 hours ahead",
  "utcOffset": 0
}
```

The JSON output includes:
- `timezoneOffsetText`: Human-readable relative offset (e.g., "8 hours ahead")
- `utcOffset`: Numeric UTC offset in hours (e.g., -8 for Pacific, +9 for Tokyo)

If you run just `ts --output json`, you get the current time as JSON:

```
ts --output json
{
  "unixSeconds": 1753797711,
  "unixMilliseconds": 1753797711352,
  "utcISO": "2025-07-29T14:01:51.352Z"
}
```

If there is an error, you get a JSON error object:

```
ts not-a-timestamp --output json
{
  "error": "Invalid date string or timestamp."
}
```

### Time Difference Feature

All timestamp conversions now include a human-readable time difference:

- Shows seconds for differences <90 seconds (e.g., "45 seconds ago")
- Uses minute precision otherwise (e.g., "2 hours, 23 minutes ago")
- Handles future timestamps (e.g., "8 hours in the future")
- Formats appropriately for days, hours, and minutes

## Supported Formats

- Unix timestamps (10-19 digits, seconds or milliseconds)
- ISO timestamps (YYYY-MM-DDTHH:mm:ssZ or with milliseconds)
- Date strings (yyyy-MM-dd h:mma format)
- Relative time expressions (+/-<number><unit>)
- Timezone names (e.g., America/New_York, Europe/London, UTC)

## Quick Examples

```bash
# Current time
ts
ts --output json

# Unix timestamp with timezone offset info
ts 1705123456 --tz UTC
ts 1705123456 --tz tokyo --output json

# Relative time
ts +1day
ts -2hours --tz london

# Date string with source timezone (interprets input as Eastern time)
ts "2024-01-13 10:30am" --sourcetz eastern

# Date string with both source and output timezones
ts "2024-01-13 2:41pm" --sourcetz eastern --tz pacific

# List available timezones
ts --list-timezones
```
