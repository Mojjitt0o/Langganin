from pathlib import Path

path = Path('views/balance.html')
text = path.read_text(encoding='utf-8')
old_processing = "      processing: { icon: 'â³', cls: 'status-processing', badge: 'badge-info',    label: t('status_processing') },\n      pending:    { icon: 'ðŸ•', cls: 'status-pending',    badge: 'badge-warning', label: t('status_pending') },"
new_processing = "      processing: { icon: 'â³', cls: 'status-processing', badge: 'badge-info',    label: t('status_processing') },\n      approved:   { icon: 'â³', cls: 'status-processing', badge: 'badge-info',    label: t('status_processing') },\n      done:       { icon: 'âœ…', cls: 'status-completed',  badge: 'badge-success', label: t('status_done') },\n      pending:    { icon: 'ðŸ•', cls: 'status-pending',    badge: 'badge-warning', label: t('status_pending') },"
old_failed = "      failed:     { icon: 'âŒ', cls: 'status-failed',     badge: 'badge-danger',  label: t('status_failed') },\n      expired:    { icon: 'âŒ›', cls: 'status-failed',     badge: 'badge-muted',   label: t('bal_status_expired') },"
new_failed = "      failed:     { icon: 'âŒ', cls: 'status-failed',     badge: 'badge-danger',  label: t('status_failed') },\n      rejected:   { icon: 'âŒ', cls: 'status-failed',     badge: 'badge-danger',  label: t('status_failed') },\n      expired:    { icon: 'âŒ›', cls: 'status-failed',     badge: 'badge-muted',   label: t('bal_status_expired') },"

if old_processing not in text or old_failed not in text:
    raise SystemExit('status map markers missing')
text = text.replace(old_processing, new_processing, 1)
text = text.replace(old_failed, new_failed, 1)
path.write_text(text, encoding='utf-8')
