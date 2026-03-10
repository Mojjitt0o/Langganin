// models/Profit.js
const db = require('../config/database');

class Profit {
    static async getTotalProfit(userId) {
        const [rows] = await db.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM profits WHERE user_id = ?',
            [userId]
        );
        return rows[0].total || 0;
    }

    static async getProfitHistory(userId) {
        const [rows] = await db.query(`
            SELECT p.*, o.order_id, o.our_total, o.original_total
            FROM profits p
            JOIN orders o ON p.order_id = o.order_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        `, [userId]);
        
        return rows;
    }
}

module.exports = Profit;