const db = require('../db');

const getCctvGroups = async (req, res) => {
    try {
        const [groups] = await db.query(`
            SELECT
                cg.*,
                COUNT(c.id) as cctv_count
            FROM cctv_groups cg
            LEFT JOIN cctvs c ON cg.id = c.group_id AND c.status = 'active'
            GROUP BY cg.id
            ORDER BY cg.created_at DESC
        `);

        // Get CCTVs for each group
        const groupsWithCctvs = await Promise.all(groups.map(async (group) => {
            const [cctvs] = await db.query(`
                SELECT id, name, stream_url, status
                FROM cctvs
                WHERE group_id = ? AND status = 'active'
                ORDER BY created_at DESC
            `, [group.id]);

            return {
                ...group,
                cctvs: cctvs
            };
        }));

        res.json(groupsWithCctvs);
    } catch (err) {
        console.error('Error getting CCTV groups:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const addCctvGroup = async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO cctv_groups (name) VALUES (?)',
            [name]
        );
        res.json({
            id: result.insertId,
            name,
            created_at: new Date()
        });
    } catch (err) {
        console.error('Error adding CCTV group:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const editCctvGroup = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const [result] = await db.query(
            'UPDATE cctv_groups SET name = ? WHERE id = ?',
            [name, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json({ message: 'Group updated successfully' });
    } catch (err) {
        console.error('Error updating CCTV group:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const deleteCctvGroup = async (req, res) => {
    const { id } = req.params;
    try {
        // Update CCTVs in group to have no group
        await db.query(
            'UPDATE cctvs SET group_id = NULL, status = "inactive" WHERE group_id = ?',
            [id]
        );

        // Delete the group
        const [result] = await db.query(
            'DELETE FROM cctv_groups WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        console.error('Error deleting CCTV group:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

// CCTV Management
const getCctvs = async (req, res) => {
    try {
        const [cctvs] = await db.query(`
            SELECT c.*, cg.name as group_name
            FROM cctvs c
            LEFT JOIN cctv_groups cg ON c.group_id = cg.id
            WHERE c.status = 'active'
            ORDER BY c.created_at DESC
        `);
        res.json(cctvs);
    } catch (err) {
        console.error('Error getting CCTVs:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const addCctv = async (req, res) => {
    const { name, stream_url, group_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO cctvs (name, stream_url, group_id) VALUES (?, ?, ?)',
            [name, stream_url, group_id]
        );
        res.json({
            id: result.insertId,
            name,
            stream_url,
            group_id,
            created_at: new Date()
        });
    } catch (err) {
        console.error('Error adding CCTV:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const editCctv = async (req, res) => {
    const { id } = req.params;
    const { name, stream_url, group_id } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE cctvs SET name = ?, stream_url = ?, group_id = ? WHERE id = ?',
            [name, stream_url, group_id, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'CCTV not found' });
        }
        res.json({ message: 'CCTV updated successfully' });
    } catch (err) {
        console.error('Error updating CCTV:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const deleteCctv = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(
            'UPDATE cctvs SET status = "inactive" WHERE id = ?',
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'CCTV not found' });
        }
        res.json({ message: 'CCTV deleted successfully' });
    } catch (err) {
        console.error('Error deleting CCTV:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const getCctvGroupDetail = async (req, res) => {
    const { id } = req.params;

    try {
        // Get group info
        const [group] = await db.query(`
            SELECT * FROM cctv_groups WHERE id = ?
        `, [id]);

        if (group.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Get CCTVs in group
        const [cctvs] = await db.query(`
            SELECT id, name, stream_url, status
            FROM cctvs
            WHERE group_id = ? AND status = 'active'
            ORDER BY created_at DESC
        `, [id]);

        res.json({
            ...group[0],
            cctvs: cctvs
        });
    } catch (err) {
        console.error('Error getting CCTV group detail:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

module.exports = {
    getCctvGroups,
    addCctvGroup,
    editCctvGroup,
    deleteCctvGroup,
    getCctvs,
    addCctv,
    editCctv,
    deleteCctv,
    getCctvGroupDetail
};
