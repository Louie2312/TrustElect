const { Pool } = require("pg");
require("dotenv").config();

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Reduced maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
  acquireTimeoutMillis: 10000, // Maximum time to wait for a connection
  allowExitOnIdle: true, // Allow the pool to close all connections when idle
});

// Set timezone for all connections
pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Manila'");
  console.log('New database connection established. Total connections:', pool.totalCount);
});

// Monitor connection usage
pool.on('acquire', (client) => {
  console.log('Database connection acquired. Active connections:', pool.totalCount - pool.idleCount);
});

pool.on('remove', (client) => {
  console.log('Database connection removed. Total connections:', pool.totalCount);
});

// Add periodic connection cleanup
setInterval(() => {
  console.log(`Database pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
  
  // Force cleanup of idle connections if we have too many
  if (pool.totalCount > 8) {
    console.log('Cleaning up excess database connections...');
    pool.end().then(() => {
      console.log('Database pool cleaned up');
    }).catch(err => {
      console.error('Error cleaning up database pool:', err);
    });
  }
}, 60000); // Check every minute

pool.on("error", (err) => {
  console.error("Error in PostgreSQL", err);
  process.exit(-1);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database pool...');
  await pool.end();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
  await pool.end();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await pool.end();
  process.exit(1);
});

// Helper function to execute queries with retry logic
const executeWithRetry = async (query, params = [], retries = MAX_RETRIES) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error(`Database query attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        throw error; // Last attempt failed
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
};

// Export both the pool and the retry function
module.exports = pool;
module.exports.executeWithRetry = executeWithRetry;
