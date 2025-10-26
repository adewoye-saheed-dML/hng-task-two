// db.js

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const db = mysql.createPool({
  // Use Railway's variable OR your local .env variable
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_DATABASE,
  
  // Use Railway's port or a common default (3306)
  port: process.env.MYSQLPORT || 3306, 

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10
});

module.exports = db;