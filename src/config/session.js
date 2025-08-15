const session = require("express-session");
const { settingsLoader } = require("../utils/settingsLoader");

// Create session middleware with async configuration
const createSessionMiddleware = async () => {
  const sessionSecret = await settingsLoader.getSetting(
    "SESSION_SECRET",
    "l2VXqfcrAGgQZR6JVqlzyB2m9uNaq1HhN6zFS1DtxfQm3NMp5krgpa0oA6B6cAJ62MtLkcbKDt8G5C2DMuwAwTYDPbDSd3uv"
  );

  const sessionConfig = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  console.log("Session middleware configured from database settings");
  return session(sessionConfig);
};

// For immediate use, provide fallback with environment variable
const fallbackSessionConfig = {
  secret: process.env.SESSION_SECRET ||
    "l2VXqfcrAGgQZR6JVqlzyB2m9uNaq1HhN6zFS1DtxfQm3NMp5krgpa0oA6B6cAJ62MtLkcbKDt8G5C2DMuwAwTYDPbDSd3uv",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
};

module.exports = {
  createSessionMiddleware,
  fallbackSession: session(fallbackSessionConfig)
};
