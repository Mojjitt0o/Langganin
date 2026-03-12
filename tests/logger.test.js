/**
 * Tests: services/logger.js
 * Covers: logger instance, httpMiddleware
 */
process.env.NODE_ENV = 'test';

const logger = require('../services/logger');

describe('logger service', () => {
    test('exports an object with standard log methods', () => {
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    test('exports httpMiddleware function', () => {
        expect(typeof logger.httpMiddleware).toBe('function');
    });

    test('httpMiddleware calls next()', () => {
        const req  = { method: 'GET', originalUrl: '/api/test', ip: '127.0.0.1' };
        const res  = { on: jest.fn() };
        const next = jest.fn();

        logger.httpMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('httpMiddleware attaches finish listener to response', () => {
        const req  = { method: 'GET', originalUrl: '/api/test', ip: '::1' };
        const res  = { on: jest.fn() };
        const next = jest.fn();

        logger.httpMiddleware(req, res, next);

        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
});
