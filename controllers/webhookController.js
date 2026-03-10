// controllers/webhookController.js
const Order = require('../models/Order');
const crypto = require('crypto');

const webhookController = {
    async handleWebhook(req, res) {
        try {
            // Get signature from header
            const signature = req.headers['http_x_premiy_signature'];
            const payload = JSON.stringify(req.body);
            
            // Verify signature
            const secret = process.env.WR_API_KEY;
            const expected = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid signature'
                });
            }

            // Process webhook
            const { event, data } = req.body;
            
            await Order.updateFromWebhook(event, data);

            // Log webhook for debugging
            console.log(`Webhook received: ${event}`, data);

            res.json({
                success: true,
                message: 'Webhook processed successfully'
            });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = webhookController;