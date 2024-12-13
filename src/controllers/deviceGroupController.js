const db = require('../db');

const getGroups = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM device_groups ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error getting groups:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const addGroup = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    try {
        // Cek duplicate name
        const [existing] = await db.query('SELECT id FROM device_groups WHERE name = ?', [name]);

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Group name already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO device_groups (name) VALUES (?)',
            [name]
        );

        res.json({
            id: result.insertId,
            name,
            created_at: new Date()
        });
    } catch (err) {
        console.error('Error adding group:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const deleteGroup = async (req, res) => {
    const groupId = req.params.id;

    try {
        await db.query('UPDATE devices SET group_id = NULL WHERE group_id = ?', [groupId]);
        const [result] = await db.query('DELETE FROM device_groups WHERE id = ?', [groupId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json({ status: 'OK', message: 'Group deleted successfully' });
    } catch (err) {
        console.error('Error deleting group:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const editGroup = async (req, res) => {
    const groupId = req.params.id;
    const { name } = req.body;

    try {
        const [existing] = await db.query('SELECT id FROM device_groups WHERE name = ? AND id != ?', [name, groupId]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Group name already exists' });
        }

        const [result] = await db.query('UPDATE device_groups SET name = ? WHERE id = ?', [name, groupId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json({ status: 'OK', message: 'Group updated successfully' });
    } catch (err) {
        console.error('Error editing group:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

module.exports = { getGroups, addGroup, deleteGroup, editGroup };
