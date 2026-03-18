// server.js
const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const session    = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const logger = require('./services/logger');

const authRoutes       = require('./routes/authRoutes');
const productRoutes    = require('./routes/productRoutes');
const orderRoutes      = require('./routes/orderRoutes');
const webhookRoutes    = require('./routes/webhookRoutes');
const topupRoutes      = require('./routes/topupRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const supportRoutes    = require('./routes/supportRoutes');
const affiliateRoutes  = require('./routes/affiliateRoutes');
const logRoutes        = require('./routes/logRoutes');
const authMiddleware   = require('./middleware/auth');
const telegramBot      = require('./services/telegramBot');

const app = express();

// Trust proxy — required for Railway / Heroku (rate-limit real IP detection)
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
// Restrict to own domain in production; allow localhost in development
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.APP_URL].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin(origin, callback) {
        // Allow same-origin requests (no Origin header) and listed origins
        if (!origin || allowedOrigins.some(o => o === origin || origin.startsWith(o.replace(/\/$/, '')))) return callback(null, true);
        callback(null, false); // deny without triggering error handler
    },
    credentials: true // required for cookie-based auth
}));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Webhook: Capture raw body BEFORE parsing for signature verification ───────
app.use('/api/webhook', express.raw({ type: 'application/json' }));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(logger.httpMiddleware);

// ── Rate limiting — general API (100 req / 15 min) ────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    validate: { xForwardedForHeader: false }
});
app.use('/api/', apiLimiter);

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET is not set'); })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure:   process.env.NODE_ENV === 'production',
        maxAge:   24 * 60 * 60 * 1000,
        sameSite: 'lax',
        httpOnly: true
    }
}));

// ── View engine ───────────────────────────────────────────────────────────────
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/webhook',    webhookRoutes);
app.use('/api/topup',      topupRoutes);
app.use('/api/withdrawal', withdrawalRoutes);
app.use('/api/support',    supportRoutes);
app.use('/api/affiliate',  affiliateRoutes);
app.use('/api/logs',       logRoutes);

// ── Test Webhook Endpoint (for development/testing) ───────────────────────────
app.post('/api/test-webhook', express.json(), async (req, res) => {
    try {
        const { order_id, status, account_details } = req.body;
        
        if (!order_id || !status) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Create payload
        const payload = JSON.stringify({
            event: 'order_completed',
            data: {
                order_id,
                status,
                account_details: account_details || {}
            }
        });
        
        // Generate signature
        const crypto = require('crypto');
        const signature = crypto.createHmac('sha256', process.env.WR_API_KEY)
            .update(payload)
            .digest('hex');
        
        logger.info(`📧 Test webhook: ${order_id}, sig=${signature.substring(0, 20)}...`);
        
        // Forward to webhook handler with signature
        const forwardReq = require('https').request({
            hostname: 'www.langganin.my.id',
            path: '/api/webhook/warung-rebahan',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'x-premiy-signature': signature
            }
        }, (webhookRes) => {
            let data = '';
            webhookRes.on('data', chunk => data += chunk);
            webhookRes.on('end', () => {
                try {
                    res.json({
                        success: true,
                        message: 'Test webhook sent',
                        webhook_status: webhookRes.statusCode,
                        webhook_response: JSON.parse(data)
                    });
                } catch (e) {
                    res.json({
                        success: true,
                        message: 'Test webhook sent',
                        webhook_status: webhookRes.statusCode,
                        webhook_response: data
                    });
                }
            });
        });
        
        forwardReq.on('error', (e) => {
            logger.error('Test webhook forward error:', e.message);
            res.status(500).json({ success: false, message: 'Failed to forward webhook', error: e.message });
        });
        
        forwardReq.write(payload);
        forwardReq.end();
        
    } catch (error) {
        logger.error('Test webhook error:', error.message);
        res.status(500).json({ success: false, message: 'Test webhook error', error: error.message });
    }
});

// Expose Telegram bot link
app.get('/api/bot-info', (req, res) => {
    const username = process.env.TELEGRAM_BOT_USERNAME || '';
    res.json({ bot_url: username ? `https://t.me/${username}` : null });
});

// Health check — verifies DB connectivity
app.get('/api/health', async (req, res) => {
    try {
        const db = require('./config/database');
        await db.query('SELECT 1', []);
        res.json({
            success:   true,
            message:   'Server is running',
            database:  'connected',
            timestamp: new Date().toISOString(),
            uptime:    process.uptime()
        });
    } catch (dbErr) {
        logger.error('Health check DB error: ' + dbErr.message);
        res.status(503).json({
            success:   false,
            message:   'Database unavailable',
            timestamp: new Date().toISOString()
        });
    }
});

// ── Telegram webhook endpoint (used when TELEGRAM_USE_WEBHOOK=true) ───────────
app.post('/api/telegram/webhook', express.json(), (req, res) => {
    telegramBot.handleWebhookUpdate(req.body);
    res.sendStatus(200);
});

// ── Page routes ───────────────────────────────────────────────────────────────
app.get('/',              (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login',         (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register',      (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/products',      (req, res) => res.sendFile(path.join(__dirname, 'views', 'products.html')));
app.get('/orders',        (req, res) => res.sendFile(path.join(__dirname, 'views', 'orders.html')));
app.get('/balance',       (req, res) => res.sendFile(path.join(__dirname, 'views', 'balance.html')));
app.get('/affiliate',     (req, res) => res.sendFile(path.join(__dirname, 'views', 'affiliate.html')));
app.get('/invoice',       (req, res) => res.sendFile(path.join(__dirname, 'views', 'invoice.html')));
app.get('/reset-password',(req, res) => res.sendFile(path.join(__dirname, 'views', 'reset-password.html')));

// Admin page — server-side auth check (must be admin)
app.get('/admin', authMiddleware.requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    logger.error(err.stack || err.message);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server.'
    });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    const useWebhook = process.env.TELEGRAM_USE_WEBHOOK === 'true';

    if (useWebhook && process.env.APP_URL) {
        await telegramBot.setWebhook(`${process.env.APP_URL}/api/telegram/webhook`);
    } else {
        telegramBot.startPolling();
    }

    logger.info(`\n🚀 ========================================`);
    logger.info(`   Warung Rebahan Shop — PORT ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📦 Database: ${process.env.DB_NAME}`);
    logger.info(`🤖 Telegram mode: ${useWebhook ? 'webhook' : 'polling'}`);
    logger.info(`========================================`);
});
