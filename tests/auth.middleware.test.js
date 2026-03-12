/**
 * Tests: middleware/auth.js
 * Covers: verifyToken, isAdmin, checkSession
 */
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests';
process.env.SESSION_SECRET = 'test_session_secret';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

// ── helpers ──
function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
}

function signToken(payload, secret = process.env.JWT_SECRET) {
    return jwt.sign(payload, secret, { expiresIn: '1h' });
}

// ── verifyToken ──────────────────────────────────────────────────────────────
describe('authMiddleware.verifyToken', () => {
    test('rejects request with no token', () => {
        const req  = { cookies: {}, headers: {}, query: {}, body: {} };
        const res  = mockRes();
        const next = jest.fn();

        authMiddleware.verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        expect(next).not.toHaveBeenCalled();
    });

    test('accepts valid token from Authorization header', () => {
        const token = signToken({ id: 1, email: 'a@b.com' });
        const req   = {
            cookies: {},
            headers: { authorization: `Bearer ${token}` },
            query: {}, body: {}
        };
        const res  = mockRes();
        const next = jest.fn();

        authMiddleware.verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe(1);
        expect(req.userEmail).toBe('a@b.com');
    });

    test('accepts valid token from httpOnly cookie', () => {
        const token = signToken({ id: 42, email: 'x@y.com' });
        const req   = {
            cookies: { auth_token: token },
            headers: {},
            query: {}, body: {}
        };
        const res  = mockRes();
        const next = jest.fn();

        authMiddleware.verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe(42);
    });

    test('rejects expired token', () => {
        const token = jwt.sign({ id: 1, email: 'a@b.com' }, process.env.JWT_SECRET, { expiresIn: -1 });
        const req   = {
            cookies: { auth_token: token },
            headers: {},
            query: {}, body: {}
        };
        const res  = mockRes();
        const next = jest.fn();

        authMiddleware.verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects token signed with wrong secret', () => {
        const token = signToken({ id: 1 }, 'wrong_secret');
        const req   = {
            cookies: { auth_token: token },
            headers: {},
            query: {}, body: {}
        };
        const res  = mockRes();
        const next = jest.fn();

        authMiddleware.verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});

// ── checkSession ─────────────────────────────────────────────────────────────
describe('authMiddleware.checkSession', () => {
    test('rejects when session.userId is missing', () => {
        const req  = { session: {} };
        const res  = mockRes();
        const next = jest.fn();

        authMiddleware.checkSession(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('accepts when session.userId is set', () => {
        const req  = { session: { userId: 7 } };
        const res  = mockRes();
        const next = jest.fn();

        authMiddleware.checkSession(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe(7);
    });
});

// ── isAdmin ───────────────────────────────────────────────────────────────────
describe('authMiddleware.isAdmin', () => {
    test('rejects non-admin user', async () => {
        // Mock User.findById to return a non-admin user
        const User = require('../models/User');
        jest.spyOn(User, 'findById').mockResolvedValueOnce({ id: 1, is_admin: false });

        const req  = { userId: 1 };
        const res  = mockRes();
        const next = jest.fn();

        await authMiddleware.isAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('allows admin user', async () => {
        const User = require('../models/User');
        jest.spyOn(User, 'findById').mockResolvedValueOnce({ id: 2, is_admin: true });

        const req  = { userId: 2 };
        const res  = mockRes();
        const next = jest.fn();

        await authMiddleware.isAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('returns 403 when user not found', async () => {
        const User = require('../models/User');
        jest.spyOn(User, 'findById').mockResolvedValueOnce(null);

        const req  = { userId: 99 };
        const res  = mockRes();
        const next = jest.fn();

        await authMiddleware.isAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});
