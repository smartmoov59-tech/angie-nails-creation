/* ==========================================================
   Atelier : composez votre set (aperçu 100 % CSS)
   ========================================================== */
(function () {
  'use strict';
  var fan = document.getElementById('fan');
  if (!fan) return;

  var shapes = { amande: 'Amande', coffin: 'Coffin', carree: 'Carrée', ronde: 'Ronde' };
  var finishes = { brillant: 'Brillant', nacre: 'Nacré', paillete: 'Pailleté', french: 'French', chrome: 'Chrome' };
  var st = { shape: 'amande', color: '#C3112F', colorName: 'Rouge cerise', finish: 'brillant', gold: false };

  function summary() {
    var s = [shapes[st.shape], st.colorName, finishes[st.finish]];
    if (st.gold) s.push('filets dorés');
    return s.join(' · ');
  }
  function paint() {
    fan.setAttribute('data-shape', st.shape);
    fan.setAttribute('data-finish', st.finish);
    fan.style.setProperty('--c', st.color);
    fan.classList.toggle('has-gold', st.gold);
    var txt = summary();
    document.getElementById('atelierSum').textContent = txt;
    fan.setAttribute('aria-label', 'Aperçu de votre set : ' + txt);
  }
  function group(selector, attr, cb) {
    var btns = Array.prototype.slice.call(document.querySelectorAll(selector));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { var on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-checked', on); });
        cb(b);
        paint();
      });
    });
  }
  group('.chip[data-shape]', 'shape', function (b) { st.shape = b.getAttribute('data-shape'); });
  group('.chip[data-finish]', 'finish', function (b) { st.finish = b.getAttribute('data-finish'); });
  group('.swatch', 'color', function (b) { st.color = b.getAttribute('data-color'); st.colorName = b.getAttribute('data-name'); });
  document.getElementById('goldToggle').addEventListener('change', function (e) { st.gold = e.target.checked; paint(); });
  document.getElementById('atelierSend').addEventListener('click', function () {
    if (window.AngieBooking) window.AngieBooking.setDesign(summary());
  });
  paint();
})();
