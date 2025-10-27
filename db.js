// db.js

const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

// Create the connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  
  port: process.env.PORT, 

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  ssl: {
    ca: fs.readFileSync('./certs/ca.pem')
  },
});

module.exports = db;