const sql = require("mssql");
require("dotenv").config();

const databaseConfig = {
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

const pool = new sql.ConnectionPool(databaseConfig);
const poolConnect = pool.connect();

pool.on("error", (err) => {
  console.error("Database Pool Error:", err);
});

console.log("Database connection pool created.");

module.exports = pool;
