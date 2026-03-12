/**
 * Tests: announcements and frontend auth logic (unit-level)
 * Covers: user_data localStorage key used in all views (grep-level assertion)
 *         and absence of old token-based auth patterns
 */
const fs   = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, '..', 'views');

function readView(name) {
    return fs.readFileSync(path.join(VIEWS_DIR, name), 'utf8');
}

const VIEWS_WITH_JS = [
    'index.html',
    'products.html',
    'orders.html',
    'balance.html',
    'affiliate.html',
    'invoice.html',
    'login.html',
    'register.html',
    'admin.html',
];

describe('Frontend views — auth migration to httpOnly cookie', () => {
    test.each(VIEWS_WITH_JS)('%s: no Authorization Bearer header in fetch calls', (view) => {
        const content = readView(view);
        // Extract script content only (ignore HTML comments)
        const scriptParts = [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
            .map(m => m[1]).join('\n');
        expect(scriptParts).not.toMatch(/Authorization.*Bearer/);
    });

    test.each(VIEWS_WITH_JS)('%s: no getItem("token") for auth check', (view) => {
        const content = readView(view);
        const scriptParts = [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
            .map(m => m[1]).join('\n');
        // The old pattern was: localStorage.getItem('token')
        expect(scriptParts).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    });

    test.each(VIEWS_WITH_JS)('%s: no setItem("token") after login', (view) => {
        const content = readView(view);
        const scriptParts = [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
            .map(m => m[1]).join('\n');
        expect(scriptParts).not.toMatch(/localStorage\.setItem\(['"]token['"]/);
    });
});

describe('Frontend views — login page specifics', () => {
    const login = readView('login.html');

    test('login page uses credentials: include on fetch', () => {
        expect(login).toContain("credentials: 'include'");
    });

    test('login page stores user_data in localStorage on success', () => {
        expect(login).toContain("'user_data'");
    });

    test('login page redirects if user_data exists (already logged in)', () => {
        expect(login).toContain("getItem('user_data')");
    });
});

describe('Frontend views — announcement modal (index.html)', () => {
    const index = readView('index.html');

    test('announcement modal HTML exists', () => {
        expect(index).toContain('id="annModal"');
    });

    test('announcement modal has Telegram link to @langganin_support_bot', () => {
        expect(index).toContain('t.me/langganin_support_bot');
    });

    test('announcement modal uses localStorage for once-per-day dismiss', () => {
        expect(index).toContain('ann_dismissed_date');
    });
});
