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
  max: 100, 
  idleTimeoutMillis: 480000, 
  connectionTimeoutMillis: 2000, 
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
