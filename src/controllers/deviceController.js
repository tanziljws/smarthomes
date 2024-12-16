const db = require('../db');
const mqttService = require('../services/mqttService');

const getDevices = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.*, g.name as group_name
            FROM devices d
            LEFT JOIN device_groups g ON d.group_id = g.id
            ORDER BY d.group_id IS NULL, g.name, d.name
        `);
        console.log('Devices loaded:', rows); // Debug log
        res.json(rows);
    } catch (err) {
        console.error('Error getting devices:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const addDevice = async (req, res) => {
    const { name, relay_number, group_id } = req.body;
    console.log('Adding device:', { name, relay_number, group_id });

    if (!name || !relay_number || relay_number < 1 || relay_number > 4) {
        return res.status(400).json({
            error: 'Invalid input: Name and relay number (1-4) are required'
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Cek duplicate relay
        const [existing] = await connection.query(
            'SELECT id FROM devices WHERE relay_number = ?',
            [relay_number]
        );

        if (existing.length > 0) {
            throw new Error(`Relay number ${relay_number} is already in use`);
        }

        // Cek group jika ada
        if (group_id) {
            const [group] = await connection.query(
                'SELECT id FROM device_groups WHERE id = ?',
                [group_id]
            );
            if (group.length === 0) {
                throw new Error(`Group with ID ${group_id} does not exist`);
            }
        }

        // Insert device
        const [result] = await connection.query(
            'INSERT INTO devices (name, relay_number, group_id, status) VALUES (?, ?, ?, ?)',
            [name, relay_number, group_id || null, 'OFF']
        );

        // Get inserted device
        const [newDevice] = await connection.query(`
            SELECT d.*, g.name as group_name
            FROM devices d
            LEFT JOIN device_groups g ON d.group_id = g.id
            WHERE d.id = ?
        `, [result.insertId]);

        await connection.commit();
        res.json(newDevice[0]);
    } catch (err) {
        await connection.rollback();
        console.error('Error adding device:', err);
        res.status(400).json({ error: err.message });
    } finally {
        connection.release();
    }
};

const updateDeviceStatus = async (req, res) => {
    const { relay, status } = req.body;
    console.log('Updating device status:', { relay, status });

    try {
        const [result] = await db.query(
            'UPDATE devices SET status = ? WHERE relay_number = ?',
            [status, relay]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Ambil data device yang diupdate
        const [devices] = await db.query(`
            SELECT d.*, g.name as group_name
            FROM devices d
            LEFT JOIN device_groups g ON d.group_id = g.id
            WHERE d.relay_number = ?
        `, [relay]);

        // Broadcast update ke semua client
        mqttService.broadcastDeviceUpdate(devices[0]);

        res.json({
            status: 'OK',
            message: 'Device status updated successfully',
            device: devices[0]
        });
    } catch (err) {
        console.error('Error updating device status:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const deleteDevice = async (req, res) => {
    const deviceId = req.params.id;

    try {
        // Check if device exists
        const [device] = await db.query('SELECT * FROM devices WHERE id = ?', [deviceId]);

        if (device.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Delete device
        const [result] = await db.query('DELETE FROM devices WHERE id = ?', [deviceId]);

        if (result.affectedRows === 0) {
            throw new Error('Failed to delete device');
        }

        res.json({
            status: 'OK',
            message: 'Device deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting device:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const moveDevice = async (req, res) => {
    const { deviceId, groupId } = req.body;
    console.log('Moving device:', { deviceId, groupId }); // Debug log

    try {
        // Validasi device exists
        const [device] = await db.query(
            'SELECT id FROM devices WHERE id = ?',
            [deviceId]
        );

        if (device.length === 0) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        // Jika groupId ada, validasi group exists
        if (groupId) {
            const [group] = await db.query(
                'SELECT id FROM device_groups WHERE id = ?',
                [groupId]
            );

            if (group.length === 0) {
                return res.status(404).json({
                    error: 'Group not found'
                });
            }
        }

        // Update device group
        const [result] = await db.query(
            'UPDATE devices SET group_id = ? WHERE id = ?',
            [groupId || null, deviceId]
        );

        if (result.affectedRows === 0) {
            throw new Error('Failed to update device');
        }

        // Get updated device data
        const [updatedDevice] = await db.query(`
            SELECT d.*, g.name as group_name
            FROM devices d
            LEFT JOIN device_groups g ON d.group_id = g.id
            WHERE d.id = ?
        `, [deviceId]);

        res.json({
            status: 'OK',
            message: 'Device moved successfully',
            device: updatedDevice[0]
        });

    } catch (err) {
        console.error('Error moving device:', err);
        res.status(500).json({
            error: 'Failed to move device: ' + err.message
        });
    }
};

// Schedule Controllers
const getSchedules = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, d.name as device_name
            FROM schedules s
            JOIN devices d ON s.device_id = d.id
            ORDER BY s.time
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error getting schedules:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const addSchedule = async (req, res) => {
    const { device_id, time, action, days } = req.body;

    try {
        const [result] = await db.query(
            'INSERT INTO schedules (device_id, time, action, days) VALUES (?, ?, ?, ?)',
            [device_id, time, action, days.join(',')]
        );

        const [newSchedule] = await db.query(`
            SELECT s.*, d.name as device_name
            FROM schedules s
            JOIN devices d ON s.device_id = d.id
            WHERE s.id = ?
        `, [result.insertId]);

        res.json(newSchedule[0]);
    } catch (err) {
        console.error('Error adding schedule:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const deleteSchedule = async (req, res) => {
    const scheduleId = req.params.id;

    try {
        const [result] = await db.query('DELETE FROM schedules WHERE id = ?', [scheduleId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({ status: 'OK', message: 'Schedule deleted successfully' });
    } catch (err) {
        console.error('Error deleting schedule:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const getDeviceById = async (req, res) => {
    const deviceId = req.params.id;

    try {
        const [device] = await db.query(`
            SELECT d.*, g.name as group_name
            FROM devices d
            LEFT JOIN device_groups g ON d.group_id = g.id
            WHERE d.id = ?
        `, [deviceId]);

        if (device.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.json(device[0]);
    } catch (err) {
        console.error('Error getting device:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const updateDevice = async (req, res) => {
    const deviceId = req.params.id;
    const { name, relay_number, group_id } = req.body;

    try {
        // Validate input
        if (!name || !relay_number) {
            return res.status(400).json({ 
                error: 'Name and relay number are required' 
            });
        }

        // Check if relay number is already used by another device
        const [existing] = await db.query(
            'SELECT id FROM devices WHERE relay_number = ? AND id != ?',
            [relay_number, deviceId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                error: 'Relay number is already in use by another device' 
            });
        }

        // Update device
        const [result] = await db.query(
            'UPDATE devices SET name = ?, relay_number = ?, group_id = ? WHERE id = ?',
            [name, relay_number, group_id || null, deviceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Get updated device data
        const [updatedDevice] = await db.query(`
            SELECT d.*, g.name as group_name
            FROM devices d
            LEFT JOIN device_groups g ON d.group_id = g.id
            WHERE d.id = ?
        `, [deviceId]);

        res.json(updatedDevice[0]);
    } catch (err) {
        console.error('Error updating device:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

module.exports = { getDevices, addDevice, updateDeviceStatus, deleteDevice, moveDevice, getSchedules, addSchedule, deleteSchedule, getDeviceById, updateDevice };
