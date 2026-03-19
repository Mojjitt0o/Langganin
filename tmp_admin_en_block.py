from pathlib import Path

path = Path('public/js/translations.js')
text = path.read_text(encoding='utf-8')
marker = "  adm_wd_stat_fee: '📊 Total Admin Fee',\n  adm_users: 'ðŸ‘¥ Manage Users',"
if marker not in text:
    raise SystemExit('English admin marker missing')
insert = "  adm_wd_stat_fee: '📊 Total Admin Fee',\n  adm_wd_settings_title: 'Withdrawal Fee Settings',\n  adm_wd_settings_desc: 'Set the admin percentage deducted from each withdrawal.',\n  adm_wd_fee_label: 'Admin Fee (%)',\n  adm_wd_settings_save: 'Save Fee',\n  adm_wd_settings_saved: 'Withdrawal fee updated',\n  adm_wd_settings_save_fail: 'Failed to save withdrawal fee',\n  adm_wd_settings_hint: 'Negative values are not allowed.',\n  adm_users: 'ðŸ‘¥ Manage Users',"
text = text.replace(marker, insert, 1)
path.write_text(text, encoding='utf-8')
