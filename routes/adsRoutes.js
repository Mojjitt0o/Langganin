const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');

// GET /api/ads/settings
router.get('/settings', adsController.getAdSettings);

module.exports = router;
