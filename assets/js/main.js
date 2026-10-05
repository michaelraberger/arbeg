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

  // --- Beitrittsformular ---
  // Ohne JavaScript wird das Formular normal an beitritt.php gesendet;
  // der Server prüft alle Eingaben noch einmal selbst.
  var form = document.getElementById('beitrittsformular');
  if (form) {
    var alertBox = form.querySelector('[data-form-alert]');
    var submitButton = form.querySelector('button[type="submit"]');
    var submitLabel = submitButton.textContent;

    function compact(value) {
      return value.replace(/[\s.]/g, '').toUpperCase();
    }

    function validIban(value) {
      var iban = compact(value);
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
      var digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, function (c) {
        return String(c.charCodeAt(0) - 55);
      });
      var rest = 0;
      for (var i = 0; i < digits.length; i++) rest = (rest * 10 + Number(digits[i])) % 97;
      return rest === 1;
    }

    function validZaehlpunkt(value) {
      return /^AT[0-9A-Z]{31}$/.test(compact(value));
    }

    function bindCheck(selector, isValid, message) {
      form.querySelectorAll(selector).forEach(function (input) {
        input.addEventListener('input', function () {
          input.setCustomValidity(input.value && !isValid(input.value) ? message : '');
        });
      });
    }
    bindCheck('[data-zaehlpunkt]', validZaehlpunkt, 'Die Zählpunktnummer beginnt mit AT und hat 33 Zeichen.');
    bindCheck('[data-iban]', validIban, 'Bitte prüfe die IBAN – sie ist nicht gültig.');

    // Nur die Felder zeigen, die zur gewählten Teilnahmeart gehören
    function syncTeilnahme() {
      var mode = form.querySelector('input[name="teilnahme"]:checked').value;
      form.querySelectorAll('[data-show-for]').forEach(function (group) {
        var show = mode === 'beides' || mode === group.getAttribute('data-show-for');
        group.hidden = !show;
        group.querySelectorAll('input').forEach(function (input) {
          input.disabled = !show;
          input.required = show && input.hasAttribute('data-required');
        });
      });
    }
    form.querySelectorAll('input[name="teilnahme"]').forEach(function (radio) {
      radio.addEventListener('change', syncTeilnahme);
    });
    syncTeilnahme();

    function showAlert(messages) {
      alertBox.textContent = '';
      alertBox.hidden = !messages;
      if (!messages) return;
      var intro = document.createElement('strong');
      intro.textContent = 'Die Anmeldung konnte nicht gesendet werden.';
      alertBox.appendChild(intro);
      var list = document.createElement('ul');
      messages.forEach(function (message) {
        var item = document.createElement('li');
        item.textContent = message;
        list.appendChild(item);
      });
      alertBox.appendChild(list);
      alertBox.scrollIntoView({ block: 'center' });
    }

    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      showAlert(null);
      var data = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = 'Wird gesendet …';

      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (response) { return response.json(); })
        .then(function (result) {
          if (result.ok) {
            window.location.href = 'danke.html';
            return;
          }
          showAlert(result.errors || ['Bitte versuche es noch einmal.']);
        })
        .catch(function () {
          showAlert(['Bitte versuche es später noch einmal oder schreib uns an info@energie-ooe.at.']);
        })
        .then(function () {
          submitButton.disabled = false;
          submitButton.textContent = submitLabel;
        });
    });
  }
})();
