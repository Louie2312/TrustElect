const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Enhanced production optimizations for high-concurrency voting
  max: 150, // Increased from 100 for better concurrent user support
  min: 10, // Minimum connections to maintain
  idleTimeoutMillis: 300000, // 5 minutes (increased from 2 minutes)
  connectionTimeoutMillis: 5000, // 5 seconds (increased from 2 seconds)
  acquireTimeoutMillis: 10000, // 10 seconds to acquire connection
  createTimeoutMillis: 10000, // 10 seconds to create connection
  destroyTimeoutMillis: 5000, // 5 seconds to destroy connection
  reapIntervalMillis: 1000, // Check for idle connections every second
  createRetryIntervalMillis: 200, // Retry connection creation every 200ms
  // Additional performance settings
  allowExitOnIdle: false, // Don't exit when all connections are idle
  keepAlive: true, // Keep connections alive
  keepAliveInitialDelayMillis: 10000, // 10 seconds before first keep-alive
});

// Set timezone for all connections
pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Manila'");
});

pool.on("error", (err) => {
  console.error("Error in PostgreSQL", err);
  process.exit(-1);
});

module.exports = pool;
