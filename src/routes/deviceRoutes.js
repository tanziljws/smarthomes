const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const deviceGroupController = require('../controllers/deviceGroupController');
const scheduleController = require('../controllers/scheduleController');
const mqttService = require('../services/mqttService');

// Device routes
router.get('/', deviceController.getDevices);
router.post('/add-device', deviceController.addDevice);
router.delete('/devices/:id', deviceController.deleteDevice);
router.post('/move-device', deviceController.moveDevice);
router.put('/devices/:id/status', deviceController.updateDeviceStatus);
router.post('/update-device-status', deviceController.updateDeviceStatus);
router.post('/clap-settings', async (req, res) => {
    try {
        const { deviceId, enabled, threshold } = req.body;
        
        // Update local state first
        const updatedStatus = mqttService.updateClapStatus(
            enabled, 
            deviceId, 
            threshold
        );
        
        // Prepare payload for ESP
        const clapSettingPayload = {
            enabled: enabled,
            deviceId: deviceId !== undefined ? parseInt(deviceId) : 0
        };
        
        // Send commands to ESP
        mqttService.publishCommand('smarthome/clap_setting', clapSettingPayload);

        if (threshold !== undefined) {
            mqttService.publishCommand('smarthome/sound_threshold', {
                threshold: parseInt(threshold)
            });
        }

        res.json({ 
            success: true, 
            ...updatedStatus 
        });
    } catch (error) {
        console.error('Error updating clap settings:', error);
        res.status(500).json({ 
            error: 'Failed to update clap settings',
            details: error.message 
        });
    }
});

// Tambahkan route baru untuk get clap settings
router.get('/clap-settings', async (req, res) => {
    try {
        const status = await mqttService.requestClapStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting clap settings:', error);
        res.json({ enabled: false });
    }
});

// Group routes
router.get('/groups', deviceGroupController.getGroups);
router.post('/groups', deviceGroupController.addGroup);
router.put('/groups/:id', deviceGroupController.editGroup);
router.delete('/groups/:id', deviceGroupController.deleteGroup);

// Schedule routes
router.get('/schedules', scheduleController.getSchedules);
router.post('/schedules', scheduleController.addSchedule);
router.delete('/schedules/:id', scheduleController.deleteSchedule);
router.get('/schedules/:id', scheduleController.getScheduleById);
router.put('/schedules/:id', scheduleController.updateSchedule);

// Add this route before module.exports
router.get('/devices/:id', deviceController.getDeviceById);
router.put('/devices/:id', deviceController.updateDevice);

module.exports = router;
