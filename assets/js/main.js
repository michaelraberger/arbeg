/* AR Bürgerenergiegemeinschaft Wels – ohne Abhängigkeiten */
(function () {
  'use strict';

  // --- Mobile Navigation ---
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');

  function setMenu(open) {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  // --- Einblenden beim Scrollen ---
  var reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // --- Aktiven Abschnitt in der Navigation markieren ---
  var navAnchors = links ? links.querySelectorAll('a[href^="#"]:not(.btn)') : [];
  if (navAnchors.length && 'IntersectionObserver' in window) {
    var byId = {};
    navAnchors.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) { a.removeAttribute('aria-current'); });
        var current = byId[entry.target.id];
        if (current) current.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (section) {
      spy.observe(section);
    });
  }

  // --- Anmeldeformular (Zwei-Klick-Lösung) ---
  // Die Formular-URL wird im HTML über data-form-url am Element .form-card gesetzt.
  // Der iframe wird erst nach Klick geladen: keine Datenübertragung an den
  // Formular-Anbieter ohne Zustimmung und kein Ballast beim Seitenaufbau.
  var formCard = document.querySelector('.form-card[data-form-url]');
  if (formCard) {
    var url = (formCard.getAttribute('data-form-url') || '').trim();
    var emptyState = formCard.querySelector('[data-form-empty]');
    var consentState = formCard.querySelector('[data-form-consent]');
    var loadButton = formCard.querySelector('[data-form-load]');

    if (/^https:\/\//.test(url) && consentState && loadButton) {
      emptyState.hidden = true;
      consentState.hidden = false;
      loadButton.addEventListener('click', function () {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.title = 'Anmeldeformular';
        iframe.loading = 'lazy';
        iframe.style.height = (parseInt(formCard.getAttribute('data-form-height'), 10) || 640) + 'px';
        consentState.replaceWith(iframe);
        iframe.focus();
      });
    }
  }
})();
