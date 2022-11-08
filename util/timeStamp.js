const moment = require("moment-timezone");

exports.timeStamp = (format) =>
  moment.tz(Date.now(), "Asia/Dhaka").format(format);
