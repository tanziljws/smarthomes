const mqtt = require('mqtt');
const EventEmitter = require('events');
const pool = require('../db');

class MqttService {
    constructor() {
        this.client = null;
        this.emitter = new EventEmitter();
        this.io = null;
        this.notificationThrottles = {
            temperature: { 
                lastSent: 0, 
                minInterval: 15 * 60 * 1000,  // 15 menit
                lastValue: null,
                minChange: 2 // minimal 2°C change
            },
            humidity: { 
                lastSent: 0, 
                minInterval: 15 * 60 * 1000,  // 15 menit
                lastValue: null,
                minChange: 5 // minimal 5% change
            },
            device: { 
                lastSent: 0, 
                minInterval: 60 * 1000,  // 1 menit
                lastValue: null
            }
        };
        this.lastValues = {
            temperature: null,
            humidity: null,
            deviceStatus: null
        };
    }

    shouldSendNotification(type, value, threshold) {
        const now = Date.now();
        const throttle = this.notificationThrottles[type];

        if (!throttle) return false;

        // Cek interval waktu
        const timePassed = now - throttle.lastSent;
        if (timePassed < throttle.minInterval) {
            return false;
        }

        // Cek jika nilai sama dengan notifikasi terakhir
        if (throttle.lastValue === value) {
            return false;
        }

        // Cek perubahan minimum
        if (throttle.lastValue !== null && throttle.minChange) {
            const change = Math.abs(value - throttle.lastValue);
            if (change < throttle.minChange) {
                return false;
            }
        }

        // Cek apakah masih melebihi threshold
        if (type === 'temperature' && value <= threshold) return false;
        if (type === 'humidity' && value <= threshold) return false;

        // Update throttle data
        throttle.lastSent = now;
        throttle.lastValue = value;
        return true;
    }

    connect(io) {
        this.io = io;
        this.client = mqtt.connect('mqtt://192.168.2.84', {
            username: 'root',
            password: 'adminse10',
        });

        this.client.on('connect', () => {
            console.log('Connected to MQTT broker');
            this.client.subscribe('smarthome/control');
            this.client.subscribe('smarthome/dht');
            this.client.subscribe('smarthome/airquality');
        });

        this.client.on('message', async (topic, message) => {
            if (topic === 'smarthome/status') {
                const status = message.toString();
                if (status !== this.lastValues.deviceStatus) {
                    console.log('Sending relay status:', status);
                    io.emit('relayStatus', status);
                    io.emit('deviceStatusUpdate', status);

                    if (this.shouldSendNotification('device', status)) {
                        await this.createNotification({
                            type: 'device',
                            title: 'Device Status Update',
                            message: `Device status changed to: ${status}`,
                            severity: 'info',
                            value: null,
                            threshold: null,
                            is_read: 0
                        });
                    }
                    this.lastValues.deviceStatus = status;
                }
            }

            if (topic === 'smarthome/dht') {
                try {
                    const data = JSON.parse(message.toString());
                    io.emit('dhtData', data);

                    await pool.query(
                        'INSERT INTO sensor_data (temperature, humidity) VALUES (?, ?)',
                        [data.temperature, data.humidity]
                    );

                    await this.checkThresholds(data);
                } catch (err) {
                    console.error('Error parsing DHT11 message:', err);
                }
            }

            if (topic === 'smarthome/airquality') {
                try {
                    const data = JSON.parse(message.toString());
                    io.emit('airQuality', data);
                } catch (err) {
                    console.error('Error parsing air quality message:', err);
                }
            }
        });
    }

    async checkThresholds(data) {
        try {
            const [settings] = await pool.query(
                'SELECT name, value FROM settings WHERE category = ?',
                ['thresholds']
            );

            const thresholds = settings.reduce((acc, setting) => {
                acc[setting.name] = parseFloat(setting.value);
                return acc;
            }, {});

            // Cek temperature
            if (data.temperature > thresholds.temp_high && 
                this.shouldSendNotification('temperature', data.temperature, thresholds.temp_high)) {
                await this.createNotification({
                    type: 'temperature',
                    title: 'High Temperature Alert',
                    message: `Temperature (${data.temperature}°C) has exceeded the threshold (${thresholds.temp_high}°C)`,
                    severity: 'critical',
                    value: data.temperature,
                    threshold: thresholds.temp_high,
                    is_read: 0
                });
            }

            // Cek humidity
            if (data.humidity > thresholds.humidity_high && 
                this.shouldSendNotification('humidity', data.humidity, thresholds.humidity_high)) {
                await this.createNotification({
                    type: 'humidity',
                    title: 'High Humidity Alert',
                    message: `Humidity (${data.humidity}%) has exceeded the threshold (${thresholds.humidity_high}%)`,
                    severity: 'warning',
                    value: data.humidity,
                    threshold: thresholds.humidity_high,
                    is_read: 0
                });
            }
        } catch (error) {
            console.error('Error checking thresholds:', error);
        }
    }

    async createNotification(notifData) {
        try {
            const [result] = await pool.query(
                `INSERT INTO notifications 
                (type, title, message, severity, value, threshold, is_read) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    notifData.type,
                    notifData.title,
                    notifData.message,
                    notifData.severity,
                    notifData.value,
                    notifData.threshold,
                    notifData.is_read
                ]
            );

            const [notification] = await pool.query(
                'SELECT * FROM notifications WHERE id = ?',
                [result.insertId]
            );

            if (this.io) {
                this.io.emit('newNotification', notification[0]);
            }
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    broadcastDeviceUpdate(deviceData) {
        if (this.io) {
            this.io.emit('deviceUpdate', deviceData);
        }
    }

    publishCommand(topic, payload) {
        console.log('Publishing MQTT message:');
        console.log('Topic:', topic);
        console.log('Payload:', payload);

        // Pastikan payload adalah string
        const messagePayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
        
        this.client.publish(topic, messagePayload, (error) => {
            if (error) {
                console.error('MQTT publish error:', error);
            } else {
                console.log('MQTT message published successfully');
            }
        });
    }

    async controlRelay(relayNumber, action) {
        try {
            const command = `RELAY${relayNumber}_${action}`;
            this.publishCommand(command);
            console.log(`Sent command: ${command}`);

            // Create notification for relay control
            await this.createNotification({
                type: 'device',
                title: 'Relay Control',
                message: `Relay ${relayNumber} ${action}`,
                severity: 'info',
                value: null,
                threshold: null,
                is_read: 0
            });

            return true;
        } catch (error) {
            console.error('Error in controlRelay:', error);
            throw error;
        }
    }

    async requestClapStatus() {
        return new Promise((resolve) => {
            // Publish request ke ESP
            this.client.publish('smarthome/request_clap_status', JSON.stringify({ request: true }));
            
            // Subscribe untuk mendengarkan response
            this.client.subscribe('smarthome/clap_status', (message) => {
                const status = JSON.parse(message);
                resolve(status);
            });
        });
    }
}

module.exports = new MqttService();
