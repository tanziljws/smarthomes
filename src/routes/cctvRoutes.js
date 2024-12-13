const express = require('express');
const router = express.Router();
const cctvController = require('../controllers/cctvController');

// CCTV Group routes
router.get('/groups', cctvController.getCctvGroups);
router.post('/groups', cctvController.addCctvGroup);
router.put('/groups/:id', cctvController.editCctvGroup);
router.delete('/groups/:id', cctvController.deleteCctvGroup);

// CCTV routes
router.get('/', cctvController.getCctvs);
router.post('/add', cctvController.addCctv);
router.put('/:id', cctvController.editCctv);
router.delete('/:id', cctvController.deleteCctv);

// Tambahkan route baru
router.get('/groups/:id', cctvController.getCctvGroupDetail);

module.exports = router;
