// models/User.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { username, email, password, whatsapp } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [rows] = await db.query(
            'INSERT INTO users (username, email, password, whatsapp) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, email, hashedPassword, whatsapp || null]
        );
        
        return rows[0].id;
    }

    static async findByEmail(email) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return rows[0];
    }

    static async findByUsername(username) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.query(
            'SELECT id, username, email, balance, is_admin, whatsapp, created_at FROM users WHERE id = $1',
            [id]
        );
        return rows[0];
    }

    static async updateBalance(userId, amount) {
        const [rows] = await db.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING id, balance',
            [amount, userId]
        );
        return rows[0];
    }

    static async setAdmin(userId, isAdmin) {
        const [rows] = await db.query(
            'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, username, email, is_admin',
            [isAdmin, userId]
        );
        return rows[0];
    }

    static async findAll() {
        const [rows] = await db.query(
            'SELECT id, username, email, balance, is_admin, whatsapp, created_at FROM users ORDER BY created_at DESC'
        );
        return rows;
    }

    static async updateWhatsapp(userId, whatsapp) {
        const [rows] = await db.query(
            'UPDATE users SET whatsapp = $1 WHERE id = $2 RETURNING id, username, whatsapp',
            [whatsapp || null, userId]
        );
        return rows[0];
    }
}

module.exports = User;