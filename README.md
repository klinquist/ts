If you're like me, you deal in unix time all day long.  You're probably not like me.

This is a simple command line unix timestamp converter.  No dependencies, just run `npm install -g` to create the "ts" symlink to allow you to use it anywhere (assuming you have your npm/bin folder in the path)

Usage:

`ts` results in this:
```
Current time in seconds: 1515176243
Current time in milliseconds: 1515176243049
```


`ts <timestamp>` results in this:

```
Time in your timezone: 5 Jan 2018 10:05:13
UTC ISO timestamp: 2018-01-05T18:05:13.088Z
```


