const AdsSettings = require('../models/AdsSettings');

// Endpoint untuk mengambil iklan aktif
async function getAdSettings(req, res) {
  try {
    const ad = await AdsSettings.getActiveAd();
    if (!ad) {
      return res.status(404).json({ message: 'Tidak ada iklan aktif.' });
    }
    res.json({
      title: ad.title,
      delay: ad.delay_after_announcement,
      youtube_url: ad.youtube_url,
      partnership_text: ad.partnership_text,
      partnership_color: ad.partnership_color,
      content_html: ad.content_html,
      promo_link: ad.promo_link
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil pengaturan iklan.', error: err.message });
  }
}

module.exports = {
  getAdSettings,
};
