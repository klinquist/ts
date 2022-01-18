#! /usr/local/bin/node
var ts = process.argv[2];

const timeConverter = UNIX_timestamp => {
    if (!UNIX_timestamp.match(/^(\d{10}|\d{13}|\d{19})$/g)) {
        console.log('10, 13, or 19 digit timestamp expected. This was ' + UNIX_timestamp.length + ' characters long.');
        process.exit(1);
    }
    if (UNIX_timestamp.length == 10) {
        UNIX_timestamp += '000';
    }
    if (UNIX_timestamp.length == 19) {
        UNIX_timestamp = UNIX_timestamp.substr(0,13);
    }
    var a = new Date(parseInt(UNIX_timestamp));
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    min = min.toString();
    if (min.length == 1) min = `0${min}`;
    sec = sec.toString();
    if (sec.length == 1) sec = `0${sec}`;
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    return `Time in your timezone: ${time}\nUTC ISO timestamp: ${a.toISOString()}`;
};

if (!ts) {
    console.log('usage: ts <unix timestamp>');
    console.log(`Current time in seconds: ${new Date().getTime().toString().substr(0,10)}\nCurrent time in milliseconds: ${new Date().getTime()}`);
} else {
    console.log(timeConverter(process.argv[2]));
}
