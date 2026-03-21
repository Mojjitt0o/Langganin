process.env.NODE_ENV = 'test';
process.env.WR_API_URL = 'https://wr.test';
process.env.WR_API_KEY = 'wr_test_key';

jest.mock('../config/database', () => {
    const client = {
        query: jest.fn(),
        release: jest.fn()
    };

    return {
        query: jest.fn(),
        pool: {
            connect: jest.fn().mockResolvedValue(client)
        },
        __client: client
    };
});

jest.mock('axios', () => ({
    post: jest.fn()
}));

jest.mock('../services/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    httpMiddleware: (req, res, next) => next()
}));

jest.mock('../services/telegramBot', () => ({
    logEvent: jest.fn()
}));

jest.mock('../services/lockManager', () => ({
    acquireLock: jest.fn().mockReturnValue(false),
    releaseLock: jest.fn()
}));

jest.mock('../models/Affiliate', () => ({
    calcDiscount: jest.fn(),
    recordCommission: jest.fn()
}));

const axios = require('axios');
const db = require('../config/database');
const Affiliate = require('../models/Affiliate');
const Order = require('../models/Order');

describe('Order.create referral discount flow', () => {
    const client = db.__client;

    beforeEach(() => {
        jest.clearAllMocks();
        db.pool.connect.mockResolvedValue(client);
    });

    test('stores discounted total and discount_amount for referred users', async () => {
        db.query
            .mockResolvedValueOnce([[{ original_price: 10000, sell_price: 20000 }], []])
            .mockResolvedValueOnce([[{ balance: 50000, referred_by: 202 }], []]);

        axios.post.mockResolvedValueOnce({
            data: {
                success: true,
                data: {
                    order_id: 'ORD-123',
                    status: 'processing',
                    payment_status: 'paid'
                }
            }
        });

        Affiliate.calcDiscount.mockResolvedValueOnce(5000);
        Affiliate.recordCommission.mockResolvedValueOnce({ commission_amount: 1000 });

        client.query
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined);

        const result = await Order.create({
            variant_id: 'VAR-1',
            quantity: 1,
            buyer_whatsapp: '628123456789'
        }, 55);

        expect(Affiliate.calcDiscount).toHaveBeenCalledWith(20000);
        expect(Affiliate.recordCommission).toHaveBeenCalledWith(202, 55, 'ORD-123', 20000, client);
        expect(client.query).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining('INSERT INTO orders'),
            ['ORD-123', 55, 'VAR-1', 1, 10000, 15000, 5000, 4000, 'processing', 'paid', null, '628123456789']
        );
        expect(result).toMatchObject({
            order_id: 'ORD-123',
            sell_total: 20000,
            our_total: 15000,
            charge_total: 15000,
            discount_amount: 5000,
            commission_amount: 1000,
            profit: 4000
        });
    });

    test('falls back to legacy insert when discount_amount column is not available yet', async () => {
        db.query
            .mockResolvedValueOnce([[{ original_price: 10000, sell_price: 20000 }], []])
            .mockResolvedValueOnce([[{ balance: 50000, referred_by: 202 }], []]);

        axios.post.mockResolvedValueOnce({
            data: {
                success: true,
                data: {
                    order_id: 'ORD-LEGACY',
                    status: 'processing',
                    payment_status: 'paid'
                }
            }
        });

        Affiliate.calcDiscount.mockResolvedValueOnce(5000);
        Affiliate.recordCommission.mockResolvedValueOnce({ commission_amount: 1000 });

        const missingColumnError = new Error('column "discount_amount" of relation "orders" does not exist');
        missingColumnError.code = '42703';

        client.query
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockRejectedValueOnce(missingColumnError)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined);

        const result = await Order.create({
            variant_id: 'VAR-LEGACY',
            quantity: 1,
            buyer_whatsapp: '628123456789'
        }, 88);

        expect(client.query).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining('discount_amount'),
            ['ORD-LEGACY', 88, 'VAR-LEGACY', 1, 10000, 15000, 5000, 4000, 'processing', 'paid', null, '628123456789']
        );
        expect(client.query).toHaveBeenNthCalledWith(
            4,
            expect.not.stringContaining('discount_amount'),
            ['ORD-LEGACY', 88, 'VAR-LEGACY', 1, 10000, 15000, 4000, 'processing', 'paid', null, '628123456789']
        );
        expect(result).toMatchObject({
            order_id: 'ORD-LEGACY',
            our_total: 15000,
            charge_total: 15000,
            discount_amount: 5000
        });
    });
});
