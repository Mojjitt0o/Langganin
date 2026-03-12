// controllers/webhookController.js
const Order = require('../models/Order');
const crypto = require('crypto');
const logger = require('../services/logger');

const webhookController = {
    async handleWebhook(req, res) {
        try {
            // Reject immediately if signature header is absent
            const signature = req.headers['http_x_premiy_signature'];
            if (!signature || typeof signature !== 'string') {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const payload = JSON.stringify(req.body);
            const secret  = process.env.WR_API_KEY;

            const expected = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            // timingSafeEqual requires equal-length Buffers — compare hex strings (same length by construction)
            const expectedBuf  = Buffer.from(expected,  'utf8');
            const signatureBuf = Buffer.from(signature, 'utf8');

            const isValid =
                expectedBuf.length === signatureBuf.length &&
                crypto.timingSafeEqual(expectedBuf, signatureBuf);

            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Invalid signature' });
            }

            const { event, data } = req.body;
            await Order.updateFromWebhook(event, data);

            logger.info(`WR Webhook received: ${event} — order ${data?.order_id}`);

            res.json({ success: true, message: 'Webhook processed successfully' });
        } catch (error) {
            logger.error('Webhook error: ' + error.message);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    }
};

module.exports = webhookController;