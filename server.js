const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mqttService = require('./src/services/mqttService');
const scheduleService = require('./src/services/scheduleService');

// Import routes
const deviceRoutes = require('./src/routes/deviceRoutes');
const controlRoutes = require('./src/routes/controlRoutes');
const cctvRoutes = require('./src/routes/cctvRoutes');
const weatherRoutes = require('./src/routes/weatherRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize MQTT service with Socket.IO
mqttService.connect(io);

// Initialize schedule service
scheduleService.initializeSchedules();

// Routes
app.use('/devices', deviceRoutes);
app.use('/control', controlRoutes);
app.use('/cctv', cctvRoutes);
app.use('/api/weather', weatherRoutes);

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cctv-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cctv.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
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
