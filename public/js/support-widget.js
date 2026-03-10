// public/js/support-widget.js
// Self-contained support widget — injects its own HTML + CSS
(function () {
  'use strict';

  // Don't load on admin page
  if (window.location.pathname.startsWith('/admin')) return;

  // ── CSS ────────────────────────────────────────────────────
  const css = `
    #support-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10050;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(59,130,246,.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s, box-shadow .2s;
      font-size: 26px;
      line-height: 1;
    }
    #support-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(59,130,246,.55);
    }
    #support-fab .fab-close { display: none; }
    #support-fab.open .fab-icon { display: none; }
    #support-fab.open .fab-close { display: inline; }

    /* overlay */
    #support-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.35);
      z-index: 10040;
      backdrop-filter: blur(2px);
    }
    #support-overlay.show { display: block; }

    /* popup */
    #support-popup {
      display: none;
      position: fixed;
      bottom: 92px;
      right: 24px;
      z-index: 10060;
      width: 370px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,.18);
      animation: supportSlideUp .25s ease;
    }
    #support-popup.show { display: flex; flex-direction: column; }

    @keyframes supportSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .sp-header {
      padding: 20px 20px 0;
      text-align: center;
    }
    .sp-header h3 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    .sp-header p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .sp-body {
      padding: 16px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sp-field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 4px;
    }
    .sp-field input,
    .sp-field textarea,
    .sp-field select {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      color: #1e293b;
      background: #f8fafc;
      transition: border-color .15s;
      box-sizing: border-box;
    }
    .sp-field input:focus,
    .sp-field textarea:focus,
    .sp-field select:focus {
      outline: none;
      border-color: #3b82f6;
      background: #fff;
    }
    .sp-field textarea {
      resize: vertical;
      min-height: 80px;
    }

    .sp-submit {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6+0%, #2563eb 100%);
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }
    .sp-submit:hover { opacity: .9; }
    .sp-submit:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    /* success state */
    .sp-success {
      padding: 32px 20px;
      text-align: center;
    }
    .sp-success .sp-check {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .sp-success h4 {
      margin: 0 0 8px;
      font-size: 17px;
      color: #16a34a;
    }
    .sp-success p {
      margin: 0 0 16px;
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
    }
    .sp-tg-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #0088cc;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: opacity .15s;
    }
    .sp-tg-btn:hover { opacity: .9; }

    @media (max-width: 480px) {
      #support-popup {
        right: 8px;
        left: 8px;
        bottom: 88px;
        width: auto;
      }
      #support-fab {
        bottom: 16px;
        right: 16px;
        width: 50px;
        height: 50px;
        font-size: 22px;
      }
    }
  `;

  // ── Inject CSS ─────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── HTML ───────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.id = 'support-widget-root';
  wrapper.innerHTML = `
    <div id="support-overlay"></div>

    <div id="support-popup">
      <div id="sp-form-view">
        <div class="sp-header">
          <img src="/images/logo.png" alt="Langganin" style="height:36px;width:auto;margin-bottom:8px;">
          <h3>Butuh Bantuan?</h3>
          <p>Isi form di bawah, tim kami siap membantu!</p>
        </div>
        <div class="sp-body">
          <div class="sp-field">
            <label for="sp-name">Nama *</label>
            <input id="sp-name" type="text" placeholder="Nama lengkap" maxlength="100" required />
          </div>
          <div class="sp-field">
            <label for="sp-email">Email *</label>
            <input id="sp-email" type="email" placeholder="email@contoh.com" maxlength="100" required />
          </div>
          <div class="sp-field">
            <label for="sp-wa">WhatsApp <small>(opsional)</small></label>
            <input id="sp-wa" type="text" placeholder="08xxxxxxxxxx" maxlength="20" />
          </div>
          <div class="sp-field">
            <label for="sp-subject">Subjek *</label>
            <select id="sp-subject">
              <option value="">— Pilih subjek —</option>
              <option value="Pertanyaan Umum">Pertanyaan Umum</option>
              <option value="Kendala Pembayaran">Kendala Pembayaran</option>
              <option value="Kendala Pesanan">Kendala Pesanan</option>
              <option value="Masalah Akun">Masalah Akun</option>
              <option value="Saran & Masukan">Saran & Masukan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div class="sp-field">
            <label for="sp-message">Pesan *</label>
            <textarea id="sp-message" placeholder="Jelaskan pertanyaan atau kendalamu..." maxlength="1000"></textarea>
          </div>
          <button class="sp-submit" id="sp-send">Kirim Pesan</button>
        </div>
      </div>

      <div id="sp-success-view" class="sp-success" style="display:none;">
        <div class="sp-check">✅</div>
        <h4>Pesan Terkirim!</h4>
        <p>Tim kami akan merespon secepatnya.<br>Kamu juga bisa lanjut chat langsung via Telegram untuk respon lebih cepat.</p>
        <a id="sp-tg-link" class="sp-tg-btn" href="#" target="_blank" rel="noopener noreferrer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.495 7.683l-1.842 8.685c-.14.612-.505.763-.102.475l-2.835-2.09-1.368 1.317c-.152.152-.278.278-.57.278l.204-2.886 5.26-4.753c.228-.204-.05-.317-.354-.113l-6.502 4.095-2.8-.875c-.608-.19-.62-.608.128-.9l10.94-4.215c.506-.19.95.113.784.9z"/></svg>
          Chat via Telegram
        </a>
      </div>
    </div>

    <button id="support-fab" aria-label="Support" title="Butuh bantuan?">
      <span class="fab-icon"><img src="/images/logo.png" alt="Support" style="width:32px;height:32px;object-fit:contain;"></span>
      <span class="fab-close">✕</span>
    </button>
  `;
  document.body.appendChild(wrapper);

  // ── Elements ───────────────────────────────────────────────
  const fab = document.getElementById('support-fab');
  const popup = document.getElementById('support-popup');
  const overlay = document.getElementById('support-overlay');
  const formView = document.getElementById('sp-form-view');
  const successView = document.getElementById('sp-success-view');
  const sendBtn = document.getElementById('sp-send');
  const tgLink = document.getElementById('sp-tg-link');

  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
    fab.classList.toggle('open', isOpen);
    popup.classList.toggle('show', isOpen);
    overlay.classList.toggle('show', isOpen);
  }

  function close() {
    isOpen = false;
    fab.classList.remove('open');
    popup.classList.remove('show');
    overlay.classList.remove('show');
  }

  fab.addEventListener('click', toggle);
  overlay.addEventListener('click', close);

  // ── Fetch bot username (optional pre-fetch) ────────────────
  let botUsername = '';
  fetch('/api/support/bot-info')
    .then(r => r.json())
    .then(d => { if (d.botUsername) botUsername = d.botUsername; })
    .catch(() => {});

  // ── Submit ─────────────────────────────────────────────────
  sendBtn.addEventListener('click', async function () {
    const name = document.getElementById('sp-name').value.trim();
    const email = document.getElementById('sp-email').value.trim();
    const whatsapp = document.getElementById('sp-wa').value.trim();
    const subject = document.getElementById('sp-subject').value;
    const message = document.getElementById('sp-message').value.trim();

    if (!name || !email || !subject || !message) {
      alert('Mohon isi semua field yang wajib (*)');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Mengirim...';

    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, whatsapp, subject, message })
      });
      const data = await res.json();

      if (data.success) {
        // If we got botUsername from response or pre-fetch
        const uname = data.botUsername || botUsername;
        if (uname) {
          tgLink.href = `https://t.me/${uname}`;
        } else {
          tgLink.style.display = 'none';
        }
        formView.style.display = 'none';
        successView.style.display = '';
      } else {
        alert(data.message || 'Gagal mengirim. Coba lagi.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Kirim Pesan';
    }
  });

  // Reset form when closing
  function resetForm() {
    document.getElementById('sp-name').value = '';
    document.getElementById('sp-email').value = '';
    document.getElementById('sp-wa').value = '';
    document.getElementById('sp-subject').value = '';
    document.getElementById('sp-message').value = '';
    formView.style.display = '';
    successView.style.display = 'none';
  }

  // Reset on close via overlay
  overlay.addEventListener('click', resetForm);

  // Also reset when FAB toggles off
  fab.addEventListener('click', function () {
    if (!isOpen) resetForm();
  });
})();
