process.env.NODE_ENV = 'test';

jest.mock('../config/database', () => ({
    query: jest.fn(),
    pool: {}
}));

const db = require('../config/database');
const Affiliate = require('../models/Affiliate');

describe('Affiliate model referral commission flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('findByCode normalizes case and whitespace before querying', async () => {
        db.query.mockResolvedValueOnce([[{ id: 7, username: 'user-b', affiliate_code: 'USERB-AB12CD' }], []]);

        const result = await Affiliate.findByCode('  userb-ab12cd  ');

        expect(db.query).toHaveBeenCalledWith(
            'SELECT id, username, affiliate_code FROM users WHERE affiliate_code = $1',
            ['USERB-AB12CD']
        );
        expect(result).toEqual({ id: 7, username: 'user-b', affiliate_code: 'USERB-AB12CD' });
    });

    test('recordCommission credits the referrer through the provided transaction executor', async () => {
        const tx = {
            query: jest.fn()
                .mockResolvedValueOnce({ rows: [{ commission_amount: 2500 }], fields: [] })
                .mockResolvedValueOnce({ rows: [], fields: [] })
        };
        const getSettingsSpy = jest.spyOn(Affiliate, 'getSettings').mockResolvedValue({
            is_active: true,
            commission_type: 'percentage',
            commission_value: 5
        });

        const result = await Affiliate.recordCommission(202, 101, 'ORD-123', 50000, tx);

        expect(getSettingsSpy).toHaveBeenCalledWith(tx);
        expect(tx.query).toHaveBeenNthCalledWith(
            1,
            `INSERT INTO affiliate_commissions (affiliate_user_id, referred_user_id, order_id, order_amount, commission_amount, status)
             VALUES ($1, $2, $3, $4, $5, 'approved') RETURNING *`,
            [202, 101, 'ORD-123', 50000, 2500]
        );
        expect(tx.query).toHaveBeenNthCalledWith(
            2,
            'UPDATE users SET affiliate_balance = affiliate_balance + $1 WHERE id = $2',
            [2500, 202]
        );
        expect(result).toEqual({ commission_amount: 2500 });
        expect(db.query).not.toHaveBeenCalled();
    });

    test('recordCommission ignores self-referral commission attempts', async () => {
        const tx = { query: jest.fn() };

        const result = await Affiliate.recordCommission(101, 101, 'ORD-SELF', 50000, tx);

        expect(result).toBeNull();
        expect(tx.query).not.toHaveBeenCalled();
    });
});
