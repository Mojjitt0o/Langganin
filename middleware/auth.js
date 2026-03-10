// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {
    verifyToken(req, res, next) {
        const token = req.headers['authorization']?.split(' ')[1] || 
                     req.query.token || 
                     req.body.token;

        if (!token) {
            return res.status(403).json({
                success: false,
                message: 'No token provided'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.id;
            req.userEmail = decoded.email;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    },

    checkSession(req, res, next) {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        req.userId = req.session.userId;
        next();
    },

    async isAdmin(req, res, next) {
        try {
            const user = await User.findById(req.userId);
            if (!user || !user.is_admin) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
};

module.exports = authMiddleware;