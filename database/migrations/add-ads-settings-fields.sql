-- Migration: Tambah field untuk modal iklan profesional
ALTER TABLE ads_settings
    ADD COLUMN youtube_url VARCHAR(255),
    ADD COLUMN partnership_text VARCHAR(255),
    ADD COLUMN partnership_color VARCHAR(32),
    ADD COLUMN content_html TEXT,
    ADD COLUMN promo_link VARCHAR(255);
