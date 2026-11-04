/* ==========================================================
   Réservation 100 % statique (aucun serveur, aucun abonnement)
   La demande est composée ici puis envoyée par l'utilisateur lui-même :
   SMS pré-rempli, message Instagram, appel ou fichier agenda (.ics).
   ========================================================== */
(function () {
  'use strict';
  var A = window.ANGIE;
  var form = document.getElementById('booking');
  if (!A || !form) return;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var state = { services: [], date: null, time: null, name: '', phone: '', note: '', design: '' };
  var step = 1;
  var view = null; // mois affiché {y, m}

  var fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  var fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  /* ---------- Outils de date ---------- */
  function parisNow() {
    var p = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var o = {};
    p.forEach(function (x) { o[x.type] = x.value; });
    return { y: +o.year, m: +o.month, d: +o.day, min: (+o.hour % 24) * 60 + (+o.minute) };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function dayIndex(y, m, d) { return new Date(y, m - 1, d).getDay(); }
  function dayNumber(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function human(min) { return Math.floor(min / 60) + 'h' + (min % 60 ? pad(min % 60) : ''); }
  function duration() {
    var total = 0;
    state.services.forEach(function (id) {
      var s = A.services.filter(function (x) { return x.id === id; })[0];
      if (s) total += s.duree;
    });
    return total;
  }
  function durLabel(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h ? h + ' h' : '') + (m ? (h ? ' ' : '') + pad(m) + (h ? '' : ' min') : '');
  }

  /* ---------- Disponibilités ---------- */
  function slotsFor(y, m, d) {
    var h = A.hours[dayIndex(y, m, d)];
    var k = key(y, m, d);
    if (!h || A.closedDates.indexOf(k) > -1) return [];
    var dur = duration() || 60;
    var open = h[0] * 60, close = h[1] * 60, step = A.slotStepMinutes || 30;
    var now = parisNow();
    var isToday = (now.y === y && now.m === m && now.d === d);
    var blocked = (A.blockedSlots[k] || []).map(function (s) { return +s.slice(0, 2) * 60 + +s.slice(3, 5); });
    var out = [];
    for (var t = open; t + dur <= close; t += step) {
      if (isToday && t < now.min + (A.leadMinutes || 0)) continue;
      var clash = blocked.some(function (b) { return b >= t && b < t + dur; });
      if (!clash) out.push(t);
    }
    return out;
  }
  function dayAvailable(y, m, d) {
    var now = parisNow();
    var delta = dayNumber(y, m, d) - dayNumber(now.y, now.m, now.d);
    if (delta < 0 || delta > A.horizonDays) return false;
    return slotsFor(y, m, d).length > 0;
  }

  /* ---------- Étape 1 : prestations ---------- */
  function renderServices() {
    var box = $('#bServices');
    box.innerHTML = '';
    A.services.forEach(function (s) {
      var lab = document.createElement('label');
      lab.className = 'b-svc';
      lab.innerHTML =
        '<input type="checkbox" value="' + s.id + '"' + (state.services.indexOf(s.id) > -1 ? ' checked' : '') + '>' +
        '<span class="tick"><svg class="ico"><use href="#i-check"/></svg></span>' +
        '<span><b>' + s.titre + '</b><small>Durée indicative : ' + durLabel(s.duree) + (s.prix ? ' · ' + (typeof s.prix === 'number' ? s.prix + ' €' : s.prix) : '') + '</small></span>';
      box.appendChild(lab);
    });
    $$('input', box).forEach(function (inp) {
      inp.addEventListener('change', function () {
        var id = inp.value, i = state.services.indexOf(id);
        if (inp.checked && i < 0) state.services.push(id);
        if (!inp.checked && i > -1) state.services.splice(i, 1);
        state.time = null;
        updateTotal();
        syncPickedButtons();
      });
    });
    updateTotal();
  }
  function updateTotal() {
    var t = $('#bTotal');
    if (!state.services.length) { t.textContent = 'Sélectionnez au moins une prestation.'; return; }
    t.textContent = 'Durée estimée : ' + durLabel(duration()) + '. Le tarif vous est confirmé par Angie.';
  }
  function syncPickedButtons() {
    $$('[data-pick]').forEach(function (b) {
      var on = state.services.indexOf(b.getAttribute('data-pick')) > -1;
      b.classList.toggle('is-picked', on);
      var s = b.querySelector('span'); if (s) s.textContent = on ? 'Choisi' : 'Choisir';
    });
  }

  /* ---------- Étape 2 : calendrier + créneaux ---------- */
  function initView() { var n = parisNow(); view = { y: n.y, m: n.m }; }
  function renderCalendar() {
    var grid = $('#calGrid');
    grid.innerHTML = '';
    $('#calLabel').textContent = fmtMonth.format(new Date(Date.UTC(view.y, view.m - 1, 15, 12)));
    var first = (dayIndex(view.y, view.m, 1) + 6) % 7; // lundi = 0
    var days = new Date(view.y, view.m, 0).getDate();
    var now = parisNow();
    for (var i = 0; i < first; i++) grid.appendChild(document.createElement('span'));
    for (var d = 1; d <= days; d++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal-day';
      b.textContent = d;
      var k = key(view.y, view.m, d);
      b.setAttribute('aria-label', fmtLong.format(new Date(view.y, view.m - 1, d)));
      if (!dayAvailable(view.y, view.m, d)) b.disabled = true;
      if (now.y === view.y && now.m === view.m && now.d === d) b.classList.add('is-today');
      if (state.date === k) { b.classList.add('is-sel'); b.setAttribute('aria-pressed', 'true'); }
      b.dataset.k = k;
      grid.appendChild(b);
    }
    var prevOk = (view.y > now.y) || (view.y === now.y && view.m > now.m);
    var last = new Date(Date.UTC(now.y, now.m - 1, now.d + A.horizonDays));
    var nextOk = (view.y < last.getUTCFullYear()) || (view.y === last.getUTCFullYear() && view.m < last.getUTCMonth() + 1);
    $('#calPrev').disabled = !prevOk;
    $('#calNext').disabled = !nextOk;
  }
  function renderSlots() {
    var box = $('#slots');
    if (!state.date) { box.innerHTML = '<p class="b-sub">Choisissez un jour pour voir les horaires.</p>'; return; }
    var p = state.date.split('-').map(Number);
    var slots = slotsFor(p[0], p[1], p[2]);
    if (!slots.length) { box.innerHTML = '<p class="b-sub">Aucun horaire disponible ce jour-là pour cette durée.</p>'; return; }
    var groups = [['Matin', function (t) { return t < 720; }], ['Après-midi', function (t) { return t >= 720 && t < 1080; }], ['Soirée', function (t) { return t >= 1080; }]];
    var html = '<p class="b-sub">' + fmtLong.format(new Date(p[0], p[1] - 1, p[2])) + ' · durée estimée ' + durLabel(duration() || 60) + '</p>';
    groups.forEach(function (g) {
      var list = slots.filter(g[1]);
      if (!list.length) return;
      html += '<div class="slot-group"><h4>' + g[0] + '</h4><div class="slot-row" role="radiogroup" aria-label="' + g[0] + '">' +
        list.map(function (t) {
          var on = state.time === t;
          return '<button type="button" class="slot' + (on ? ' is-sel' : '') + '" role="radio" aria-checked="' + on + '" data-t="' + t + '">' + human(t) + '</button>';
        }).join('') + '</div></div>';
    });
    box.innerHTML = html;
  }

  /* ---------- Message + envois ---------- */
  function servicesText() {
    return state.services.map(function (id) {
      return A.services.filter(function (x) { return x.id === id; })[0].titre.toLowerCase();
    }).join(', ').replace(/, ([^,]*)$/, ' et $1');
  }
  function dateText() {
    var p = state.date.split('-').map(Number);
    return fmtLong.format(new Date(p[0], p[1] - 1, p[2]));
  }
  function buildMessage() {
    var m = 'Bonjour Angie, c’est ' + state.name + '. Je souhaite réserver : ' + servicesText() +
      ', le ' + dateText() + ' à ' + human(state.time) + '.';
    var idea = [state.design, state.note].filter(Boolean).join(' · ');
    if (idea) m += ' Mon idée : ' + idea + '.';
    m += ' Mon numéro : ' + state.phone + '. Pouvez-vous me confirmer le créneau ? Merci !';
    return m;
  }
  function renderRecap() {
    var rows = [
      ['Prestation', servicesText()],
      ['Date', dateText() + ' à ' + human(state.time)],
      ['Durée estimée', durLabel(duration())],
      ['Prénom', state.name],
      ['Téléphone', state.phone]
    ];
    if (state.design) rows.push(['Mon set', state.design]);
    $('#recap').innerHTML = rows.map(function (r) {
      return '<div><span>' + r[0] + '</span><b>' + escapeHtml(r[1]) + '</b></div>';
    }).join('');
    var msg = buildMessage();
    $('#sendSms').setAttribute('href', 'sms:' + A.phoneIntl + '?&body=' + encodeURIComponent(msg));
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function toast(text) {
    var t = $('#toast');
    t.textContent = text;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 3600);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } finally { document.body.removeChild(ta); }
    });
  }
  function downloadIcs() {
    var p = state.date.split('-').map(Number);
    var start = p[0] + pad(p[1]) + pad(p[2]) + 'T' + pad(Math.floor(state.time / 60)) + pad(state.time % 60) + '00';
    var endMin = state.time + (duration() || 60);
    var end = p[0] + pad(p[1]) + pad(p[2]) + 'T' + pad(Math.floor(endMin / 60)) + pad(endMin % 60) + '00';
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Angie Nails Creation//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + stamp + '-' + Math.random().toString(36).slice(2) + '@angie-nails-creation',
      'DTSTAMP:' + stamp,
      'DTSTART:' + start,
      'DTEND:' + end,
      'SUMMARY:Angie Nails Création (à confirmer)',
      'DESCRIPTION:' + servicesText() + '. Demande à confirmer par Angie : ' + A.phone + '.',
      'LOCATION:' + A.address,
      'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous Angie Nails Création', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rdv-angie-nails.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---------- Navigation entre étapes ---------- */
  function showError(msg) {
    var e = $('#bError');
    if (!msg) { e.hidden = true; e.textContent = ''; return; }
    e.hidden = false; e.textContent = msg;
  }
  function validPhone(v) { var d = v.replace(/[\s.\-()]/g, ''); return /^(\+33|0033|0)[1-9]\d{8}$/.test(d); }
  function go(n) {
    step = n;
    $$('.b-panel').forEach(function (p) {
      var on = +p.getAttribute('data-step') === n;
      p.hidden = !on;
      p.classList.toggle('is-on', on);
    });
    $$('.b-steps li').forEach(function (li, i) {
      li.classList.toggle('is-on', i + 1 === n);
      li.classList.toggle('is-done', i + 1 < n);
    });
    $('#bBack').hidden = n === 1;
    var next = $('#bNext');
    next.style.display = n === 4 ? 'none' : '';
    next.querySelector('span').textContent = n === 3 ? 'Voir le récapitulatif' : 'Continuer';
    showError('');
    if (n === 2) { renderCalendar(); renderSlots(); }
    if (n === 3) { updateDesign(); }
    if (n === 4) { renderRecap(); }
    var top = form.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.4) {
      if (window.__lenis) window.__lenis.scrollTo(form, { offset: -90, duration: 1 });
      else form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function next() {
    if (step === 1) {
      if (!state.services.length) return showError('Choisissez au moins une prestation pour continuer.');
      // la durée a pu changer : on vérifie que le créneau choisi existe toujours
      if (state.date) {
        var p = state.date.split('-').map(Number);
        if (slotsFor(p[0], p[1], p[2]).indexOf(state.time) < 0) state.time = null;
      }
    }
    if (step === 2) {
      if (!state.date) return showError('Choisissez un jour dans le calendrier.');
      if (state.time === null) return showError('Choisissez une heure pour continuer.');
    }
    if (step === 3) {
      state.name = $('#fName').value.trim();
      state.phone = $('#fPhone').value.trim();
      state.note = $('#fNote').value.trim();
      if (!state.name) return showError('Indiquez votre prénom.');
      if (!validPhone(state.phone)) return showError('Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).');
    }
    go(step + 1);
  }

  function updateDesign() {
    var el = $('#bDesign');
    if (!state.design) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = 'Mon set : ' + state.design;
  }

  /* ---------- Événements ---------- */
  $('#bNext').addEventListener('click', next);
  $('#bBack').addEventListener('click', function () { go(Math.max(1, step - 1)); });
  form.addEventListener('submit', function (e) { e.preventDefault(); next(); });

  $('#calPrev').addEventListener('click', function () { view.m--; if (view.m < 1) { view.m = 12; view.y--; } renderCalendar(); });
  $('#calNext').addEventListener('click', function () { view.m++; if (view.m > 12) { view.m = 1; view.y++; } renderCalendar(); });
  $('#calGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.cal-day');
    if (!b || b.disabled) return;
    state.date = b.dataset.k;
    state.time = null;
    renderCalendar();
    renderSlots();
  });
  $('#slots').addEventListener('click', function (e) {
    var b = e.target.closest('.slot');
    if (!b) return;
    state.time = +b.dataset.t;
    $$('.slot', $('#slots')).forEach(function (s) { var on = s === b; s.classList.toggle('is-sel', on); s.setAttribute('aria-checked', on); });
    showError('');
  });

  $('#copyMsg').addEventListener('click', function () {
    copy(buildMessage()).then(function () { toast('Message copié. Collez-le dans un SMS ou sur Instagram.'); }, function () { toast('Copie impossible : sélectionnez le texte du récapitulatif.'); });
  });
  $('#dlIcs').addEventListener('click', downloadIcs);
  $('#sendIg').addEventListener('click', function () {
    copy(buildMessage()).then(function () { toast('Message copié : collez-le dans la conversation Instagram.'); }, function () {});
  });
  $('#sendSms').addEventListener('click', function () {
    // sur ordinateur, le lien sms: n'ouvre souvent rien : on copie aussi le message par sécurité
    if (!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      copy(buildMessage()).then(function () { toast('Message copié : envoyez-le au ' + A.phone + ' depuis votre téléphone.'); }, function () {});
    }
  });

  /* ---------- API publique (cartes prestations + atelier) ---------- */
  function scrollToBooking() {
    var el = document.getElementById('reserver');
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }
  window.AngieBooking = {
    select: function (id, quiet) {
      var i = state.services.indexOf(id);
      if (i < 0) state.services.push(id); else if (quiet !== true) state.services.splice(i, 1);
      state.time = null;
      renderServices();
      syncPickedButtons();
      if (step !== 1) go(1);
      if (state.services.indexOf(id) > -1 && quiet !== true) toast('« ' + A.services.filter(function (x) { return x.id === id; })[0].titre + ' » ajouté à votre demande.');
    },
    setDesign: function (text) {
      state.design = text;
      updateDesign();
      toast('Votre set est ajouté à la demande de rendez-vous.');
      scrollToBooking();
    },
    scrollTo: scrollToBooking
  };

  initView();
  renderServices();
  syncPickedButtons();
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-pick');
      window.AngieBooking.select(id);
      if (state.services.indexOf(id) > -1) scrollToBooking();
    });
  });
})();
