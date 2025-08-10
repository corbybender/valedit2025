// db.js
const sql = require("mssql");
require("dotenv").config();
require("./debug-logger.js");

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

pool.on("error", (err) => {
  logger.error("Database Pool Error", { error: err });
});

poolConnect
  .then(() => {
    logger.info("Database connection pool connected successfully.");
  })
  .catch((err) => {
    logger.error("Database connection failed", { error: err });
  });

logger.info("Database connection pool created.");

module.exports = poolConnect;
