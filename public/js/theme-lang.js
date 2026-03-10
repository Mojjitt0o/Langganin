// ═══════════════════════════════════════════════════════════════
//  LANGGANIN — Theme & Language Toggle Utility
//  Provides t() function, injects toggle buttons, applies state
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────
  var currentLang  = localStorage.getItem('lang') || 'id';
  var currentTheme = localStorage.getItem('theme') || 'light';

  // Apply theme immediately (also done in head inline script)
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.documentElement.setAttribute('lang', currentLang);

  // ─── Translation function (global) ────────────────────────────
  window.t = function (key, fallback) {
    if (!window._TRANSLATIONS) return fallback || key;
    var dict = window._TRANSLATIONS[currentLang] || window._TRANSLATIONS.id;
    return dict[key] || (window._TRANSLATIONS.id && window._TRANSLATIONS.id[key]) || fallback || key;
  };

  window.getCurrentLang = function () { return currentLang; };
  window.getCurrentTheme = function () { return currentTheme; };

  // ─── Apply translations to DOM ────────────────────────────────
  function applyTranslations() {
    // data-i18n → textContent
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val !== key) el.textContent = val;
    });
    // data-i18n-html → innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var val = t(key);
      if (val !== key) el.innerHTML = val;
    });
    // data-i18n-placeholder → placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = t(key);
      if (val !== key) el.placeholder = val;
    });
    // data-i18n-title → title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var val = t(key);
      if (val !== key) el.title = val;
    });
    // Page title
    var titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      var key = titleEl.getAttribute('data-i18n');
      var val = t(key);
      if (val !== key) document.title = val;
    }
  }
  window.applyTranslations = applyTranslations;

  // ─── Toggle theme ──────────────────────────────────────────────
  function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleIcons();
  }

  // ─── Toggle language ──────────────────────────────────────────
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
    applyTranslations();
    updateToggleIcons();
    // Fire custom event so page scripts can re-render dynamic content
    document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang: lang } }));
  }

  // ─── Update toggle button icons/text ──────────────────────────
  function updateToggleIcons() {
    var themeBtn = document.getElementById('_themeToggle');
    var langBtn  = document.getElementById('_langToggle');
    if (themeBtn) themeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    if (langBtn) {
      langBtn.textContent = currentLang === 'id' ? 'EN' : 'ID';
      langBtn.classList.toggle('active', currentLang === 'en');
    }
  }

  // ─── Inject toggle buttons into navbar ─────────────────────────
  function injectToggles() {
    // Build toggle HTML
    var wrapper = document.createElement('div');
    wrapper.className = 'nav-settings';

    var themeBtn = document.createElement('button');
    themeBtn.id = '_themeToggle';
    themeBtn.className = 'nav-stg-btn';
    themeBtn.type = 'button';
    themeBtn.setAttribute('aria-label', 'Toggle theme');
    themeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', function () {
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    var langBtn = document.createElement('button');
    langBtn.id = '_langToggle';
    langBtn.className = 'nav-stg-btn' + (currentLang === 'en' ? ' active' : '');
    langBtn.type = 'button';
    langBtn.setAttribute('aria-label', 'Toggle language');
    langBtn.textContent = currentLang === 'id' ? 'EN' : 'ID';
    langBtn.addEventListener('click', function () {
      setLang(currentLang === 'id' ? 'en' : 'id');
    });

    wrapper.appendChild(themeBtn);
    wrapper.appendChild(langBtn);

    // Find the right place to insert
    // Regular pages: .navbar-menu exists
    var navMenu = document.querySelector('.navbar-menu');
    if (navMenu) {
      // Insert before the navbar menu (between brand and menu)
      var navbar = document.querySelector('.navbar');
      if (navbar) {
        var toggle = navbar.querySelector('.nav-toggle');
        if (toggle) {
          navbar.insertBefore(wrapper, toggle);
        } else {
          navbar.appendChild(wrapper);
        }
      }
      return;
    }

    // Admin page: .nav-bar with .nav-links
    var adminNav = document.querySelector('.nav-bar');
    if (adminNav) {
      var adminToggle = adminNav.querySelector('.admin-nav-toggle');
      if (adminToggle) {
        adminNav.insertBefore(wrapper, adminToggle);
      } else {
        adminNav.appendChild(wrapper);
      }
      return;
    }

    // Auth pages (login/register): no navbar, inject floating toggle
    var authWrap = document.querySelector('.auth-wrap');
    if (authWrap) {
      wrapper.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:100;';
      document.body.appendChild(wrapper);
    }
  }

  // ─── Init on DOM ready ─────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    injectToggles();
    applyTranslations();
  }
})();
