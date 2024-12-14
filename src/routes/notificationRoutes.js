const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all notifications
router.get('/', async (req, res) => {
    try {
        const [notifications] = await pool.query(
            'SELECT * FROM notifications ORDER BY created_at DESC'
        );
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching notifications' });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = ?',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error updating notification' });
    }
});

// Clear all notifications
router.delete('/clear', async (req, res) => {
    try {
        await pool.query('DELETE FROM notifications');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error clearing notifications' });
    }
});

// Test notification endpoint
router.post('/test', async (req, res) => {
    try {
        const dummyNotif = {
            type: 'test',
            title: 'Test Notification',
            message: 'This is a test notification',
            severity: 'warning',
            value: 25.5,
            threshold: 30.0,
            is_read: 0
        };

        const [result] = await pool.query(
            `INSERT INTO notifications 
            (type, title, message, severity, value, threshold, is_read) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                dummyNotif.type,
                dummyNotif.title,
                dummyNotif.message,
                dummyNotif.severity,
                dummyNotif.value,
                dummyNotif.threshold,
                dummyNotif.is_read
            ]
        );

        // Emit notification melalui Socket.IO
        req.app.get('io').emit('newNotification', {
            ...dummyNotif,
            id: result.insertId,
            created_at: new Date()
        });

        res.json({ success: true, message: 'Test notification sent!' });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

module.exports = router; 