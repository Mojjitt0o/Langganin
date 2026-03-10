// services/telegramBot.js
const axios = require('axios');
const crypto = require('crypto');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory mapping: admin's forwarded message_id -> user's chat_id
const messageMap = new Map();

// Reset password: chatId → 'awaiting_email'
const resetPendingMap = new Map();
// Reset password: userId (DB) → chatId (for success callback)
const userResetChatMap = new Map();

let pollingActive = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send a text message to a specific Telegram chat
async function sendMessage(chatId, text, options = {}) {
  try {
    const res = await axios.post(`${API_BASE}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    });
    return res.data;
  } catch (err) {
    console.error('[TelegramBot] sendMessage error:', err.response?.data || err.message);
    return null;
  }
}

// Send support ticket from website form to admin
async function sendSupportTicket({ name, email, subject, message, whatsapp }) {
  const text =
    `📩 <b>Pesan Support Baru</b>\n\n` +
    `👤 <b>Nama:</b> ${escapeHtml(name)}\n` +
    `📧 <b>Email:</b> ${escapeHtml(email)}\n` +
    (whatsapp ? `📱 <b>WhatsApp:</b> ${escapeHtml(whatsapp)}\n` : '') +
    `📋 <b>Subjek:</b> ${escapeHtml(subject)}\n\n` +
    `💬 <b>Pesan:</b>\n${escapeHtml(message)}`;

  return sendMessage(ADMIN_CHAT_ID, text);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Handle incoming update from Telegram
async function handleUpdate(update) {
  if (!update.message) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // /start command
  if (text === '/start') {
    await sendMessage(chatId, 
      `👋 Halo! Selamat datang di <b>Langganin Support</b>.\n\n` +
      `Silakan ketik pesan kamu di sini, dan tim kami akan membalas secepatnya.\n\n` +
      `💡 <i>Tulis pertanyaan atau kendalamu, lalu kirim.</i>\n\n` +
      `🔐 Lupa password? Ketik /lupapassword`
    );
    return;
  }

  // /lupapassword command — initiate password reset flow
  if (text === '/lupapassword') {
    resetPendingMap.set(chatId, 'awaiting_email');
    await sendMessage(chatId,
      `🔐 <b>Reset Password Langganin</b>\n\n` +
      `Silakan ketik <b>email</b> akun Langganin kamu:\n\n` +
      `<i>Ketik /batal untuk membatalkan.</i>`
    );
    return;
  }

  // /batal — cancel pending flow
  if (text === '/batal') {
    if (resetPendingMap.has(chatId)) {
      resetPendingMap.delete(chatId);
      await sendMessage(chatId, '✅ Dibatalkan. Ketik /start untuk mulai lagi.');
    }
    return;
  }

  // Handle awaiting_email state for password reset
  if (resetPendingMap.get(chatId) === 'awaiting_email') {
    resetPendingMap.delete(chatId);
    const email = text.trim().toLowerCase();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sendMessage(chatId, '❌ Format email tidak valid. Ketik /lupapassword untuk coba lagi.');
      return;
    }

    try {
      const db = require('../config/database');
      const [users] = await db.query(
        'SELECT id, username, email FROM users WHERE email = $1',
        [email]
      );

      if (!users || users.length === 0) {
        await sendMessage(chatId,
          `❌ Email <b>${escapeHtml(email)}</b> tidak terdaftar di Langganin.\n\n` +
          `Pastikan email yang kamu masukkan benar, lalu ketik /lupapassword untuk coba lagi.`
        );
        return;
      }

      const user = users[0];

      // Delete old unused tokens
      await db.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used = FALSE',
        [user.id]
      );

      // Create new token (1 hour)
      const token = crypto.randomBytes(48).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );

      // Store userId → chatId for success callback
      userResetChatMap.set(user.id, chatId);

      const appUrl = process.env.APP_URL || 'https://www.langganin.my.id';
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      await sendMessage(chatId,
        `✅ <b>Link Reset Password Ditemukan!</b>\n\n` +
        `Halo <b>${escapeHtml(user.username)}</b>! Klik link di bawah untuk membuat password baru:\n\n` +
        `🔗 <a href="${resetLink}">${resetLink}</a>\n\n` +
        `⏰ Link berlaku selama <b>1 jam</b>.\n` +
        `⚠️ Jika kamu tidak meminta ini, abaikan pesan ini.`
      );
    } catch (err) {
      console.error('[TelegramBot] /lupapassword DB error:', err.message);
      await sendMessage(chatId, '❌ Terjadi kesalahan server. Silakan coba lagi nanti.');
    }
    return;
  }

  // Check if this is admin replying to a forwarded message
  if (String(chatId) === String(ADMIN_CHAT_ID) && msg.reply_to_message) {
    const repliedMsgId = msg.reply_to_message.message_id;
    const userChatId = messageMap.get(repliedMsgId);
    if (userChatId) {
      await sendMessage(userChatId, 
        `💬 <b>Balasan dari Tim Support:</b>\n\n${escapeHtml(text)}`
      );
      return;
    }
  }

  // If message is from admin but not a reply, ignore
  if (String(chatId) === String(ADMIN_CHAT_ID)) return;

  // Regular user message → forward to admin
  const userName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
  const userHandle = msg.from.username ? `@${msg.from.username}` : 'No username';

  const forwardText =
    `💬 <b>Pesan dari User</b>\n\n` +
    `👤 <b>Nama:</b> ${escapeHtml(userName)}\n` +
    `🆔 <b>Username:</b> ${escapeHtml(userHandle)}\n` +
    `🔢 <b>Chat ID:</b> <code>${chatId}</code>\n\n` +
    `💬 <b>Pesan:</b>\n${escapeHtml(text)}\n\n` +
    `<i>↩️ Reply pesan ini untuk membalas user.</i>`;

  const result = await sendMessage(ADMIN_CHAT_ID, forwardText);

  // Store mapping so admin can reply
  if (result && result.result) {
    messageMap.set(result.result.message_id, chatId);
  }
}

// Long polling loop
async function startPolling() {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.log('[TelegramBot] ⚠️  TELEGRAM_BOT_TOKEN atau TELEGRAM_ADMIN_CHAT_ID belum diset. Bot tidak aktif.');
    return;
  }

  // Delete any existing webhook so polling works without 409 conflict
  try {
    await axios.post(`${API_BASE}/deleteWebhook`, { drop_pending_updates: false });
    console.log('[TelegramBot] ✅ Webhook cleared, switching to polling mode.');
  } catch (err) {
    console.error('[TelegramBot] deleteWebhook warning:', err.message);
  }

  pollingActive = true;
  let offset = 0;
  let conflictRetries = 0;
  console.log('[TelegramBot] 🤖 Bot support aktif dengan long polling...');

  while (pollingActive) {
    try {
      const res = await axios.get(`${API_BASE}/getUpdates`, {
        params: { offset, timeout: 30, allowed_updates: ['message'] },
        timeout: 35000
      });

      conflictRetries = 0; // reset on success

      if (res.data && res.data.ok && res.data.result.length > 0) {
        for (const update of res.data.result) {
          offset = update.update_id + 1;
          try {
            await handleUpdate(update);
          } catch (handleErr) {
            console.error('[TelegramBot] handleUpdate error:', handleErr.message);
          }
        }
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') continue;

      // 409 = another instance is polling this bot token
      if (err.response && err.response.status === 409) {
        conflictRetries++;
        const backoff = Math.min(conflictRetries * 10, 60) * 1000;
        if (conflictRetries <= 3) {
          console.error(`[TelegramBot] 409 Conflict — instance lain sedang polling bot ini. Retry ${conflictRetries} in ${backoff / 1000}s...`);
        }
        // Try clearing webhook again on first conflict
        if (conflictRetries === 1) {
          try { await axios.post(`${API_BASE}/deleteWebhook`); } catch (_) {}
        }
        await sleep(backoff);
        continue;
      }

      console.error('[TelegramBot] Polling error:', err.message);
      await sleep(5000);
    }
  }
}

function stopPolling() {
  pollingActive = false;
}

function getBotUsername() {
  return BOT_USERNAME;
}

// Called by authController after successful password reset
async function notifyPasswordResetSuccess(userId, username) {
  // Send success message to user if they used the bot flow
  const chatId = userResetChatMap.get(userId);
  if (chatId) {
    userResetChatMap.delete(userId);
    await sendMessage(chatId,
      `🎉 <b>Password Berhasil Direset!</b>\n\n` +
      `Halo <b>${escapeHtml(username)}</b>! Password akun Langganin kamu berhasil diperbarui.\n\n` +
      `🔐 Silakan login dengan password baru kamu.\n` +
      `🌐 <a href="${process.env.APP_URL || 'https://www.langganin.my.id'}/login">Login sekarang →</a>`
    );
  }
  // Always log to admin
  await sendMessage(ADMIN_CHAT_ID,
    `🔐 <b>Info Reset Password:</b> User <b>${escapeHtml(username)}</b> berhasil mereset password.`
  );
}

module.exports = {
  sendMessage,
  sendSupportTicket,
  notifyPasswordResetSuccess,
  startPolling,
  stopPolling,
  getBotUsername
};
