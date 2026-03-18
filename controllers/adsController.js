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
      content: ad.content,
      delay: ad.delay_after_announcement,
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil pengaturan iklan.', error: err.message });
  }
}

module.exports = {
  getAdSettings,
};
