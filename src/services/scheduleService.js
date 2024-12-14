const schedule = require('node-schedule');
const db = require('../db');
const mqttService = require('./mqttService');

class ScheduleService {
    constructor() {
        this.jobs = new Map();
    }

    async initializeSchedules() {
        try {
            const [schedules] = await db.query(`
                SELECT s.*, d.relay_number
                FROM schedules s
                JOIN devices d ON s.device_id = d.id
                WHERE s.active = 1
            `);

            schedules.forEach(schedule => this.scheduleJob(schedule));
        } catch (err) {
            console.error('Error initializing schedules:', err);
        }
    }

    scheduleJob(scheduleData) {
        const { id, days, time, action, relay_number } = scheduleData;
        const dayNumbers = days.split(',').map(Number);

        const rule = new schedule.RecurrenceRule();
        rule.dayOfWeek = dayNumbers;
        const [hours, minutes] = time.split(':');
        rule.hour = parseInt(hours);
        rule.minute = parseInt(minutes);
        rule.tz = 'Asia/Jakarta';

        if (this.jobs.has(id)) {
            this.jobs.get(id).cancel();
        }

        const job = schedule.scheduleJob(rule, async () => {
            try {
                console.log(`Executing schedule ${id}: ${action} relay ${relay_number}`);

                await mqttService.controlRelay(relay_number, action);

                await db.query(
                    'UPDATE devices SET status = ? WHERE relay_number = ?',
                    [action, relay_number]
                );

                await db.query(
                    'INSERT INTO schedule_logs (schedule_id, execution_time, status) VALUES (?, NOW(), ?)',
                    [id, 'SUCCESS']
                );
            } catch (error) {
                console.error(`Error executing schedule ${id}:`, error);
                await db.query(
                    'INSERT INTO schedule_logs (schedule_id, execution_time, status, error_message) VALUES (?, NOW(), ?, ?)',
                    [id, 'ERROR', error.message]
                );
            }
        });

        this.jobs.set(id, job);
    }

    async addSchedule(scheduleData) {
        try {
            const [result] = await db.query(
                'INSERT INTO schedules (device_id, time, action, days, active) VALUES (?, ?, ?, ?, 1)',
                [scheduleData.device_id, scheduleData.time, scheduleData.action, scheduleData.days.join(',')]
            );

            const [newSchedule] = await db.query(`
                SELECT s.*, d.relay_number, d.name as device_name
                FROM schedules s
                JOIN devices d ON s.device_id = d.id
                WHERE s.id = ?
            `, [result.insertId]);

            this.scheduleJob(newSchedule[0]);
            return newSchedule[0];
        } catch (err) {
            throw err;
        }
    }

    async deleteSchedule(scheduleId) {
        if (this.jobs.has(scheduleId)) {
            this.jobs.get(scheduleId).cancel();
            this.jobs.delete(scheduleId);
        }
    }

    async updateSchedule(scheduleId, scheduleData) {
        try {
            // Update di database
            await db.query(
                'UPDATE schedules SET device_id = ?, time = ?, action = ?, days = ? WHERE id = ?',
                [scheduleData.device_id, scheduleData.time, scheduleData.action, scheduleData.days, scheduleId]
            );

            // Ambil data schedule yang sudah diupdate beserta relay number
            const [updatedSchedule] = await db.query(`
                SELECT s.*, d.relay_number, d.name as device_name
                FROM schedules s
                JOIN devices d ON s.device_id = d.id
                WHERE s.id = ?
            `, [scheduleId]);

            if (updatedSchedule.length === 0) {
                throw new Error('Schedule not found after update');
            }

            // Cancel job lama jika ada
            if (this.jobs.has(parseInt(scheduleId))) {
                console.log(`Cancelling old job for schedule ${scheduleId}`);
                this.jobs.get(parseInt(scheduleId)).cancel();
            }

            // Buat job baru dengan data yang diupdate
            console.log(`Creating new job for updated schedule ${scheduleId}`);
            this.scheduleJob(updatedSchedule[0]);

            return updatedSchedule[0];
        } catch (err) {
            console.error('Error updating schedule:', err);
            throw err;
        }
    }
}

module.exports = new ScheduleService();
