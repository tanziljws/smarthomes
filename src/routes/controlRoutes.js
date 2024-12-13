const express = require('express');
const router = express.Router();
const relayController = require('../controllers/relayController');

router.post('/', relayController.controlRelay);

module.exports = router;
