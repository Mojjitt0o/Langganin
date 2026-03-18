// routes/logRoutes.js
const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, logController.getLogs);

module.exports = router;
