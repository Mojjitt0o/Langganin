// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const topupRoutes = require('./routes/topupRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const supportRoutes = require('./routes/supportRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const telegramBot = require('./services/telegramBot');

const app = express();

// Trust proxy - Required for Railway, Heroku, and other platforms behind reverse proxy
// This allows express-rate-limit to correctly identify users by their real IP
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    validate: { xForwardedForHeader: false } // Handled by trust proxy setting above
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', limiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/topup', topupRoutes);
app.use('/api/withdrawal', withdrawalRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/affiliate', affiliateRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'products.html'));
});

app.get('/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'orders.html'));
});

app.get('/balance', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'balance.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/affiliate', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'affiliate.html'));
});

app.get('/invoice', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'invoice.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reset-password.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    // Start Telegram support bot (non-blocking)
    telegramBot.startPolling();

    console.log('\n🚀 ========================================');
    console.log('   Warung Rebahan Shop Server Started!');
    console.log('========================================');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Database: ${process.env.DB_NAME}`);
    console.log(`🔑 API Connected: ${process.env.WR_API_URL}`);
    console.log('========================================\n');
    const BASE_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    console.log('📝 Available routes:');
    console.log(`   🏠 Home: ${BASE_URL}`);
    console.log(`   🔐 Login: ${BASE_URL}/login`);
    console.log(`   📝 Register: ${BASE_URL}/register`);
    console.log(`   📦 Products: ${BASE_URL}/products`);
    console.log(`   📋 Orders: ${BASE_URL}/orders`);
    console.log(`   💰 Balance: ${BASE_URL}/balance`);
    console.log(`   ❤️  Health: ${BASE_URL}/api/health`);
    console.log('\n✨ Press Ctrl+C to stop the server\n');
});