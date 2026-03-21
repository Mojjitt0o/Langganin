process.env.JWT_SECRET = 'test_jwt_secret_for_register_referral';
process.env.NODE_ENV = 'test';

jest.mock('../services/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    httpMiddleware: (req, res, next) => next()
}));

jest.mock('../services/telegramBot', () => ({
    logEvent: jest.fn()
}));

jest.mock('../models/User', () => ({
    findByEmail: jest.fn(),
    create: jest.fn()
}));

jest.mock('../models/Affiliate', () => ({
    findByCode: jest.fn(),
    setReferrer: jest.fn()
}));

const User = require('../models/User');
const Affiliate = require('../models/Affiliate');
const authController = require('../controllers/authController');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
}

describe('authController.register referral flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('normalizes referral code and links the new user to the referrer', async () => {
        User.findByEmail.mockResolvedValueOnce(null);
        User.create.mockResolvedValueOnce(101);
        Affiliate.findByCode.mockResolvedValueOnce({ id: 202, username: 'user-b' });

        const req = {
            body: {
                username: 'user-a',
                email: 'user-a@example.com',
                password: 'secret123',
                ref: '  userb-ab12cd  '
            }
        };
        const res = mockRes();

        await authController.register(req, res);

        expect(Affiliate.findByCode).toHaveBeenCalledWith('USERB-AB12CD');
        expect(Affiliate.setReferrer).toHaveBeenCalledWith(101, 202);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('does not create a self-referral when the code resolves to the same user', async () => {
        User.findByEmail.mockResolvedValueOnce(null);
        User.create.mockResolvedValueOnce(303);
        Affiliate.findByCode.mockResolvedValueOnce({ id: 303, username: 'same-user' });

        const req = {
            body: {
                username: 'same-user',
                email: 'same@example.com',
                password: 'secret123',
                ref: 'same-user'
            }
        };
        const res = mockRes();

        await authController.register(req, res);

        expect(Affiliate.setReferrer).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
