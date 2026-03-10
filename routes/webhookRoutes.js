// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/warung-rebahan', webhookController.handleWebhook);

module.exports = router;