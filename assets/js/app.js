/* Wireframe: jen chování, které v Tildě zajišťují standardní bloky.
   Menu (ME100 + ME601B), formuláře, cookies (T972), kategorie a načítání příspěvků (Feeds), vyhledávání (T838).
   Do Tildy se nic z tohoto souboru nepřenáší. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);

  /* náhled: hlášení stránky a kódy bloků */
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'nf-page', page: location.pathname.split('/').pop() || 'index.html' }, '*');
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'nf-blocks') document.documentElement.classList.toggle('show-t', !!e.data.on);
      if (e.data && e.data.type === 'nf-scroll-to') scrollToBlock(e.data.idx, e.data.frac);
    });
    /* náhled vedle sebe: scroll se páruje po blocích, ne po pixelech, protože mobil je delší */
    /* polohu posílá jen rámec, se kterým člověk právě pracuje; druhý jen následuje, takže se neodráží zpět */
    var active = 0, tick = false;
    ['wheel', 'touchstart', 'touchmove', 'keydown', 'mousedown'].forEach(function (t) {
      window.addEventListener(t, function () { active = Date.now(); }, { passive: true });
    });
    var blocks = function () { return $$('main > *, body > .nl, body > footer'); };
    /* druhý rámec k cíli plynule dojíždí (každý snímek urazí část zbývající vzdálenosti), místo aby skákal */
    var target = null, cur = 0, anim = false, de = document.documentElement;
    var follow = function () {
      if (target === null) { anim = false; return; }
      var d = target - cur;
      if (Math.abs(d) < 0.5) { cur = target; window.scrollTo(0, cur); target = null; anim = false; de.style.scrollBehavior = ''; return; }
      cur += d * 0.22;
      window.scrollTo(0, cur);
      requestAnimationFrame(follow);
    };
    var scrollToBlock = function (idx, frac) {
      if (Date.now() - active < 1200) return;
      var b = blocks()[idx]; if (!b) return;
      var r = b.getBoundingClientRect();
      var max = de.scrollHeight - window.innerHeight;
      if (!anim) cur = window.scrollY;
      target = Math.max(0, Math.min(max, idx === 0 && frac === 0 ? 0 : window.scrollY + r.top + r.height * frac));
      de.style.scrollBehavior = 'auto';
      if (!anim) { anim = true; requestAnimationFrame(follow); }
    };
    window.addEventListener('scroll', function () {
      if (Date.now() - active > 1200 || tick) return;
      tick = true;
      requestAnimationFrame(function () {
        tick = false;
        var bs = blocks(), i = 0, y = 0;
        for (; i < bs.length; i++) {
          var r = bs[i].getBoundingClientRect();
          if (r.bottom > 0) { y = r.height ? Math.max(0, -r.top) / r.height : 0; break; }
        }
        if (window.scrollY < 2) { i = 0; y = 0; }
        window.parent.postMessage({ type: 'nf-scroll', idx: i, frac: y }, '*');
      });
    }, { passive: true });
  }
  if (params.get('bloky') === '1') document.documentElement.classList.add('show-t');

  /* menu */
  var items = $$('.nav-item');
  function closeDD(ex) {
    items.forEach(function (it) {
      if (it === ex) return;
      it.classList.remove('open');
      var b = $('button', it); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  items.forEach(function (it) {
    var b = $('button', it);
    if (!b) return;
    b.addEventListener('click', function () {
      var o = it.classList.contains('open');
      closeDD();
      if (!o) { it.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav-item')) closeDD(); });
  var burger = $('.burger'), menu = $('#menu');
  var header = $('#header');
  function setMenu(o) {
    if (o) { setSearch(false); menu.style.top = Math.max(0, header.getBoundingClientRect().bottom) + 'px'; }
    burger.setAttribute('aria-expanded', String(o));
    $('.sr', burger).textContent = o ? 'Zavřít menu' : 'Otevřít menu';
    menu.hidden = !o;
    document.body.classList.toggle('menu-open', o);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) { setMenu(false); burger.focus(); } else { closeDD(); setSearch(false); }
  });

  /* hledání vyjede zpod navigace */
  var sBtn = $('[data-search-toggle]'), sPanel = $('#search-panel');
  function setSearch(o) {
    if (!sBtn) return;
    sPanel.hidden = !o; sBtn.setAttribute('aria-expanded', String(o));
    if (o) { closeDD(); setTimeout(function () { $('input', sPanel).focus(); }, 30); }
  }
  if (sBtn) {
    sBtn.addEventListener('click', function () { if (!menu.hidden) setMenu(false); setSearch(sPanel.hidden); });
    document.addEventListener('click', function (e) { if (!sPanel.hidden && !e.target.closest('#search-panel,[data-search-toggle]')) setSearch(false); });
  }

  /* přepínače ve skupině (widget daru, ukazatele) */
  $$('.widget [role="group"]').forEach(function (g) {
    $$('button', g).forEach(function (b) {
      b.addEventListener('click', function () { $$('button', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
    });
  });

  /* formuláře: povinná pole a potvrzení */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function checkField(i) {
    var wrap = i.closest('.field,.check'); if (!wrap) return true;
    var ok = true;
    if (i.type === 'checkbox') ok = !i.required || i.checked;
    else if (i.required && !i.value.trim()) ok = false;
    else if (i.type === 'email' && i.value.trim() && !EMAIL.test(i.value.trim())) ok = false;
    wrap.classList.toggle('bad', !ok);
    return ok;
  }
  $$('form[data-form]').forEach(function (f) {
    f.setAttribute('novalidate', '');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      $$('input,select,textarea', f).forEach(function (i) { if (!checkField(i) && !first) first = i; });
      if (first) { first.focus(); return; }
      var ok = document.createElement('div');
      ok.className = 'form-ok'; ok.setAttribute('role', 'status'); ok.tabIndex = -1;
      ok.innerHTML = '<h3></h3><p></p><span class="proto">Prototyp: formulář se nikam neodesílá.</span>';
      $('h3', ok).textContent = f.getAttribute('data-ok-title');
      $('p', ok).textContent = f.getAttribute('data-ok-text');
      f.replaceWith(ok); ok.focus({ preventScroll: true });
    });
  });

  /* cookies */
  var cookie = $('#cookie'), seen = null;
  try { seen = localStorage.getItem('nf-cookies'); } catch (e) {}
  if (cookie && !seen) cookie.hidden = false;
  $$('[data-cookie]').forEach(function (b) {
    b.addEventListener('click', function () {
      try { localStorage.setItem('nf-cookies', b.getAttribute('data-cookie')); } catch (e) {}
      cookie.hidden = true;
    });
  });

  /* Feeds: kategorie a načíst další */
  var feed = $('[data-feed]');
  if (feed) {
    var posts = $$('[data-cat]', feed), PAGE = 9, shown = PAGE, cat = 'vse', more = $('[data-more]');
    var render = function () {
      var hits = posts.filter(function (p) { return cat === 'vse' || p.getAttribute('data-cat') === cat; });
      posts.forEach(function (p) { p.hidden = true; });
      hits.slice(0, shown).forEach(function (p) { p.hidden = false; });
      more.hidden = hits.length <= shown;
      $$('[data-cat-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat-btn') === cat)); });
    };
    $$('[data-cat-btn]').forEach(function (b) { b.addEventListener('click', function () { cat = b.getAttribute('data-cat-btn'); shown = PAGE; render(); }); });
    var h = location.hash.slice(1);
    if (h && $('[data-cat-btn="' + h + '"]')) cat = h;
    $('button', more).addEventListener('click', function () { shown += PAGE; render(); });
    render();
  }

  /* Příběhy: filtr podle programu a profese */
  var stories = $('[data-stories]');
  if (stories) {
    var sel = { p: 'vse', o: 'vse' }, cards = $$('[data-p]', stories), none = $('[data-none]');
    var draw = function () {
      var n = 0;
      cards.forEach(function (c) {
        var ok = (sel.p === 'vse' || c.getAttribute('data-p') === sel.p) && (sel.o === 'vse' || c.getAttribute('data-o') === sel.o);
        c.hidden = !ok; if (ok) n++;
      });
      none.hidden = n > 0;
      $$('[data-f]').forEach(function (b) { b.setAttribute('aria-pressed', String(sel[b.getAttribute('data-f')] === b.getAttribute('data-v'))); });
    };
    $$('[data-f]').forEach(function (b) { b.addEventListener('click', function () { sel[b.getAttribute('data-f')] = b.getAttribute('data-v'); draw(); }); });
    draw();
  }

  /* Měření dopadu: mapa krajů, taby a grafy */
  $$('[data-impact]').forEach(function (root) {
    var D = JSON.parse($('[data-impact-json]', root).textContent);
    var st = { view: 'kraje', metric: 'lide', year: 'all', k: null };
    var paths = $$('.kraj', root), side = $('[data-side]', root);
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
    var M = function () { return D.metrics[st.metric]; };
    var val = function (k) { var a = M().data[k]; return st.year === 'all' ? a.reduce(function (x, y) { return x + y; }, 0) : a[+st.year]; };
    var total = function () { return Object.keys(D.names).reduce(function (s, k) { return s + val(k); }, 0); };
    var unit = function () { return M().unit; };
    var yearLabel = function () { return st.year === 'all' ? '2022–2025' : D.years[+st.year]; };
    function hbars(rows, max, opts) {
      opts = opts || {};
      return '<ul class="hbars">' + rows.map(function (r) {
        return '<li' + (r.k ? ' data-k="' + r.k + '"' : '') + (r.is ? ' class="is"' : '') + '><span>' + r.l + '</span><span class="bar"><i style="width:' + Math.max(2, r.v / max * 100) + '%"></i></span><b>' + fmt(r.v) + (opts.u || '') + '</b></li>';
      }).join('') + '</ul>';
    }
    function shade() {
      var vals = Object.keys(D.names).map(val), max = Math.max.apply(null, vals) || 1;
      paths.forEach(function (p) {
        var v = val(p.getAttribute('data-k'));
        p.setAttribute('data-s', v === 0 ? 0 : Math.min(4, Math.ceil(v / max * 4)));
        p.classList.toggle('sel', p.getAttribute('data-k') === st.k);
      });
    }
    function panel() {
      var h = '', m = M();
      if (st.view === 'kraje') {
        if (st.k) {
          var a = m.data[st.k], mx = Math.max.apply(null, a) || 1;
          h = '<button type="button" class="sd-back" data-clear>← Celá Česká republika</button><div class="sd-h"><span class="eyebrow">Kraj</span><h3>' + D.names[st.k] + '</h3></div>'
            + '<div class="sd-big"><b>' + fmt(val(st.k)) + '</b><span>' + m.label.toLowerCase() + unit() + ', ' + yearLabel() + '</span></div>'
            + '<div class="sd-sec"><span class="eyebrow">Po letech</span><ol class="vbars">' + a.map(function (v, i) { return '<li class="' + (st.year === 'all' || +st.year === i ? 'is' : '') + '"><b>' + fmt(v) + '</b><i style="height:' + (v / mx * 100) + '%"></i><span>' + D.years[i] + '</span></li>'; }).join('') + '</ol></div>';
        } else {
          var rows = Object.keys(D.names).map(function (k) { return { k: k, l: D.names[k], v: val(k) }; }).sort(function (x, y) { return y.v - x.v; });
          h = '<div class="sd-h"><span class="eyebrow">Celá Česká republika · ' + yearLabel() + '</span><h3>' + m.label + '</h3></div>'
            + '<div class="sd-big"><b>' + fmt(total()) + '</b><span>' + unit().trim() + '</span></div><p class="sd-sub">Kliknutím na kraj v mapě nebo v žebříčku zobrazíte detail.</p>'
            + '<div class="sd-sec"><span class="eyebrow">Kraje podle podpory</span>' + hbars(rows.slice(0, 7), rows[0].v || 1) + '</div>';
        }
      } else if (st.view === 'cas') {
        var ys = D.years.map(function (y, i) { return Object.keys(D.names).reduce(function (s, k) { return s + (st.k ? (k === st.k ? m.data[k][i] : 0) : m.data[k][i]); }, 0); });
        var mx2 = Math.max.apply(null, ys) || 1, g = ys[0] ? Math.round((ys[3] / ys[0]) * 10) / 10 : 0;
        h = '<div class="sd-h"><span class="eyebrow">' + (st.k ? D.names[st.k] : 'Celá Česká republika') + '</span><h3>' + m.label + ' po letech</h3></div>'
          + '<ol class="vbars">' + ys.map(function (v, i) { return '<li class="' + (st.year === 'all' || +st.year === i ? 'is' : '') + '"><b>' + fmt(v) + '</b><i style="height:' + (v / mx2 * 100) + '%"></i><span>' + D.years[i] + '</span></li>'; }).join('') + '</ol>'
          + '<div class="sd-sec"><p class="sd-sub"><b>' + String(g).replace('.', ',') + '×</b> víc než v prvním roce. Zájem roste rychleji než možnosti fondu.</p></div>';
      } else if (st.view === 'programy') {
        var pm = Math.max.apply(null, D.programs.map(function (p) { return p[1]; }));
        h = '<div class="sd-h"><span class="eyebrow">2022–2025</span><h3>Co přinesl každý program</h3></div><div class="sd-sec">'
          + '<ul class="hbars">' + D.programs.map(function (p) { return '<li><span>' + p[0] + '</span><span class="bar"><i style="width:' + (p[1] / pm * 100) + '%"></i></span><b>' + p[1] + '</b></li>'; }).join('') + '</ul></div>'
          + '<p class="sd-sub" style="margin-top:16px">' + D.programs.map(function (p) { return p[1] + ' ' + p[2]; }).join(' · ') + '</p>';
      } else {
        var pr = D.profs, sum = pr.reduce(function (s, p) { return s + p[1]; }, 0), px = pr[0][1];
        h = '<div class="sd-h"><span class="eyebrow">2022–2025</span><h3>Podpoření podle profese</h3></div><div class="sd-big"><b>' + sum + '</b><span>lidí napříč profesemi</span></div>'
          + '<div class="sd-sec">' + hbars(pr.map(function (p) { return { l: p[0], v: p[1] }; }), px) + '</div>';
      }
      side.innerHTML = h;
    }
    function draw() {
      shade(); panel();
      $$('[role="tab"]', root).forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-view') === st.view)); });
      $$('[data-metric]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-metric') === st.metric)); });
      $$('[data-year]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-year') === st.year)); });
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-view],[data-metric],[data-year],.kraj,[data-k],[data-clear]');
      if (!t) return;
      if (t.hasAttribute('data-view')) st.view = t.getAttribute('data-view');
      else if (t.hasAttribute('data-metric')) st.metric = t.getAttribute('data-metric');
      else if (t.hasAttribute('data-year')) st.year = t.getAttribute('data-year');
      else if (t.hasAttribute('data-clear')) st.k = null;
      else { var k = t.getAttribute('data-k'); st.k = st.k === k ? null : k; if (st.view !== 'cas') st.view = 'kraje'; }
      draw();
    });
    paths.forEach(function (p) { p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button'); p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.dispatchEvent(new MouseEvent('click', { bubbles: true })); } }); });
    root.selectKraj = function (k) { st.k = k; st.view = 'kraje'; draw(); };
    draw();
  });
  $$('[data-show-k]').forEach(function (b) {
    b.addEventListener('click', function () {
      var im = $('[data-impact]'); if (!im) return;
      im.selectKraj(b.getAttribute('data-show-k'));
      im.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  /* Směr do roku 2030: posuvník mění mapu i cíle */
  $$('[data-v30]').forEach(function (root) {
    var D = JSON.parse($('[data-v30-json]', root).textContent), paths = $$('.kraj', root), range = $('[data-range]', root), i = 0, timer = null;
    var Y = D.steps.map(function (s) { return s.y; });
    function draw() {
      var s = D.steps[i], n = 0;
      paths.forEach(function (p) {
        var y = D.cover[p.getAttribute('data-k')], on = Y.indexOf(y) <= i;
        p.classList.toggle('on', on && y !== s.y); p.classList.toggle('new', on && y === s.y && i > 0); if (on && i === 0) p.classList.add('on');
        if (on) n++;
      });
      $('[data-v-y]', root).textContent = s.y === '2025' ? 'Dnes' : 'Cíl pro rok ' + s.y;
      $('[data-v-t]', root).textContent = s.t;
      $('[data-v-d]', root).textContent = s.d;
      $('[data-v-k]', root).textContent = n;
      $('[data-v-n]', root).textContent = s.n + (i ? '+' : '');
      $('[data-v-m]', root).style.width = (n / 14 * 100) + '%';
      range.value = i;
      $$('[data-step]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-step') === i)); });
    }
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) { stop(); i = +b.getAttribute('data-step'); draw(); } });
    range.addEventListener('input', function () { stop(); i = +range.value; draw(); });
    function stop() { if (timer) { clearInterval(timer); timer = null; $('[data-play]', root).textContent = 'Přehrát celou cestu'; } }
    $('[data-play]', root).addEventListener('click', function () {
      if (timer) return stop();
      i = 0; draw(); this.textContent = 'Zastavit';
      timer = setInterval(function () { if (i >= D.steps.length - 1) return stop(); i++; draw(); }, 1400);
    });
    draw();
  });

  /* T838: vyhledávání */
  var sRoot = $('[data-search]');
  if (sRoot && window.SEARCH) {
    var sIn = $('input', sRoot), out = $('[data-results]'), sum = $('[data-summary]');
    var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var stem = function (w) { return w.length > 5 ? w.slice(0, -2) : w; };
    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var run = function () {
      var terms = norm(sIn.value.trim()).split(/\s+/).filter(Boolean).map(stem);
      if (!terms.length) { out.innerHTML = ''; sum.textContent = ''; return; }
      var hits = window.SEARCH.filter(function (p) {
        var t = norm(p.title + ' ' + p.text);
        return terms.every(function (x) { return t.indexOf(x) > -1; });
      });
      sum.textContent = hits.length ? 'Nalezeno výsledků: ' + hits.length : 'Nic jsme nenašli. Zkuste obecnější slovo, nebo nám napište.';
      out.innerHTML = hits.map(function (h) {
        return '<a class="res" href="' + esc(h.url) + '"' + (h.ext ? ' target="_blank" rel="noopener"' : '') + '><h3>' + esc(h.title) + '</h3><p>' + esc(h.text.slice(0, 160)) + ' …</p></a>';
      }).join('');
    };
    $('form', sRoot).addEventListener('submit', function (e) { e.preventDefault(); run(); });
    if (params.get('q')) { sIn.value = params.get('q'); run(); }
  }
})();
