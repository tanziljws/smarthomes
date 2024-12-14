const mysql = require('mysql2/promise');

async function sendTestNotification() {
    const pool = mysql.createPool({
        host: '192.168.2.90',
        user: 'smarthome_user',
        password: 'adminse',
        database: 'smarthome'
    });

    try {
        // Test notifications untuk berbagai skenario
        const notifications = [
            {
                type: 'device',
                title: 'Device Status Alert',
                message: 'Relay 1 has been turned ON',
                severity: 'info',
                value: 1,
                threshold: null,
                is_read: 0
            },
            {
                type: 'temperature',
                title: 'Temperature Warning',
                message: 'Room temperature is high: 29°C',
                severity: 'warning',
                value: 29.0,
                threshold: 28.0,
                is_read: 0
            },
            {
                type: 'cctv',
                title: 'CCTV Connection Lost',
                message: 'CCTV Group 1 - Camera 2 is offline',
                severity: 'critical',
                value: null,
                threshold: null,
                is_read: 0
            },
            {
                type: 'schedule',
                title: 'Schedule Executed',
                message: 'Automatic device control executed successfully',
                severity: 'success',
                value: null,
                threshold: null,
                is_read: 0
            }
        ];

        console.log('Starting to create test notifications...\n');

        for (const notif of notifications) {
            const [result] = await pool.query(
                `INSERT INTO notifications 
                (type, title, message, severity, value, threshold, is_read) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    notif.type,
                    notif.title,
                    notif.message,
                    notif.severity,
                    notif.value,
                    notif.threshold,
                    notif.is_read
                ]
            );
            console.log(`✅ Created: ${notif.title} (ID: ${result.insertId})`);
        }

        // Tampilkan notifikasi terbaru
        console.log('\nFetching recent notifications...');
        const [results] = await pool.query(
            'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5'
        );
        console.log('\nRecent notifications:');
        console.table(results);

        // Tampilkan total notifikasi
        const [count] = await pool.query(
            'SELECT COUNT(*) as total FROM notifications'
        );
        console.log(`\nTotal notifications in database: ${count[0].total}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
        console.log('\nDatabase connection closed.');
    }
}

// Jalankan test
console.log('🚀 Starting notification test...\n');
sendTestNotification().then(() => {
    console.log('\n✨ Test completed!');
}).catch(error => {
    console.error('❌ Test failed:', error);
}); 