const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const deviceGroupController = require('../controllers/deviceGroupController');
const scheduleController = require('../controllers/scheduleController');

// Device routes
router.get('/', deviceController.getDevices);
router.post('/add-device', deviceController.addDevice);
router.delete('/devices/:id', deviceController.deleteDevice);
router.post('/move-device', deviceController.moveDevice);
router.put('/devices/:id/status', deviceController.updateDeviceStatus);
router.post('/update-device-status', deviceController.updateDeviceStatus);

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

module.exports = router;
