/**
 * Tests: config/database.js query wrapper
 * Covers: ? → $N placeholder conversion, query returns [rows, fields]
 */
process.env.NODE_ENV = 'test';

// Mock the pg Pool so no real DB is needed
jest.mock('pg', () => {
    const mockPool = {
        query: jest.fn()
    };
    return { Pool: jest.fn(() => mockPool) };
});

const { Pool } = require('pg');
const mockPool = new Pool();

describe('database query wrapper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('converts ? placeholders to $1, $2, ... for PostgreSQL', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }], fields: [] });

        const db = require('../config/database');
        await db.query('SELECT * FROM users WHERE id = ? AND active = ?', [42, true]);

        expect(mockPool.query).toHaveBeenCalledWith(
            'SELECT * FROM users WHERE id = $1 AND active = $2',
            [42, true]
        );
    });

    test('returns [rows, fields] tuple', async () => {
        const fakeRows   = [{ id: 1, email: 'a@b.com' }];
        const fakeFields = [{ name: 'id' }, { name: 'email' }];
        mockPool.query.mockResolvedValueOnce({ rows: fakeRows, fields: fakeFields });

        const db = require('../config/database');
        const [rows, fields] = await db.query('SELECT id, email FROM users WHERE id = ?', [1]);

        expect(rows).toEqual(fakeRows);
        expect(fields).toEqual(fakeFields);
    });

    test('passes through queries with no placeholders unchanged', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [], fields: [] });

        const db = require('../config/database');
        await db.query('SELECT 1', []);

        expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', []);
    });

    test('exposes pool for transaction use', () => {
        const db = require('../config/database');
        expect(db.pool).toBeDefined();
        expect(typeof db.pool.query).toBe('function');
    });
});
