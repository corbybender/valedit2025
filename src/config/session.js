const session = require("express-session");

const sessionConfig = {
  secret:
    process.env.SESSION_SECRET ||
    "l2VXqfcrAGgQZR6JVqlzyB2m9uNaq1HhN6zFS1DtxfQm3NMp5krgpa0oA6B6cAJ62MtLkcbKDt8G5C2DMuwAwTYDPbDSd3uv",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

module.exports = session(sessionConfig);
