// controllers/webhookController.js
const Order = require('../models/Order');
const crypto = require('crypto');
const logger = require('../services/logger');
const lockManager = require('../services/lockManager');

const webhookController = {
    async handleWebhook(req, res) {
        try {
            logger.info('📥 [Webhook] Request received');

            // Get raw body (should be Buffer when using express.raw())
            let rawBody;
            if (Buffer.isBuffer(req.body)) {
                rawBody = req.body;
                logger.debug(`[Webhook] Raw body is Buffer, size=${rawBody.length}`);
            } else if (typeof req.body === 'string') {
                rawBody = Buffer.from(req.body, 'utf8');
                logger.debug(`[Webhook] Raw body is String, converted to Buffer`);
            } else {
                logger.warn('[Webhook] ⚠️ Body is not buffer or string, converting...');
                rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
            }

            // Log first 200 chars of raw body for debugging
            logger.debug(`[Webhook] Payload preview: ${rawBody.toString('utf8').substring(0, 200)}...`);

            // Check all possible signature header formats WR might use
            let signature = req.headers['http_x_premiy_signature'] 
                         || req.headers['x-premiy-signature']
                         || req.headers['x-signature']
                         || req.headers['signature']
                         || req.headers['x-warung-signature']
                         || req.headers['x-webhook-signature'];

            if (!signature) {
                logger.warn('[Webhook] ⚠️ No signature header found');
                logger.debug('[Webhook] Available headers:', Object.keys(req.headers).join(', '));
                // For development/testing without signature, allow but log warning
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ success: false, message: 'Missing signature header' });
                } else {
                    logger.warn('[Webhook] ℹ️ Signature check skipped (dev mode)');
                }
            } else {
                logger.info(`[Webhook] ✓ Signature header found: ${signature.substring(0, 30)}...`);

                const secret = process.env.WR_API_KEY;
                if (!secret) {
                    logger.error('[Webhook] ❌ WR_API_KEY not configured!');
                    return res.status(500).json({ success: false, message: 'Server configuration error' });
                }
                
                // Calculate signature from raw body using WR_API_KEY as secret
                const expected = crypto
                    .createHmac('sha256', secret)
                    .update(rawBody)
                    .digest('hex');

                logger.debug(`[Webhook] Expected sig: ${expected.substring(0, 30)}...`);
                logger.debug(`[Webhook] Got sig:      ${signature.substring(0, 30)}...`);

                // timingSafeEqual requires equal-length Buffers
                const expectedBuf  = Buffer.from(expected,  'utf8');
                const signatureBuf = Buffer.from(signature, 'utf8');

                const isValid =
                    expectedBuf.length === signatureBuf.length &&
                    crypto.timingSafeEqual(expectedBuf, signatureBuf);

                if (!isValid) {
                    logger.error(`[Webhook] ❌ Invalid signature! (len: ${expectedBuf.length} vs ${signatureBuf.length})`);
                    return res.status(401).json({ success: false, message: 'Invalid signature' });
                }

                logger.info('[Webhook] ✅ Signature validated');
            }

            // Parse the body
            let data;
            try {
                data = JSON.parse(rawBody.toString('utf8'));
                logger.info(`[Webhook] ✓ Payload parsed: event=${data.event}, order=${data.data?.order_id}`);
            } catch (e) {
                logger.error(`[Webhook] ❌ Failed to parse JSON: ${e.message}`);
                logger.error(`[Webhook] Raw body was: ${rawBody.toString('utf8').substring(0, 500)}`);
                return res.status(400).json({ success: false, message: 'Invalid JSON in body' });
            }

            const { event, data: webhookData } = data;
            const orderId = webhookData?.order_id;
            
            if (!orderId) {
                logger.error('[Webhook] ❌ Missing order_id in webhook payload');
                return res.status(400).json({ success: false, message: 'Missing order_id' });
            }
            
            logger.info(`[Webhook] 🔄 Processing: event=${event}, order=${orderId}, status=${webhookData?.status}`);
            logger.debug(`[Webhook] Full data: ${JSON.stringify(webhookData).substring(0, 500)}`);
            
            // Race condition prevention: Check if background task is processing this order
            if (lockManager.isLocked(orderId)) {
                logger.warn(`[Webhook] ⏳ Order ${orderId} already locked by background task, returning success`);
                // Return success so WR doesn't retry, but don't process
                return res.json({ success: true, message: 'Order already being processed' });
            }

            // Try to acquire lock for this order
            if (!lockManager.acquireLock(orderId)) {
                logger.info(`[Webhook] ℹ️ Order ${orderId} already processing, skipping...`);
                return res.json({ success: true, message: 'Order already being processed' });
            }

            try {
                const updated = await Order.updateFromWebhook(event, webhookData);

                if (updated) {
                    logger.info(`[Webhook] ✅ Order ${orderId} updated successfully`);
                } else {
                    logger.warn(`[Webhook] ⚠️ Order ${orderId} update returned false`);
                }
                
                // Send telegram notification
                const telegramBot = require('../services/telegramBot');
                telegramBot.logEvent(
                  `✅ Webhook: ${event}`,
                  `Order ID: ${orderId}\nStatus: ${webhookData?.status || 'N/A'}\nHas Account Details: ${!!webhookData?.account_details}\n✅ Processed successfully`
                );

                res.json({ success: true, message: 'Webhook processed successfully', order_id: orderId });
            } catch (err) {
                logger.error(`[Webhook] ❌ Error processing order ${orderId}: ${err.message}`);
                logger.error(`[Webhook] Stack: ${err.stack}`);
                
                // Still return success to prevent WR retry, but log the error
                const telegramBot = require('../services/telegramBot');
                telegramBot.logEvent(
                  `❌ Webhook Error: ${event}`,
                  `Order ID: ${orderId}\nError: ${err.message}`
                );
                
                // Return success anyway to prevent WR infinite retry
                res.json({ success: true, message: 'Webhook processed (with errors)', error: err.message });
            } finally {
                // Always release lock
                lockManager.releaseLock(orderId);
                logger.debug(`[Webhook] Lock released for ${orderId}`);
            }

        } catch (error) {
            logger.error('[Webhook] ❌ Fatal error: ' + error.message);
            logger.error('[Webhook] Stack: ' + error.stack);
            
            const telegramBot = require('../services/telegramBot');
            telegramBot.logEvent(
              '❌ Webhook Fatal Error',
              `Error: ${error.message}\n\nCheck server logs immediately!`
            );
            
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
};

module.exports = webhookController;