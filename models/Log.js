// models/Log.js
const db = require('../config/database');

class Log {
    /**
     * Create a log entry.
     * @param {string} type - Short type string (e.g. 'Order Error', 'WR API Error').
     * @param {string} message - Human readable message.
     * @param {object} [meta] - Optional JSON metadata.
     */
    static async create(type, message, meta = null) {
        const [rows] = await db.query(
            `INSERT INTO system_logs (type, message, meta) VALUES ($1, $2, $3) RETURNING *`,
            [type, message, meta ? JSON.stringify(meta) : null]
        );
        return rows[0];
    }

    static async getRecent(limit = 100) {
        const [rows] = await db.query(
            `SELECT id, created_at, type, message, meta FROM system_logs ORDER BY created_at DESC LIMIT $1`,
            [limit]
        );
        return rows;
    }
}

module.exports = Log;
