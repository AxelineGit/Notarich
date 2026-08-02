import mysql from 'mysql2/promise';

const db = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: {
        ca: process.env.MYSQL_CA_CERT,
        rejectUnauthorized: true,
    },
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0,
});

export default db;
