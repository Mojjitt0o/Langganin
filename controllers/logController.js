// controllers/logController.js
const Log = require('../models/Log');

const logController = {
    async getLogs(req, res) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
            const logs = await Log.getRecent(limit);
            res.json({ success: true, data: logs });
        } catch (error) {
            console.error('getLogs error:', error.message);
            res.status(500).json({ success: false, message: 'Gagal mengambil logs.' });
        }
    }
};

module.exports = logController;
