const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool directly with promise wrapper
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scanstock',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000 // Prevents infinite hanging if MySQL drops
});

// Use promise() directly
const db = pool.promise();

module.exports = db;