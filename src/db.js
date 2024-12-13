const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: '192.168.2.90',
    user: 'smarthome_user',
    password: 'adminse',
    database: 'smarthome',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test koneksi
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();
    } catch (err) {
        console.error('Database connection error:', err);
        throw err;
    }
};

testConnection();

module.exports = pool;
