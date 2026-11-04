/* ==========================================================
   Angie Nails Création : mise en scène (GSAP + ScrollTrigger + Lenis)
   Règles : courbes douces (expo / power3), transform + opacity en priorité,
   version allégée sur mobile, respect de prefers-reduced-motion.
   ========================================================== */
(function () {
  'use strict';

  var A = window.ANGIE || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var lenis = null;
  var root = document.documentElement;
  var body = document.body;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  if (reduce) root.classList.add('reduced');

  /* ----------------------------------------------------------
     Outils : découpage de texte en mots / lettres (masque qui monte)
     ---------------------------------------------------------- */
  function splitNode(node, mode, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.setAttribute('aria-hidden', 'true');
          if (mode === 'words') {
            w.className = 'sw';
            var wi = document.createElement('span'); wi.className = 'swi'; wi.textContent = tok;
            w.appendChild(wi); out.push(wi);
          } else {
            w.className = 'nowrap';
            Array.prototype.forEach.call(tok, function (ch) {
              var c = document.createElement('span'); c.className = 'sc';
              var ci = document.createElement('span'); ci.className = 'sci'; ci.textContent = ch;
              c.appendChild(ci); w.appendChild(c); out.push(ci);
            });
          }
          frag.appendChild(w);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && !n.classList.contains('sr-only')) {
        splitNode(n, mode, out);
      }
    });
  }
  function split(el, mode) {
    var out = [];
    if (/^H[1-6]$/.test(el.tagName)) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    splitNode(el, mode, out);
    return out;
  }

  /* ----------------------------------------------------------
     Fonctions qui marchent même sans GSAP
     ---------------------------------------------------------- */
  // Horaires : jour courant + état ouvert / fermé
  function initHours() {
    if (!A.hours) return;
    var p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    var map = { 'dim.': 0, 'lun.': 1, 'mar.': 2, 'mer.': 3, 'jeu.': 4, 'ven.': 5, 'sam.': 6 };
    var d = map[o.weekday]; if (d === undefined) return;
    var min = (+o.hour % 24) * 60 + (+o.minute);
    var row = $('.hours tr[data-d="' + d + '"]'); if (row) row.classList.add('is-today');
    var h = A.hours[d], el = $('#openState'); if (!el) return;
    var names = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    if (h && min >= h[0] * 60 && min < h[1] * 60) { el.textContent = 'Ouvert · ferme à ' + h[1] + ' h'; el.classList.add('is-open'); return; }
    if (h && min < h[0] * 60) { el.textContent = 'Fermé · ouvre à ' + h[0] + ' h'; return; }
    for (var i = 1; i <= 7; i++) {
      var nd = (d + i) % 7;
      if (A.hours[nd]) { el.textContent = 'Fermé · ouvre ' + (i === 1 ? 'demain' : names[nd]) + ' à ' + A.hours[nd][0] + ' h'; return; }
    }
  }

  // Menu mobile
  var menu = $('#menu'), burger = $('#burger'), menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', !open);
    body.classList.toggle('is-locked', open);
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (hasGsap && !reduce) {
      if (open) {
        menu.style.visibility = 'visible';
        gsap.to(menu, { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'expo.inOut' });
        gsap.fromTo('.menu nav a', { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: .06, ease: 'expo.out', delay: .35 });
        gsap.fromTo('.menu-foot > *', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .1, ease: 'expo.out', delay: .7 });
      } else {
        gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: .8, ease: 'expo.inOut', onComplete: function () { menu.style.visibility = 'hidden'; } });
      }
    } else {
      menu.style.visibility = open ? 'visible' : 'hidden';
      menu.style.clipPath = open ? 'inset(0)' : 'inset(0 0 100% 0)';
    }
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  // Ancres : défilement fluide (Lenis) ou natif
  function scrollToTarget(sel) {
    var el = sel === '#top' ? null : $(sel);
    if (sel !== '#top' && !el) return;
    if (lenis) lenis.scrollTo(el || 0, { duration: 1.6, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    else if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    else window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (href.length < 2) return;
    e.preventDefault();
    if (menuOpen) { setMenu(false); setTimeout(function () { scrollToTarget(href); }, 350); }
    else scrollToTarget(href);
  });

  // Lightbox galerie
  (function () {
    var dlg = $('#lightbox'); if (!dlg || !dlg.showModal) return;
    var items = $$('.g-item').sort(function (a, b) { return +a.dataset.i - +b.dataset.i; });
    var cur = 0;
    function show(i) {
      cur = (i + items.length) % items.length;
      var img = $('img', items[cur]);
      $('#lbImg').src = img.currentSrc || img.src;
      $('#lbImg').alt = img.alt;
      $('#lbCap').textContent = $('figcaption b', items[cur]).textContent;
    }
    items.forEach(function (it) {
      $('button', it).addEventListener('click', function () {
        show(items.indexOf(it)); dlg.showModal(); if (lenis) lenis.stop();
      });
    });
    function close() { dlg.close(); }
    dlg.addEventListener('close', function () { if (lenis && !menuOpen) lenis.start(); });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', function () { show(cur - 1); });
    $('#lbNext').addEventListener('click', function () { show(cur + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  })();

  // Mentions légales
  (function () {
    var d = $('#legal'), o = $('#legalOpen'); if (!d || !d.showModal) return;
    o.addEventListener('click', function () { d.showModal(); if (lenis) lenis.stop(); });
    $('#legalClose').addEventListener('click', function () { d.close(); });
    d.addEventListener('close', function () { if (lenis) lenis.start(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  })();

  // Carrousel d'avis (défilement natif + flèches + lecture auto)
  (function () {
    var track = $('#revTrack'); if (!track) return;
    var cards = $$('.rev', track), bar = $('.rev-bar i'), timer = null, paused = false, visible = false;
    function stepW() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth; }
    function update() {
      var tr = track.getBoundingClientRect();
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect();
        c.classList.toggle('is-active', r.left >= tr.left - 12 && r.right <= tr.right + 12);
      });
      var max = track.scrollWidth - track.clientWidth;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.max(.12, track.scrollLeft / max) : 1) + ')';
    }
    function move(dir) {
      var max = track.scrollWidth - track.clientWidth;
      if (dir > 0 && track.scrollLeft >= max - 8) track.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
      else if (dir < 0 && track.scrollLeft <= 8) track.scrollTo({ left: max, behavior: reduce ? 'auto' : 'smooth' });
      else track.scrollBy({ left: dir * stepW(), behavior: reduce ? 'auto' : 'smooth' });
    }
    var raf = 0;
    track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    $('#revPrev').addEventListener('click', function () { move(-1); });
    $('#revNext').addEventListener('click', function () { move(1); });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); });
    ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) { track.addEventListener(ev, function () { paused = true; }, { passive: true }); });
    ['pointerleave', 'focusout'].forEach(function (ev) { track.addEventListener(ev, function () { paused = false; }); });
    if (!reduce) {
      timer = setInterval(function () { if (!paused && visible && !document.hidden) move(1); }, 6500);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: .35 }).observe(track);
      else visible = true;
    }
    update();
  })();

  initHours();

  /* ----------------------------------------------------------
     Sans GSAP : on s'arrête là, le site reste utilisable
     ---------------------------------------------------------- */
  if (!hasGsap) {
    root.classList.add('ready');
    var ld = $('#loader'); if (ld) ld.classList.add('is-done');
    var mc0 = $('#mobileCta'); if (mc0) mc0.classList.add('is-on');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ----------------------------------------------------------
     Smooth scroll (Lenis) branché sur le ticker GSAP
     ---------------------------------------------------------- */
  if (!reduce && window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ----------------------------------------------------------
     Texte animé : initialisation avant l'intro
     ---------------------------------------------------------- */
  var heroChars = split($('.ht-main'), 'chars');
  var splitTargets = $$('[data-split]').map(function (el) { return { el: el, words: split(el, 'words') }; });
  var footChars = split($('.footer-giant span'), 'chars');
  var heroPhotos = $$('.hp');
  var isDesktop = window.matchMedia('(min-width: 900px)').matches;

  /* ----------------------------------------------------------
     Préchargeur + entrée spectaculaire
     ---------------------------------------------------------- */
  var started = false;
  function heroIn() {
    if (started) return; started = true;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero-media', { scale: 1.3 }, { scale: 1, duration: 2.6 }, 0)
      .from(heroChars, { yPercent: 118, rotate: 7, duration: 1.5, stagger: .08 }, .1)
      .from('.hero-eyebrow', { y: 24, opacity: 0, duration: 1.1 }, .4)
      .from('.ht-sub', { y: 30, opacity: 0, duration: 1.2 }, .6)
      .from('.hero-lead, .hero-cta .btn, .hero-rating', { y: 34, opacity: 0, duration: 1.2, stagger: .1 }, .8)
      .from(heroPhotos, { scale: .55, opacity: 0, duration: 1.8, stagger: .16 }, .5)
      .from('.hero-ghost', { opacity: 0, xPercent: 6, duration: 2.2 }, .3)
      .from('.nav', { yPercent: -100, duration: 1.2 }, .9)
      .to('.hero-line .gold-draw', { strokeDashoffset: 0, duration: 3.2, ease: 'power2.inOut' }, .8)
      .add(function () {
        root.classList.add('ready');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }, 1.1);
  }
  function runLoader() {
    var loader = $('#loader');
    if (reduce) {
      loader.classList.add('is-done');
      root.classList.add('ready');
      return;
    }
    var num = $('#ldNum'), o = { v: 0 };
    var tl = gsap.timeline();
    tl.from('.ld-center', { opacity: 0, y: 20, duration: .8, ease: 'power3.out' }, 0)
      .fromTo('.ld-fill', { yPercent: 100 }, { yPercent: 0, duration: 2.1, ease: 'power2.inOut' }, .2)
      .to(o, { v: 100, duration: 2.1, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(o.v); } }, .2)
      .to('.ld-count, .ld-brand', { opacity: 0, duration: .35, ease: 'power2.in' }, 2.35)
      .to('.ld-nail', { scale: 46, duration: 1.05, ease: 'expo.in' }, 2.4)
      .add(heroIn, 3.3)
      .to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 3.35)
      .add(function () { loader.classList.add('is-done'); }, 4.6);
  }

  /* ----------------------------------------------------------
     Navigation : se cache au scroll vers le bas, revient vers le haut
     ---------------------------------------------------------- */
  var nav = $('#nav'), navHidden = false;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      var y = self.scroll();
      nav.classList.toggle('is-solid', y > 60);
      if (menuOpen) return;
      if (y > 420 && self.direction === 1 && !navHidden) { navHidden = true; gsap.to(nav, { yPercent: -110, duration: .7, ease: 'power3.out', overwrite: 'auto' }); }
      else if ((self.direction === -1 || y < 420) && navHidden) { navHidden = false; gsap.to(nav, { yPercent: 0, duration: .7, ease: 'power3.out', overwrite: 'auto' }); }
    }
  });

  // barre de progression de lecture
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  // bouton flottant mobile : visible après le hero, masqué sur la section réservation
  var mc = $('#mobileCta');
  ScrollTrigger.create({ trigger: '.hero', start: 'bottom 80%', onEnter: function () { mc.classList.add('is-on'); }, onLeaveBack: function () { mc.classList.remove('is-on'); } });
  ScrollTrigger.create({ trigger: '#reserver', start: 'top 85%', end: 'bottom 15%', onToggle: function (s) { mc.classList.toggle('is-hidden', s.isActive); } });

  /* ----------------------------------------------------------
     Titres : apparition mot par mot (masque qui monte)
     ---------------------------------------------------------- */
  if (!reduce) {
    splitTargets.forEach(function (t) {
      gsap.from(t.words, {
        yPercent: 112, rotate: 3, duration: 1.3, ease: 'expo.out', stagger: .045,
        scrollTrigger: { trigger: t.el, start: 'top 86%', once: true }
      });
    });
    $$('.eyebrow, .lead, .book-how li, .book-note, .info-list li, .hours').forEach(function (el) {
      if (el.closest('.hero')) return;
      gsap.from(el, { y: 36, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    gsap.from(footChars, { yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true } });
    gsap.from('.fg-sub', { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', delay: .5, scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true } });
    gsap.from('.footer-grid > *', { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.footer-grid', start: 'top 92%', once: true } });
    gsap.from('.cta-phone, .cta-actions', { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .15, scrollTrigger: { trigger: '.cta', start: 'top 60%', once: true } });
    gsap.from('.booking', { y: 90, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.booking', start: 'top 88%', once: true } });
    gsap.from('.map-frame', { y: 80, opacity: 0, scale: .94, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.map-frame', start: 'top 88%', once: true } });
    gsap.from('#revTrack', { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '#revTrack', start: 'top 90%', once: true } });
    gsap.from('.fan .finger', { y: 140, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.fan', start: 'top 82%', once: true } });
    gsap.from('.insta-tiles .tile', { y: 60, opacity: 0, scale: .9, duration: 1.2, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.insta-tiles', start: 'top 90%', once: true } });
    gsap.from('.num', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .14, scrollTrigger: { trigger: '.num-list', start: 'top 85%', once: true } });
  }

  /* ----------------------------------------------------------
     Hero : parallax multicouche + souris
     ---------------------------------------------------------- */
  if (!reduce) {
    var heroTrig = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero-video-wrap', { yPercent: 16, ease: 'none', scrollTrigger: heroTrig });
    gsap.to('.hero-ghost', { xPercent: -14, yPercent: 8, ease: 'none', scrollTrigger: heroTrig });
    gsap.to('.hero-line', { yPercent: -30, ease: 'none', scrollTrigger: heroTrig });
    gsap.to('.hero-inner', { yPercent: -9, ease: 'none', scrollTrigger: heroTrig });
    heroPhotos.forEach(function (hp) {
      var d = +hp.dataset.depth || 1;
      gsap.to(hp, { yPercent: -45 * d, ease: 'none', scrollTrigger: heroTrig });
    });
    if (fine) {
      var hero = $('#hero');
      hero.addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - .5, ny = e.clientY / window.innerHeight - .5;
        $$('.hp-in').forEach(function (el) {
          var d = +el.closest('.hp').dataset.depth || 1;
          gsap.to(el, { x: -nx * 46 * d, y: -ny * 34 * d, duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
        });
        gsap.to('.hero-ghost', { x: nx * -34, duration: 1.6, ease: 'power3.out', overwrite: 'auto' });
      });
    }
  }

  /* ----------------------------------------------------------
     Marquee : vitesse et sens réagissent au scroll
     ---------------------------------------------------------- */
  (function () {
    var rows = $$('[data-marquee]').map(function (m) {
      var track = $('.m-track', m);
      var need = Math.ceil((window.innerWidth * 1.25) / Math.max(track.offsetWidth, 1)) + 1;
      for (var i = 0; i < need; i++) { var c = track.cloneNode(true); c.setAttribute('aria-hidden', 'true'); m.appendChild(c); }
      return { m: m, dir: +m.dataset.marquee, tracks: $$('.m-track', m), w: track.offsetWidth, x: 0 };
    });
    if (reduce) return;
    var lastY = window.scrollY, vel = 0, sign = 1;
    gsap.ticker.add(function (time, delta) {
      var dt = Math.max(delta, 1) / 1000, y = window.scrollY;
      var inst = (y - lastY) / dt; lastY = y;
      vel += (inst - vel) * .08;
      if (Math.abs(vel) > 40) sign += ((vel > 0 ? 1 : -1) - sign) * .12;
      var boost = 1 + Math.min(Math.abs(vel) / 450, 6);
      rows.forEach(function (r) {
        r.x += r.dir * 70 * boost * sign * dt;
        if (r.x <= -r.w) r.x += r.w; if (r.x > 0) r.x -= r.w;
        r.tracks.forEach(function (t) { t.style.transform = 'translate3d(' + r.x + 'px,0,0)'; });
      });
    });
    window.addEventListener('resize', function () { rows.forEach(function (r) { r.w = r.tracks[0].offsetWidth; }); });
  })();

  /* ----------------------------------------------------------
     Sections pinnées / horizontales (desktop, animations autorisées)
     ---------------------------------------------------------- */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
    /* --- Savoir-faire : storytelling épinglé, 5 étapes --- */
    var story = $('#savoir-faire');
    story.classList.add('is-pinned');
    var steps = $$('.story-step', story), imgs = $$('.s-img', story), n = steps.length;
    var now = $('#spNow'), shown = 0;
    gsap.set(steps, { autoAlpha: 0 }); gsap.set(steps[0], { autoAlpha: 1 });
    gsap.set(imgs, { clipPath: 'inset(100% 0% 0% 0%)' }); gsap.set(imgs[0], { clipPath: 'inset(0% 0% 0% 0%)' });
    imgs.forEach(function (s) { gsap.set($('img', s), { scale: 1.3 }); });
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: story, start: 'top top', end: '+=' + (n * 85) + '%', pin: true, scrub: .7, anticipatePin: 1,
        onUpdate: function (self) {
          var i = Math.min(n - 1, Math.max(0, Math.floor(self.progress * tl.duration() - .25)));
          if (i !== shown) { shown = i; now.textContent = pad(i + 1); }
        }
      }
    });
    tl.to($('img', imgs[0]), { scale: 1, duration: 1 }, 0);
    for (var i = 1; i < n; i++) {
      (function (i) {
        var at = 'step' + i;
        tl.addLabel(at, i);
        tl.to(steps[i - 1], { autoAlpha: 0, y: -50, duration: .3, ease: 'power2.in' }, at);
        tl.fromTo(imgs[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .55, ease: 'power2.inOut' }, at);
        tl.to($('img', imgs[i]), { scale: 1, duration: .9 }, at);
        tl.fromTo(steps[i], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: .45, ease: 'power2.out' }, at + '+=.3');
      })(i);
    }
    tl.to('.sp-bar i', { scaleX: 1, duration: n - 1 }, 0);
    tl.to({}, { duration: .5 });

    /* --- Prestations : défilement horizontal piloté par le scroll --- */
    var sec = $('#prestations'), pin = $('.services-pin', sec);
    sec.classList.add('is-pinned');
    var dist = function () { return Math.max(0, pin.scrollWidth - window.innerWidth + 40); };
    gsap.to(pin, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 }
    });

    return function () { story.classList.remove('is-pinned'); sec.classList.remove('is-pinned'); };
  });

  /* ----------------------------------------------------------
     Chiffres clés animés
     ---------------------------------------------------------- */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count), dec = +el.dataset.decimals || 0, o = { v: 0 };
    var fmt = function (v) { return v.toFixed(dec).replace('.', ','); };
    if (reduce) { el.textContent = fmt(end); return; }
    el.textContent = fmt(0);
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: function () { gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v); } }); }
    });
  });
  if (!reduce) {
    gsap.to('.numbers-line .gold-draw', { strokeDashoffset: 0, duration: 3, ease: 'power2.inOut', scrollTrigger: { trigger: '.numbers', start: 'top 70%', once: true } });
  }

  /* ----------------------------------------------------------
     Galerie : révélations par rideau, parallax dans le cadre, colonnes décalées
     ---------------------------------------------------------- */
  if (!reduce) {
    $$('.g-item').forEach(function (it) {
      var frame = $('.g-frame', it), img = $('img', frame);
      gsap.from(frame, { clipPath: 'inset(0 0 100% 0)', y: 70, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 92%', once: true } });
      if (isDesktop) {
        gsap.set(img, { scale: 1.2 });
        gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: true } });
      }
    });
    if (isDesktop) {
      $$('.g-col').forEach(function (col) {
        var s = +col.dataset.speed || 0;
        gsap.fromTo(col, { y: -s * 5 }, { y: s * 5, ease: 'none', scrollTrigger: { trigger: '#galGrid', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
    // séparateurs « vernis qui coule »
    $$('.drip').forEach(function (d) {
      gsap.from($('path', d), { scaleY: .12, transformOrigin: '50% 0%', duration: 1.8, ease: 'elastic.out(1,.55)', scrollTrigger: { trigger: d, start: 'top 98%', once: true } });
    });
  }

  /* ----------------------------------------------------------
     Micro-interactions : tilt 3D + reflet, boutons magnétiques, curseur
     ---------------------------------------------------------- */
  if (fine && !reduce) {
    $$('.tilt, .g-item .g-frame').forEach(function (card) {
      var host = card.classList.contains('tilt') ? card : card.closest('button');
      var amp = card.classList.contains('tilt') ? 12 : 7;
      host.addEventListener('pointermove', function (e) {
        var r = host.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        gsap.to(card, { rotateY: (px - .5) * amp, rotateX: -(py - .5) * amp, transformPerspective: 900, duration: .5, ease: 'power3.out', overwrite: 'auto' });
        card.style.setProperty('--mx', px * 100 + '%'); card.style.setProperty('--my', py * 100 + '%');
      });
      host.addEventListener('pointerleave', function () {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.6)', overwrite: 'auto' });
      });
    });
    $$('[data-magnetic]').forEach(function (el) {
      var qx = gsap.quickTo(el, 'x', { duration: .7, ease: 'power3.out' }), qy = gsap.quickTo(el, 'y', { duration: .7, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * .32); qy((e.clientY - (r.top + r.height / 2)) * .42);
      });
      el.addEventListener('pointerleave', function () { qx(0); qy(0); });
    });
    var cur = $('.cursor'), cx = -50, cy = -50, tx = -50, ty = -50, shown = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cx = tx; cy = ty; gsap.to(cur, { opacity: 1, duration: .4 }); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { gsap.to(cur, { opacity: 0, duration: .3 }); shown = false; });
    gsap.ticker.add(function () {
      cx += (tx - cx) * .22; cy += (ty - cy) * .22;
      cur.style.transform = 'translate3d(' + (cx - 11) + 'px,' + (cy - 2) + 'px,0) rotate(-18deg)';
    });
    document.addEventListener('pointerover', function (e) {
      cur.classList.toggle('is-link', !!(e.target.closest && e.target.closest('a, button, .tilt, label, [data-magnetic]')));
    });
  }

  /* ----------------------------------------------------------
     Vidéo hero : lecture robuste
     ---------------------------------------------------------- */
  var vid = $('#heroVideo');
  if (vid) {
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) { vid.removeAttribute('autoplay'); vid.pause(); if (saveData) { $$('source', vid).forEach(function (s) { s.remove(); }); vid.load(); } }
    else { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); }
  }

  /* ----------------------------------------------------------
     Lancement
     ---------------------------------------------------------- */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  if (document.readyState === 'complete') runLoader();
  else window.addEventListener('load', runLoader);
})();
