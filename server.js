const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mysql = require('mysql2/promise');
const mqttService = require('./src/services/mqttService');

// Import routes
const deviceRoutes = require('./src/routes/deviceRoutes');
const controlRoutes = require('./src/routes/controlRoutes');
const cctvRoutes = require('./src/routes/cctvRoutes');
const weatherRoutes = require('./src/routes/weatherRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize MQTT service with Socket.IO
mqttService.connect(io);

// Routes
app.use('/devices', deviceRoutes);
app.use('/control', controlRoutes);
app.use('/cctv', cctvRoutes);
app.use('/weather', weatherRoutes);
app.use('/notifications', notificationRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    // Handle relay control requests
    socket.on('controlRelay', async (data) => {
        console.log('Control relay request:', data);
        try {
            await mqttService.controlRelay(data.relay, data.action);
            // Emit ke semua client
            io.emit('deviceStatusUpdate', {
                relay: data.relay,
                status: data.action
            });
        } catch (error) {
            console.error('Error controlling relay:', error);
        }
    });
});

// MQTT message handling
mqttService.client.on('message', (topic, message) => {
    try {
        if (topic === 'smarthome/status') {
            // Handle relay status updates (non-JSON messages)
            const status = message.toString();
            console.log('Sending relay status:', status);
            io.emit('relayStatus', status);
            io.emit('deviceStatusUpdate', status);
        } 
        else if (topic === 'smarthome/dht') {
            // Handle DHT sensor data (JSON messages)
            const data = JSON.parse(message.toString());
            io.emit('dhtData', data);
        }
        else if (topic === 'smarthome/airquality') {
            // Handle air quality data (JSON messages)
            const data = JSON.parse(message.toString());
            io.emit('airQuality', data);
        }
    } catch (error) {
        // Log error tapi jangan stop execution
        console.error('Error handling MQTT message:', error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
