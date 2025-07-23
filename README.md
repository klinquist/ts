If you're like me, you deal in unix time all day long.  You're probably not like me.

This is a simple command line timestamp converter supporting Unix timestamps, ISO timestamps, and date strings. No dependencies, just run `npm install -g` to create the "ts" symlink to allow you to use it anywhere (assuming you have your npm/bin folder in the path)

## Usage

### Current Time
`ts` displays current time in a formatted table:
```
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Current Time                        │
├─────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)      │ 1515176243                          │
│ Unix (milliseconds) │ 1515176243049                       │
│ ISO timestamp       │ 2018-01-05T18:05:13.088Z           │
└─────────────────────┴─────────────────────────────────────┘
```

### Unix Timestamp Input
`ts <unix_timestamp>` converts Unix timestamp to readable format with time difference:
```
ts 1515176243
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ America/Los_Angeles │ Jan 5, 2018, 10:05:13 AM           │
│ UTC ISO timestamp   │ 2018-01-05T18:05:13.000Z           │
│ Time difference     │ 7 years, 6 months ago              │
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
│ UTC ISO timestamp   │ 2018-01-05T18:05:13.088Z           │
│ Time difference     │ 7 years, 6 months ago              │
└─────────────────────┴─────────────────────────────────────┘
```

### Date String Input
`ts "yyyy-mm-dd h:mma"` converts date strings (assumes Pacific timezone):
```
ts "2018-01-05 10:05am"
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ Unix (seconds)      │ 1515176700                          │
│ Unix (milliseconds) │ 1515176700000                       │
│ UTC ISO timestamp   │ 2018-01-05T18:05:00.000Z           │
│ Time difference     │ 7 years, 6 months ago              │
└─────────────────────┴─────────────────────────────────────┘
```

### Timezone Support
Use `--tz` flag to specify output timezone:
```
ts 1515176243 --tz America/New_York
┌─────────────────────┬─────────────────────────────────────┐
│ Format              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ America/New_York    │ Jan 5, 2018, 01:05:13 PM           │
│ UTC ISO timestamp   │ 2018-01-05T18:05:13.000Z           │
│ Time difference     │ 7 years, 6 months ago              │
└─────────────────────┴─────────────────────────────────────┘
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
- Timezone names (e.g., America/New_York, Europe/London, UTC)