const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // TiDB Serverless requires TLS/SSL connections
    ssl: process.env.DB_SSL === 'false' ? undefined : {
        // Rely on default system CAs; adjust if you have a custom CA
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
    }
});

module.exports = pool.promise();
