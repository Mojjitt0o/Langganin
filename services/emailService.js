// services/emailService.js
const logger = require('./logger');

// Initialize transporter - uses mock if no real email service configured
let transporter;

try {
    const nodemailer = require('nodemailer');
    
    // Check if real email service is configured
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        logger.info('[Email] Using Gmail for email notifications');
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        logger.info('[Email] Using SMTP for email notifications');
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        logger.info('[Email] No email credentials in .env, using mock transporter');
        transporter = null;
    }
} catch (err) {
    logger.warn('[Email] Cannot initialize real email:', err.message);
    transporter = null;
}

// Mock transporter for development/testing
const mockTransporter = {
    sendMail: async (mailOptions) => {
        logger.info(`[Email 📧] LOGGED (configure GMAIL_USER/GMAIL_APP_PASSWORD in .env to send real emails)`);
        logger.info(`  To: ${mailOptions.to}`);
        logger.info(`  Subject: ${mailOptions.subject}`);
        return { messageId: `mock-${Date.now()}` };
    }
};

// Use real transporter if available, otherwise use mock
if (!transporter) {
    transporter = mockTransporter;
}

const emailService = {
    // Send account credentials to user
    async sendAccountDetailsToUser(userEmail, userName, orderId, productName, accountDetails) {
        try {
            if (!userEmail) {
                logger.warn(`[Email] No email address for order ${orderId}, skipping notification`);
                return false;
            }

            // Format account details for display
            const formattedDetails = emailService.formatAccountDetails(accountDetails);

            const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea; }
        .credentials { background: white; padding: 15px; margin: 10px 0; border-radius: 3px; border: 1px solid #ddd; }
        .credential-item { margin: 10px 0; font-size: 14px; }
        .label { font-weight: bold; color: #667eea; }
        .value { background: #f0f0f0; padding: 8px; margin-top: 5px; border-radius: 3px; word-break: break-all; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 3px; margin: 10px 0; color: #856404; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Akun Anda Siap Digunakan!</h1>
        </div>

        <p>Halo <strong>${userName || 'Pelanggan Setia'}</strong>,</p>

        <p>Terima kasih telah berbelanja di Langganin! Pesanan Anda <strong>${orderId}</strong> sudah diproses dan akun Anda telah disiapkan.</p>

        <div class="content">
            <h3>📦 Detail Produk</h3>
            <p><strong>Produk:</strong> ${productName}</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
        </div>

        <div class="content">
            <h3>🔑 Data Login Akun Anda</h3>
            ${formattedDetails}
        </div>

        <div class="warning">
            <strong>⚠️ Penting:</strong>
            <ul style="margin: 10px 0;">
                <li>Jangan bagikan data login ini kepada siapa pun</li>
                <li>Simpan data ini dengan aman</li>
                <li>Ganti password Anda setelah login pertama kali</li>
                <li>Jika ada masalah, hubungi customer support kami</li>
            </ul>
        </div>

        <p style="margin-top: 20px;">Jika Anda memiliki pertanyaan atau membutuhkan bantuan, silakan hubungi tim support kami melalui WhatsApp atau email.</p>

        <div class="footer">
            <p>Langganin - Platform Jual Beli Digital Terpercaya</p>
            <p>Email: support@langganin.id | WhatsApp: +62 XXX-XXXX-XXXX</p>
            <p style="color: #999;">Email ini dikirim otomatis. Jangan balas email ini.</p>
        </div>
    </div>
</body>
</html>
            `;

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Langganin <noreply@langganin.id>',
                to: userEmail,
                subject: `🎉 Akun Anda Siap! (Order: ${orderId})`,
                html: htmlContent
            };

            const result = await transporter.sendMail(mailOptions);
            logger.info(`[Email ✅] Account details sent to ${userEmail} for order ${orderId}`);

            return true;
        } catch (error) {
            logger.error(`[Email ❌] Failed to send credentials to ${userEmail} for order ${orderId}: ${error.message}`);
            return false;
        }
    },

    // Format account details into HTML credentials display
    formatAccountDetails(accountDetails) {
        if (!accountDetails) {
            return '<p style="color: red;">Data akun tidak tersedia</p>';
        }

        let html = '';

        // Handle array format (dari WR API)
        if (Array.isArray(accountDetails)) {
            accountDetails.forEach(item => {
                if (item.product) {
                    html += `<p><strong>Produk:</strong> ${item.product}</p>`;
                }
                if (item.details && Array.isArray(item.details)) {
                    item.details.forEach(detail => {
                        html += `<div class="credentials">`;
                        if (detail.title) {
                            html += `<p style="font-weight: bold; color: #667eea;">${detail.title}</p>`;
                        }
                        if (detail.credentials && Array.isArray(detail.credentials)) {
                            detail.credentials.forEach(cred => {
                                if (cred.label && cred.value) {
                                    html += `
                                    <div class="credential-item">
                                        <span class="label">${cred.label}:</span>
                                        <div class="value">${cred.value}</div>
                                    </div>
                                    `;
                                }
                            });
                        }
                        html += `</div>`;
                    });
                }
            });
        }
        // Handle object format
        else if (typeof accountDetails === 'object') {
            html += `<div class="credentials">`;
            for (const [key, value] of Object.entries(accountDetails)) {
                if (key !== 'Produk') { // Skip produk, already shown above
                    html += `
                    <div class="credential-item">
                        <span class="label">${key}:</span>
                        <div class="value">${value}</div>
                    </div>
                    `;
                }
            }
            html += `</div>`;
        }

        return html || '<p style="color: red;">Format data tidak valid</p>';
    }
};

module.exports = emailService;
