const mqttService = require('../services/mqttService');

const controlRelay = (req, res) => {
    const { relay, action } = req.body;
    console.log('Control relay request:', { relay, action }); // Debug log

    // Validasi input
    if (!relay || !action) {
        return res.status(400).json({ error: 'Missing relay number or action' });
    }

    // Pastikan relay adalah number antara 1-4
    const relayNum = parseInt(relay);
    if (isNaN(relayNum) || relayNum < 1 || relayNum > 4) {
        return res.status(400).json({ error: 'Invalid relay number (must be 1-4)' });
    }

    // Pastikan action adalah ON atau OFF
    if (action !== 'ON' && action !== 'OFF') {
        return res.status(400).json({ error: 'Invalid action (must be ON or OFF)' });
    }

    try {
        const command = `RELAY${relayNum}_${action}`;
        console.log('Publishing command:', command); // Debug log
        mqttService.publishCommand(command);
        res.json({ status: 'OK', command });
    } catch (error) {
        console.error('Error controlling relay:', error);
        res.status(500).json({ error: 'Failed to control relay: ' + error.message });
    }
};

module.exports = { controlRelay };
