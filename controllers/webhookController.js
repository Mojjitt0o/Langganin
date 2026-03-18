// controllers/webhookController.js
const Order = require('../models/Order');
const crypto = require('crypto');
const logger = require('../services/logger');
const lockManager = require('../services/lockManager');

const webhookController = {
    async handleWebhook(req, res) {
        try {
            logger.info('📥 Webhook request received');

            // Get raw body (should be Buffer when using express.raw())
            let rawBody;
            if (Buffer.isBuffer(req.body)) {
                rawBody = req.body;
                logger.debug(`Raw body (buffer): ${rawBody.toString().substring(0, 100)}...`);
            } else if (typeof req.body === 'string') {
                rawBody = Buffer.from(req.body, 'utf8');
                logger.debug(`Raw body (string): ${req.body.substring(0, 100)}...`);
            } else {
                logger.warn('⚠️ Body is not buffer or string, trying to convert...');
                rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
            }

            // Check all possible signature header formats WR might use
            let signature = req.headers['http_x_premiy_signature'] 
                         || req.headers['x-premiy-signature']
                         || req.headers['x-signature']
                         || req.headers['signature']
                         || req.headers['x-warung-signature'];

            if (!signature || typeof signature !== 'string') {
                logger.warn('⚠️ Webhook signature header not found. Available headers:', Object.keys(req.headers));
                return res.status(401).json({ success: false, message: 'Missing signature header' });
            }

            logger.info(`✓ Signature found: ${signature.substring(0, 20)}...`);

            const secret = process.env.WR_API_KEY;
            
            // Calculate signature from raw body
            const expected = crypto
                .createHmac('sha256', secret)
                .update(rawBody)
                .digest('hex');

            logger.debug(`Expected: ${expected.substring(0, 20)}...`);
            logger.debug(`Got:      ${signature.substring(0, 20)}...`);

            // timingSafeEqual requires equal-length Buffers
            const expectedBuf  = Buffer.from(expected,  'utf8');
            const signatureBuf = Buffer.from(signature, 'utf8');

            const isValid =
                expectedBuf.length === signatureBuf.length &&
                crypto.timingSafeEqual(expectedBuf, signatureBuf);

            if (!isValid) {
                logger.error(`❌ Invalid signature! (len: ${expectedBuf.length} vs ${signatureBuf.length})`);
                return res.status(401).json({ success: false, message: 'Invalid signature' });
            }

            logger.info('✅ Signature validated');

            // Now parse the body
            let data;
            try {
                data = JSON.parse(rawBody.toString('utf8'));
            } catch (e) {
                logger.error('❌ Failed to parse JSON:', e.message);
                return res.status(400).json({ success: false, message: 'Invalid JSON in body' });
            }

            const { event, data: webhookData } = data;
            const orderId = webhookData?.order_id;
            
            logger.info(`🔄 Processing webhook: event=${event}, order=${orderId}`);
            
            // Race condition prevention: Check if background task is processing this order
            if (lockManager.isLocked(orderId)) {
                logger.warn(`⚠️ Order ${orderId} is being processed by background task, webhook will wait...`);
                // Return success so WR doesn't retry, but don't process
                // Background task will handle it
                return res.json({ success: true, message: 'Order already being processed, skipped' });
            }

            // Try to acquire lock for this order
            if (!lockManager.acquireLock(orderId)) {
                logger.info(`ℹ️ Order ${orderId} already processing, skipping...`);
                return res.json({ success: true, message: 'Order already being processed' });
            }

            try {
                await Order.updateFromWebhook(event, webhookData);

                logger.info(`✅ Order updated: ${orderId}`);
                
                const telegramBot = require('../services/telegramBot');
                telegramBot.logEvent(
                  '✅ WR Webhook Received',
                  `Event: ${event}\nOrder ID: ${orderId}\nStatus: ${webhookData?.status || 'N/A'}\nHas Details: ${!!webhookData?.account_details}`
                );

                res.json({ success: true, message: 'Webhook processed successfully' });
            } finally {
                // Always release lock
                lockManager.releaseLock(orderId);
            }

        } catch (error) {
            logger.error('❌ Webhook error: ' + error.message);
            logger.error(error.stack);
            
            const telegramBot = require('../services/telegramBot');
            telegramBot.logEvent(
              '❌ Webhook Error',
              `Error: ${error.message}`
            );
            
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    }
};

module.exports = webhookController;