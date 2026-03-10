// routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// Public routes - no auth required
router.post('/submit', supportController.submitTicket);
router.get('/bot-info', supportController.getBotInfo);

module.exports = router;
