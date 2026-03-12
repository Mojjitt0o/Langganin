/**
 * Tests: authController login/register/logout
 * Covers: cookie set, user_data shape, error handling
 */
process.env.JWT_SECRET     = 'test_jwt_secret_for_unit_tests';
process.env.SESSION_SECRET = 'test_session';
process.env.NODE_ENV       = 'test';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

jest.mock('../services/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(),
    httpMiddleware: (req, res, next) => next()
}));
jest.mock('../models/User');
jest.mock('../models/Affiliate', () => ({
    findByCode: jest.fn(),
    setReferrer: jest.fn()
}));

const User = require('../models/User');
const authController = require('../controllers/authController');

function mockRes() {
    const res = {};
    res.status  = jest.fn().mockReturnValue(res);
    res.json    = jest.fn().mockReturnValue(res);
    res.cookie  = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
}

// ── login ─────────────────────────────────────────────────────────────────────
describe('authController.login', () => {
    const hashedPw = bcrypt.hashSync('password123', 10);

    test('returns 401 for unknown email', async () => {
        User.findByEmail.mockResolvedValueOnce(null);

        const req = { body: { email: 'unknown@x.com', password: 'abc' }, session: {} };
        const res = mockRes();

        await authController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('returns 401 for wrong password', async () => {
        User.findByEmail.mockResolvedValueOnce({
            id: 1, email: 'user@x.com', password: hashedPw,
            username: 'user', balance: 0, is_admin: false
        });

        const req = { body: { email: 'user@x.com', password: 'wrongpass' }, session: {} };
        const res = mockRes();

        await authController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('sets httpOnly auth_token cookie on success', async () => {
        User.findByEmail.mockResolvedValueOnce({
            id: 1, email: 'user@x.com', password: hashedPw,
            username: 'johns', balance: 50000, is_admin: false
        });

        const req = { body: { email: 'user@x.com', password: 'password123' }, session: {} };
        const res = mockRes();

        await authController.login(req, res);

        expect(res.cookie).toHaveBeenCalledWith(
            'auth_token',
            expect.any(String),
            expect.objectContaining({ httpOnly: true })
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('response does NOT include token field (httpOnly cookie only)', async () => {
        User.findByEmail.mockResolvedValueOnce({
            id: 1, email: 'u@x.com', password: hashedPw,
            username: 'u', balance: 0, is_admin: false
        });

        const req = { body: { email: 'u@x.com', password: 'password123' }, session: {} };
        const res = mockRes();

        await authController.login(req, res);

        const call = res.json.mock.calls[0][0];
        // token must NOT be in the JSON response
        expect(call.token).toBeUndefined();
        expect(call.data?.token).toBeUndefined();
    });

    test('response includes user profile data', async () => {
        User.findByEmail.mockResolvedValueOnce({
            id: 5, email: 'x@y.com', password: hashedPw,
            username: 'myuser', balance: 100000, is_admin: true
        });

        const req = { body: { email: 'x@y.com', password: 'password123' }, session: {} };
        const res = mockRes();

        await authController.login(req, res);

        const body = res.json.mock.calls[0][0];
        expect(body.data.user).toMatchObject({
            id: 5, username: 'myuser', email: 'x@y.com',
            balance: 100000, is_admin: true
        });
    });
});

// ── logout ────────────────────────────────────────────────────────────────────
describe('authController.logout', () => {
    test('clears auth_token cookie', async () => {
        const req = { session: { destroy: jest.fn(cb => cb && cb()) } };
        const res = mockRes();

        await authController.logout(req, res);

        expect(res.clearCookie).toHaveBeenCalledWith('auth_token');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});

// ── register ──────────────────────────────────────────────────────────────────
describe('authController.register', () => {
    test('returns 400 if email already exists', async () => {
        User.findByEmail.mockResolvedValueOnce({ id: 1, email: 'exists@x.com' });

        const req = { body: { username: 'u', email: 'exists@x.com', password: 'pw123456' }, session: {} };
        const res = mockRes();

        await authController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('sets httpOnly cookie and returns 201 on success', async () => {
        User.findByEmail.mockResolvedValueOnce(null);
        User.create.mockResolvedValueOnce(99);

        const req = { body: { username: 'newuser', email: 'new@x.com', password: 'securePass1' }, session: {} };
        const res = mockRes();

        await authController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.cookie).toHaveBeenCalledWith(
            'auth_token',
            expect.any(String),
            expect.objectContaining({ httpOnly: true })
        );
    });
});
