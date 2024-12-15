const mqttService = require('../services/mqttService');

const controlRelay = async (req, res) => {
    try {
        const { topic, message } = req.body;
        console.log('Received control request:', { topic, message });

        // Publish ke MQTT dengan topic yang benar
        mqttService.publishCommand(topic, message);

        res.json({ success: true, message: 'Command sent successfully' });
    } catch (error) {
        console.error('Error in controlRelay:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { controlRelay };
