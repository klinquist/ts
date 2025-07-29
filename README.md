If you're like me, you deal in unix time all day long. You're probably not like me.

This is a simple command line timestamp converter supporting Unix timestamps, ISO timestamps, date strings, and relative time expressions. No dependencies, just run `npm install -g` to create the "ts" symlink to allow you to use it anywhere (assuming you have your npm/bin folder in the path)

## Usage

### Current Time

`ts` displays current time in a formatted table:

```
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Current Time                        │
├─────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)      │ 1515176243                          │
│ Unix (milliseconds) │ 1515176243049                       │
│ ISO timestamp       │ 2018-01-05T18:05:13.088Z            │
└─────────────────────┴─────────────────────────────────────┘
```

### Unix Timestamp Input

`ts <unix_timestamp>` converts Unix timestamp to readable format with time difference:

```
ts 1515176243
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ America/Los_Angeles │ Jan 5, 2018, 10:05:13 AM            │
│ UTC ISO timestamp   │ 2018-01-05T18:05:13.000Z            │
│ Time difference     │ 7 years, 6 months ago               │
└─────────────────────┴─────────────────────────────────────┘
```

### ISO Timestamp Input

`ts <iso_timestamp>` converts ISO timestamp with time difference:

```
ts 2018-01-05T18:05:13.088Z
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)      │ 1515176713                          │
│ Unix (milliseconds) │ 1515176713088                       │
│ UTC ISO timestamp   │ 2018-01-05T18:05:13.088Z            │
│ Time difference     │ 7 years, 6 months ago               │
└─────────────────────┴─────────────────────────────────────┘
```

### Date String Input

`ts "yyyy-mm-dd h:mma"` converts date strings (assumes local timezone by default):

```
ts "2018-01-05 10:05am"
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)      │ 1515176700                          │
│ Unix (milliseconds) │ 1515176700000                       │
│ UTC ISO timestamp   │ 2018-01-05T18:05:00.000Z            │
│ Time difference     │ 7 years, 6 months ago               │
└─────────────────────┴─────────────────────────────────────┘
```

Date strings also support timezone specification:

```
ts "2018-01-05 10:05am" --tz America/New_York
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)      │ 1515168300                          │
│ Unix (milliseconds) │ 1515168300000                       │
│ UTC ISO timestamp   │ 2018-01-05T16:05:00.000Z            │
│ Time difference     │ 7 years, 6 months ago               │
└─────────────────────┴─────────────────────────────────────┘
```

### Relative Time Input

`ts +/-<number><unit>` calculates relative time from current time:

```
ts +1day
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)      │ 1753798995                          │
│ Unix (milliseconds) │ 1753798995329                       │
│ UTC ISO timestamp   │ 2025-07-29T14:23:15.329Z            │
│ Time difference     │ 23 hours, 59 minutes in the future  │
└─────────────────────┴─────────────────────────────────────┘
```

**Supported relative time formats:**

- `+1day`, `-1day`
- `+2hours`, `-30minutes`
- `+1month`, `-3months`
- `+1year`, `-1year`
- `+2weeks`, `-1week`
- `+45seconds`, `-15seconds`

### Timezone Support

Use `--tz` flag to specify output timezone:

```
ts 1515176243 --tz America/New_York
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ America/New_York    │ Jan 5, 2018, 01:05:13 PM            │
│ UTC ISO timestamp   │ 2018-01-05T18:05:13.000Z            │
│ Time difference     │ 7 years, 6 months ago               │
└─────────────────────┴─────────────────────────────────────┘
```

### JSON Output

Use `--output json` to get structured JSON output instead of a table. This works for all input types, including current time, timestamps, date strings, and relative time.

```
ts 1705123456 --output json
{
  "unixSeconds": 1705123456,
  "unixMilliseconds": 1705123456000,
  "utcISO": "2024-01-13T10:30:56.000Z",
  "localTime": "Jan 13, 2024, 2:30:56 AM",
  "timezone": "America/Los_Angeles",
  "timeDifference": "X days ago"
}
```

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

## Examples

```bash
# Current time
ts

ts --output json

# Unix timestamp conversion
ts 1515176243
ts 1515176243 --output json

# ISO timestamp conversion
ts 2018-01-05T18:05:13.088Z
ts 2018-01-05T18:05:13.088Z --output json

# Date string conversion
ts "2018-01-05 10:05am"
ts "2018-01-05 10:05am" --output json

# Relative time calculations
ts +1day
ts +1day --output json
ts -2hours
ts +1month
ts -1year

# With timezone
ts 1515176243 --tz America/New_York
ts 1515176243 --tz America/New_York --output json
ts "2018-01-05 10:05am" --tz America/New_York
```
