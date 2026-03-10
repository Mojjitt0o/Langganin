// controllers/supportController.js
const telegramBot = require('../services/telegramBot');

exports.submitTicket = async (req, res) => {
  try {
    const { name, email, subject, message, whatsapp } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, subjek, dan pesan wajib diisi'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid'
      });
    }

    await telegramBot.sendSupportTicket({ name, email, subject, message, whatsapp });

    res.json({
      success: true,
      message: 'Pesan support berhasil dikirim! Tim kami akan segera merespon.',
      botUsername: telegramBot.getBotUsername()
    });
  } catch (error) {
    console.error('Support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim pesan support. Silakan coba lagi.'
    });
  }
};

exports.getBotInfo = async (req, res) => {
  res.json({
    success: true,
    botUsername: telegramBot.getBotUsername()
  });
};
