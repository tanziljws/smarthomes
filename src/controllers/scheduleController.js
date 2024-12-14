const db = require('../db');
const scheduleService = require('../services/scheduleService');

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
    try {
        const newSchedule = await scheduleService.addSchedule(req.body);
        res.json(newSchedule);
    } catch (err) {
        console.error('Error adding schedule:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
};

const deleteSchedule = async (req, res) => {
    const scheduleId = req.params.id;

    try {
        // Hapus log terkait
        await db.query('DELETE FROM schedule_logs WHERE schedule_id = ?', [scheduleId]);

        // Hapus schedule
        await scheduleService.deleteSchedule(scheduleId);
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

const updateSchedule = async (req, res) => {
    const scheduleId = req.params.id;
    const scheduleData = req.body;

    try {
        console.log('Updating schedule:', { scheduleId, scheduleData });

        // Validasi input
        if (!scheduleData.device_id || !scheduleData.time || !scheduleData.action || !scheduleData.days) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const updatedSchedule = await scheduleService.updateSchedule(scheduleId, scheduleData);
        
        console.log('Schedule updated successfully:', updatedSchedule);
        res.json(updatedSchedule);
    } catch (err) {
        console.error('Error in updateSchedule controller:', err);
        res.status(500).json({ error: err.message });
    }
};

const getScheduleById = async (req, res) => {
    const scheduleId = req.params.id;

    try {
        const [schedule] = await db.query('SELECT * FROM schedules WHERE id = ?', [scheduleId]);

        if (schedule.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json(schedule[0]);
    } catch (error) {
        console.error('Error getting schedule:', error);
        res.status(500).json({ error: 'Database error: ' + error.message });
    }
};

module.exports = { getSchedules, addSchedule, deleteSchedule, updateSchedule, getScheduleById };
