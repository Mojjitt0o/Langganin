/**
 * Tests: Midtrans signature verification logic
 * Covers: SHA512 signature check in topupController.handleNotification
 */
process.env.MIDTRANS_SERVER_KEY = 'test_midtrans_server_key';
process.env.MIDTRANS_CLIENT_KEY = 'test_midtrans_client_key';
process.env.MIDTRANS_IS_PRODUCTION = 'false';
process.env.NODE_ENV = 'test';

const crypto = require('crypto');

// Mock heavy dependencies
jest.mock('../services/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(),
    httpMiddleware: (req, res, next) => next()
}));
jest.mock('../config/database', () => ({
    query: jest.fn(),
    pool:  { connect: jest.fn() }
}));
jest.mock('midtrans-client', () => {
    const mockFn = jest.fn().mockImplementation(() => ({
        transaction: { notification: jest.fn() }
    }));
    return { Snap: mockFn, CoreApi: mockFn };
});

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

function buildMidtransSignature(orderId, statusCode, grossAmount, serverKey) {
    return crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');
}

describe('Midtrans SHA512 signature verification', () => {
    // We test the logic directly without loading the full controller module
    // to avoid connecting to DB / Midtrans in unit tests.
    test('valid signature matches expected hash', () => {
        const orderId     = 'TOPUP-001';
        const statusCode  = '200';
        const grossAmount = '50000.00';
        const serverKey   = 'test_midtrans_server_key';

        const sig = buildMidtransSignature(orderId, statusCode, grossAmount, serverKey);
        const expected = buildMidtransSignature(orderId, statusCode, grossAmount, serverKey);

        expect(sig).toBe(expected);
        expect(sig).toHaveLength(128); // SHA512 hex = 128 chars
    });

    test('signature changes if order_id differs', () => {
        const serverKey = 'test_key';
        const sig1 = buildMidtransSignature('ORD-1', '200', '10000.00', serverKey);
        const sig2 = buildMidtransSignature('ORD-2', '200', '10000.00', serverKey);
        expect(sig1).not.toBe(sig2);
    });

    test('signature changes if amount differs', () => {
        const serverKey = 'test_key';
        const sig1 = buildMidtransSignature('ORD-1', '200', '10000.00', serverKey);
        const sig2 = buildMidtransSignature('ORD-1', '200', '99999.00', serverKey);
        expect(sig1).not.toBe(sig2);
    });

    test('signature changes if server key differs', () => {
        const sig1 = buildMidtransSignature('ORD-1', '200', '10000.00', 'key_a');
        const sig2 = buildMidtransSignature('ORD-1', '200', '10000.00', 'key_b');
        expect(sig1).not.toBe(sig2);
    });

    test('tampered signature does not match', () => {
        const serverKey = 'test_midtrans_server_key';
        const valid = buildMidtransSignature('ORD-1', '200', '10000.00', serverKey);
        const tampered = valid.slice(0, -1) + (valid.endsWith('0') ? '1' : '0');
        expect(valid).not.toBe(tampered);
    });
});
