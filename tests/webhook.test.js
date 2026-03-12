/**
 * Tests: controllers/webhookController.js
 * Covers: HMAC signature verification, missing header, valid/invalid signature
 */
process.env.WR_API_KEY = 'test_webhook_secret';
process.env.NODE_ENV   = 'test';

const crypto = require('crypto');

// Mock logger so tests don't write to stdout
jest.mock('../services/logger', () => ({
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
    httpMiddleware: (req, res, next) => next()
}));

// Mock Order model
jest.mock('../models/Order', () => ({
    updateFromWebhook: jest.fn().mockResolvedValue(true)
}));

const webhookController = require('../controllers/webhookController');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

function makeSignedRequest(body, secret = 'test_webhook_secret') {
    const payload = JSON.stringify(body);
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return {
        headers: { http_x_premiy_signature: sig },
        body
    };
}

describe('webhookController.handleWebhook', () => {
    test('returns 401 when signature header is missing', async () => {
        const req = { headers: {}, body: {} };
        const res = mockRes();

        await webhookController.handleWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('returns 401 when signature header is not a string', async () => {
        const req = { headers: { http_x_premiy_signature: 12345 }, body: {} };
        const res = mockRes();

        await webhookController.handleWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 401 when signature is valid-looking but wrong', async () => {
        const body = { event: 'order.paid', data: { order_id: 'abc123' } };
        const req  = {
            headers: { http_x_premiy_signature: 'deadbeef'.repeat(8) }, // 64 wrong hex chars
            body
        };
        const res = mockRes();

        await webhookController.handleWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('processes valid webhook with correct HMAC signature', async () => {
        const body = { event: 'order.paid', data: { order_id: 'ORD-001', status: 'success' } };
        const req  = makeSignedRequest(body);
        const res  = mockRes();

        await webhookController.handleWebhook(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('returns 401 when secret key is different', async () => {
        const body = { event: 'order.paid', data: { order_id: 'ORD-002' } };
        const req  = makeSignedRequest(body, 'wrong_secret');
        const res  = mockRes();

        await webhookController.handleWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });
});
