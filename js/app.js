/* ═══════════════════════════════════════════════════════════════════════
   ВИТРИНА «ПЛАТИНА» — меню, калькулятор, каталог, сценарии, вопросы.

   Каталог объявлен глобальными const в data.js (или data.php на хостинге
   с PHP). const мимо window не переприсвоить, поэтому работаем с копиями:
   на адресе index.html?draft=1 вместо боевого файла подставляется черновик
   из панели управления.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var site   = typeof SITE       !== 'undefined' ? SITE       : {};
  var cats   = typeof CATEGORIES !== 'undefined' ? CATEGORIES : [];
  var offers = typeof OFFERS     !== 'undefined' ? OFFERS     : [];

  if (/[?&]draft/.test(location.search)) {
    try {
      var draftFile = localStorage.getItem('platina_admin_draft:file');
      if (draftFile) {
        var d = new Function(draftFile + '\n;return { SITE: SITE, CATEGORIES: CATEGORIES, OFFERS: OFFERS };')();
        site = d.SITE || site; cats = d.CATEGORIES || cats; offers = d.OFFERS || offers;
      }
    } catch (e) { /* битый черновик — показываем боевой каталог */ }
  }

  var live = offers.filter(function (o) { return !o.hidden; });

  /* ── мелкие помощники ─────────────────────────────────────────────── */

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Последнее число строки: «до 100 000 ₽» → 100000, «7–30 дней» → 30.
     Пробелы бывают неразрывными и тонкими — выкидываем все сразу. */
  function lastNumber(text) {
    var m = String(text == null ? '' : text)
      .replace(/[\s   ]/g, '')
      .match(/\d+/g);
    return m ? parseInt(m[m.length - 1], 10) : 0;
  }

  function initials(name) {
    return String(name || '?').trim().split(/[\s,-]+/).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function offersWord(n) { return plural(n, 'предложение', 'предложения', 'предложений'); }
  function daysWord(n)   { return plural(n, 'день', 'дня', 'дней'); }
  /* После «от» — родительный падеж: «от 91 дня», «от 14 дней». */
  function daysFrom(n)   { return (n % 10 === 1 && n % 100 !== 11) ? 'дня' : 'дней'; }

  /* Неразрывный пробел между разрядами: «100 000» не рвётся на две строки. */
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── разбор каталога ──────────────────────────────────────────────── */

  var items = live.map(function (o, i) {
    return {
      i: i,
      cat: o.cat,
      partner: o.partner || '',
      tag: o.tag || '',
      logo: o.logo || '',
      tone: o.tone || {},
      sum: o.sum || '',
      rate: o.rate || '',
      term: o.term || '',
      age: o.age || '',
      note: o.note || '',
      badges: (o.badges || []).filter(Boolean),
      url: o.url || '',
      sumMax: lastNumber(o.sum),
      termMax: lastNumber(o.term),
      zero: /(^|[^\d,.])0[\s ]*%/.test(String(o.rate || '')) ||
            (o.badges || []).some(function (b) { return /0\s*%/.test(b); })
    };
  });

  var ctaByCat = {};
  cats.forEach(function (c) { ctaByCat[c.id] = c.cta || 'Оформить'; });

  /* ── тексты сайта из панели ───────────────────────────────────────── */

  var brand = String(site.brand || '').trim();
  if (brand) {
    each('[data-brand]', function (n) { n.textContent = brand; });
    /* Знак — монета с первой буквой названия. */
    each('[data-brand-initial]', function (n) { n.textContent = brand.charAt(0).toUpperCase(); });
    document.title = brand + ' — займы онлайн: ' + items.length + ' МФО в одном списке';
    each('a.brand', function (a) { a.setAttribute('aria-label', brand + ' — на главную'); });
  }
  /* Число в начале строки над каталогом сайт ставит сам — по карточкам,
     которые реально видны: скрыли карточку в панели — число уменьшилось. */
  var tagline = document.querySelector('[data-tagline]');
  if (tagline && site.tagline) {
    tagline.textContent = String(site.tagline).replace(/^\s*\d+/, String(items.length));
  }
  var leadEl = document.querySelector('[data-lead]');
  if (leadEl && site.lead) leadEl.textContent = site.lead;
  each('[data-updated]', function (n) { if (site.updated) n.textContent = site.updated; });
  each('[data-total]', function (n) { n.textContent = String(items.length); });

  /* ── контакты владельца: поля «Telegram», «ВКонтакте», «WhatsApp», «Почта»
     в панели. Правила те же, что в panel-core.js (noUrlWhere): неверный ник,
     номер или адрес пропускаем, а не рисуем битую ссылку. ─────────────── */

  var nick = String(site.telegram || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  var vk = String(site.vk || '').trim().replace(/^https?:\/\//i, '').replace(/^(m\.)?vk\.(com|ru|me)\//i, '').replace(/^@/, '').replace(/\/$/, '');
  var wa = String(site.whatsapp || '').replace(/\D/g, '').replace(/^8(\d{10})$/, '7$1');
  var mail = String(site.email || '').trim();
  var chats = [];
  if (/^[A-Za-z0-9_]{4,32}$/.test(nick)) chats.push({ href: 'https://t.me/' + nick, name: 'Telegram', shown: '@' + nick });
  if (/^[A-Za-z0-9_.]{2,32}$/.test(vk)) chats.push({ href: 'https://vk.com/' + vk, name: 'ВКонтакте', shown: 'vk.com/' + vk });
  if (/^\d{10,15}$/.test(wa)) chats.push({ href: 'https://wa.me/' + wa, name: 'WhatsApp', shown: '+' + wa });
  var mailOk = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(mail);
  /* Куда ведёт кнопка у карточки без партнёрской ссылки: первый мессенджер
     из панели (Telegram), нет мессенджеров — почта, нет и её — «Скоро». */
  var IN = { 'Telegram': 'в Telegram', 'ВКонтакте': 'во ВКонтакте', 'WhatsApp': 'в WhatsApp' };
  var admin = chats[0] ? { href: chats[0].href, tab: true,
      tail: ', через администратора ' + IN[chats[0].name] + ' (откроется в новой вкладке)',
      note: 'Для оформления обратитесь к администратору ' + IN[chats[0].name] + '.' }
    : mailOk ? { href: 'mailto:' + mail, tab: false,
      tail: ', написать администратору на почту (откроется почтовая программа)',
      note: 'Для оформления напишите администратору на почту.' } : null;

  /* Подвал: владелец и контакты; всё пусто — блок скрыт. */
  var ownerBox = document.getElementById('owner');
  if (ownerBox) {
    var who = String(site.owner || '').trim();
    var contacts = chats.map(function (c) { return '<li><a href="' + esc(c.href) + '">' + c.name + ': ' + esc(c.shown) + '</a></li>'; });
    if (mailOk) contacts.push('<li><a href="mailto:' + esc(mail) + '">Почта: ' + esc(mail) + '</a></li>');
    ownerBox.innerHTML = (who ? '<p>Владелец сайта — ' + esc(who) + '</p>' : '') +
      (contacts.length ? '<ul class="foot__contacts" role="list">' + contacts.join('') + '</ul>' : '');
    ownerBox.hidden = !who && !contacts.length;
  }

  /* ── меню на узком экране ─────────────────────────────────────────── */

  var nav = document.querySelector('.nav');
  var navBtn = document.getElementById('nav-toggle');
  function setNav(open) {
    if (!nav || !navBtn) return;
    nav.setAttribute('data-open', open ? 'true' : 'false');
    navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (nav && navBtn) {
    navBtn.addEventListener('click', function () {
      setNav(navBtn.getAttribute('aria-expanded') !== 'true');
    });
    /* Esc закрывает меню и возвращает фокус на кнопку — но только если оно открыто. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || navBtn.getAttribute('aria-expanded') !== 'true') return;
      setNav(false);
      navBtn.focus();
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setNav(false);
    });
    var wide = window.matchMedia && window.matchMedia('(min-width: 1024px)');
    if (wide) {
      var onWide = function () { if (wide.matches) setNav(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
      else if (wide.addListener) wide.addListener(onWide);
    }
  }

  /* ── компании на витрине: первые шесть с логотипом ────────────────── */

  var partnersBox = document.getElementById('partners');
  var partnersList = document.getElementById('partners-list');
  if (partnersBox && partnersList) {
    var seen = {}, row = [];
    items.forEach(function (o) {
      if (row.length >= 6 || !o.logo || seen[o.logo]) return;
      seen[o.logo] = true;
      /* alt пустой: название стоит рядом текстом. */
      row.push('<li><img src="' + esc(o.logo) + '" alt="" width="28" height="28" loading="lazy" decoding="async">' +
        esc(o.partner) + '</li>');
    });
    if (row.length >= 3) {
      partnersList.innerHTML = row.join('');
      partnersBox.hidden = false;
    }
  }

  /* ── карточка ─────────────────────────────────────────────────────── */

  function cardHTML(o) {
    var cta = ctaByCat[o.cat] || 'Оформить';

    var logo = o.logo
      ? '<span class="card__logo"><img src="' + esc(o.logo) + '" alt="" width="40" height="40" loading="lazy" decoding="async"></span>'
      : '<span class="card__logo card__logo--text" style="background:' + esc(o.tone.bg || '#2B2742') +
        ';color:' + esc(o.tone.ink || '#FFFFFF') + '">' + esc(initials(o.partner)) + '</span>';

    var badges = o.badges.map(function (b) {
      return '<li class="chip' + (/0\s*%/.test(b) ? ' chip--zero' : '') + '">' + esc(b) + '</li>';
    }).join('');

    /* Видимая надпись на всех кнопках одна и та же, поэтому к ней дописано
       скрытое продолжение с названием компании: иначе в списке ссылок
       скринридера получилось бы два десятка одинаковых строк. Видимый текст
       стоит в начале имени дословно — голосовое управление его находит. */
    var go = o.url
      ? '<p class="card__go"><a class="btn btn--wide" href="' + esc(o.url) + '" target="_blank" ' +
        'rel="noopener sponsored nofollow">' + esc(cta) +
        '<span class="vh"> в МФО «' + esc(o.partner) + '», откроется в новой вкладке</span>' +
        '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-ext"/></svg></a></p>'
      /* Ссылки нет, но владелец оставил контакт: кнопка ведёт к нему, а под
         ней написано словами, куда именно. */
      : admin
      ? '<p class="card__go"><a class="btn btn--wide" href="' + esc(admin.href) + '"' +
        (admin.tab ? ' target="_blank" rel="noopener"' : '') + '>' + esc(cta) +
        '<span class="vh"> — ' + esc(o.partner) + admin.tail + '</span>' +
        (admin.tab ? '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-ext"/></svg>' : '') + '</a></p>' +
        '<p class="card__via">' + admin.note + '</p>'
      /* Ни ссылки, ни контактов — кнопки нет вовсе: нажимать нечего, значит и
         фокусировать нечего. Недоступность передана словом, а не серым цветом. */
      : '<p class="card__soon"><span class="card__badge">Скоро</span>' +
        'Оформление через витрину появится в ближайшее время.</p>';

    return '' +
      '<li><article class="card' + (o.url || admin ? '' : ' card--soon') + '" aria-labelledby="o' + o.i + '-name">' +
        '<div class="card__head">' + logo +
          '<span class="card__name">' +
            '<h3 class="card__partner" id="o' + o.i + '-name">' + esc(o.partner) + '</h3>' +
            (o.tag ? '<span class="card__tag">' + esc(o.tag) + '</span>' : '') +
          '</span>' +
        '</div>' +
        '<dl class="card__specs">' +
          '<div class="spec spec--lead"><dt>Сумма</dt><dd>' + esc(o.sum) + '</dd></div>' +
          '<div class="spec"><dt>Ставка</dt><dd>' + esc(o.rate) + '</dd></div>' +
          '<div class="spec"><dt>Срок</dt><dd>' + esc(o.term) + '</dd></div>' +
          (o.age ? '<div class="spec"><dt>Возраст</dt><dd>' + esc(o.age) + '</dd></div>' : '') +
        '</dl>' +
        (badges ? '<ul class="card__chips" role="list">' + badges + '</ul>' : '') +
        (o.note ? '<p class="card__note">' + esc(o.note) + '</p>' : '') +
        go +
      '</article></li>';
  }

  /* ── состояние фильтров ───────────────────────────────────────────── */

  var listBox   = document.getElementById('cards');
  var countBox  = document.getElementById('catalog-count');
  var emptyBox  = document.getElementById('catalog-empty');
  var sumInput  = document.getElementById('f-sum');
  var termInput = document.getElementById('f-term');
  var sumNum    = document.getElementById('f-sum-num');
  var termNum   = document.getElementById('f-term-num');
  var sortSel   = document.getElementById('f-sort');
  var pickCount = document.getElementById('pick-count');
  var pickBtn   = document.getElementById('pick-go');
  var pickWord  = document.querySelector('[data-pick-n]');
  var pickLogos = document.getElementById('pick-logos');
  var chipsBox  = document.getElementById('f-chips');

  if (!listBox) return;

  /* По умолчанию — порядок карточек из панели: клиент сам решает, кто выше.
     caseName — название сценария, пока человек не тронул фильтры сам. */
  var state = { sum: 0, term: 0, badges: [], sort: 'order', caseName: '' };

  function matches(o) {
    if (state.sum && o.sumMax < state.sum) return false;
    if (state.term && o.termMax < state.term) return false;
    for (var i = 0; i < state.badges.length; i++) {
      if (o.badges.indexOf(state.badges[i]) === -1) return false;
    }
    return true;
  }

  /* Карточки без ссылки — всегда в конце: оформить там пока нечего. */
  function linkedFirst(a, b) { return (b.url ? 1 : 0) - (a.url ? 1 : 0); }

  function sorted(list) {
    var l = list.slice();
    if (state.sort === 'order') l.sort(function (a, b) { return linkedFirst(a, b) || a.i - b.i; });
    if (state.sort === 'sum')  l.sort(function (a, b) { return linkedFirst(a, b) || b.sumMax - a.sumMax || a.partner.localeCompare(b.partner, 'ru'); });
    if (state.sort === 'term') l.sort(function (a, b) { return linkedFirst(a, b) || b.termMax - a.termMax || a.partner.localeCompare(b.partner, 'ru'); });
    if (state.sort === 'zero') l.sort(function (a, b) { return linkedFirst(a, b) || (b.zero ? 1 : 0) - (a.zero ? 1 : 0) || b.sumMax - a.sumMax; });
    if (state.sort === 'name') l.sort(function (a, b) { return linkedFirst(a, b) || a.partner.localeCompare(b.partner, 'ru'); });
    return l;
  }

  /* Строка статуса: число и — если фильтры не пустые — условия словами.
     Её видят все: калькулятор стоит выше каталога, и без подписи непонятно,
     почему список сократился. */
  function statusText(n) {
    var text = n + ' ' + offersWord(n) + (n === items.length ? '' : ' из ' + items.length);
    var parts = [];
    var sumMin = sumInput ? parseInt(sumInput.min, 10) : 0;
    var termMin = termInput ? parseInt(termInput.min, 10) : 0;
    if (state.sum > sumMin) parts.push('сумма от ' + money(state.sum) + ' ₽');
    if (state.term > termMin) parts.push('срок от ' + state.term + ' ' + daysFrom(state.term));
    state.badges.forEach(function (b) { parts.push('«' + b + '»'); });
    if (parts.length) text += ' — ' + parts.join(', ');
    if (state.caseName) text = 'Сценарий «' + state.caseName + '»: ' + text;
    return text;
  }

  /* Число на экране меняется сразу, а вслух объявляется с задержкой:
     ползунок шлёт событие на каждый шаг, и без паузы скринридер читал бы
     каждое промежуточное значение. Узел сначала очищается — иначе при том
     же числе текст не изменится и объявления не будет вовсе. */
  var sayTimer = 0;
  function announce(n) {
    if (!countBox) return;
    clearTimeout(sayTimer);
    var text = statusText(n);
    sayTimer = setTimeout(function () {
      countBox.textContent = '';
      setTimeout(function () { countBox.textContent = text; }, 30);
    }, 450);
  }

  function render() {
    var list = sorted(items.filter(matches));

    /* Фокус мог стоять на кнопке внутри карточки, которую сейчас снесёт
       перерисовка. Запоминаем, куда его потом вернуть. */
    var act = document.activeElement;
    var inList = act && listBox.contains(act);

    listBox.innerHTML = list.map(cardHTML).join('');
    if (emptyBox) emptyBox.hidden = list.length > 0;

    if (inList && !document.contains(act)) {
      var first = listBox.querySelector('a.btn');
      (first || document.getElementById('catalog')).focus({ preventScroll: true });
    }

    if (pickCount) pickCount.textContent = list.length;
    if (pickLogos) {
      /* Пять первых подходящих компаний с логотипом — картинки, без текста
         для скринридера: число и сам список рядом. */
      var withLogo = list.filter(function (o) { return o.logo; }).slice(0, 5);
      pickLogos.innerHTML = withLogo.map(function (o) {
        return '<li><img src="' + esc(o.logo) + '" alt="" width="28" height="28" decoding="async"></li>';
      }).join('');
      var rest = list.length - withLogo.length;
      if (rest > 0 && withLogo.length) pickLogos.insertAdjacentHTML('beforeend', '<li class="picker__more">+' + rest + '</li>');
    }
    if (pickWord) pickWord.textContent = list.length + ' ' + offersWord(list.length);
    announce(list.length);

    if (!reduced) {
      /* Лёгкий каскад появления. Класс ставит скрипт, а не таблица стилей:
         если бы стартовая прозрачность жила в CSS, при сбое скрипта список
         остался бы невидимым навсегда. */
      Array.prototype.forEach.call(listBox.children, function (li, n) {
        li.style.animationDelay = Math.min(n, 12) * 26 + 'ms';
        li.classList.add('card--in');
      });
    }
  }

  /* ── ползунки и парные числовые поля ──────────────────────────────── */

  function clamp(v, input) {
    var min = parseInt(input.min, 10), max = parseInt(input.max, 10);
    return Math.min(max, Math.max(min, v));
  }

  /* Заполненная часть дорожки — от края до бегунка. */
  function fill(input) {
    var min = parseFloat(input.min), max = parseFloat(input.max), v = parseFloat(input.value);
    input.style.setProperty('--p', ((v - min) / (max - min) * 100).toFixed(2) + '%');
  }

  function syncSum(fromField, quiet) {
    state.sum = parseInt(sumInput.value, 10) || 0;
    fill(sumInput);
    /* Для голоса — голые цифры: «15 000» с пробелом читается как «15» и
       «ноль-ноль-ноль», а видимая надпись остаётся с разделителем. */
    sumInput.setAttribute('aria-valuetext', state.sum + ' рублей');
    if (sumNum && !fromField) sumNum.value = money(state.sum);
    if (!quiet) render();
  }

  function syncTerm(fromField, quiet) {
    state.term = parseInt(termInput.value, 10) || 0;
    fill(termInput);
    termInput.setAttribute('aria-valuetext', state.term + ' ' + daysWord(state.term));
    if (termNum && !fromField) termNum.value = String(state.term);
    if (!quiet) render();
  }

  /* Человек тронул фильтры сам — подпись сценария больше не к месту. */
  function manual() { state.caseName = ''; }

  if (sumInput) sumInput.addEventListener('input', function () { manual(); syncSum(false); });
  if (termInput) termInput.addEventListener('input', function () { manual(); syncTerm(false); });

  /* Поле принимает «50000», «50 000» и «50 000 ₽» — всё, что человек
     реально печатает. Округляем к шагу ползунка, чтобы они не разъезжались. */
  function fieldToRange(field, input, sync) {
    if (!field || !input) return;
    field.addEventListener('input', function () {
      var digits = field.value.replace(/[^\d]/g, '');
      if (!digits) return;
      var step = parseInt(input.step, 10) || 1;
      var v = clamp(Math.round(parseInt(digits, 10) / step) * step, input);
      input.value = String(v);
      manual();
      sync(true);
    });
    field.addEventListener('blur', function () {
      var v = parseInt(input.value, 10);
      field.value = input === sumInput ? money(v) : String(v);
    });
  }
  fieldToRange(sumNum, sumInput, syncSum);
  fieldToRange(termNum, termInput, syncTerm);

  /* Enter в числовом поле не должен перезагружать страницу. */
  var pickerForm = document.getElementById('picker');
  if (pickerForm) pickerForm.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ── фильтры-чекбоксы из плашек каталога ──────────────────────────── */

  if (chipsBox) {
    var counts = {};
    items.forEach(function (o) {
      o.badges.forEach(function (b) { counts[b] = (counts[b] || 0) + 1; });
    });
    var top = Object.keys(counts)
      .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b, 'ru'); })
      .slice(0, 6);

    /* Состояние держит сам браузер: перерисовки чипов нет, значит нечему
       разъехаться с разметкой. */
    chipsBox.insertAdjacentHTML('beforeend', top.map(function (b, n) {
      var id = 'f-chip-' + n;
      return '<span class="chipbox">' +
        '<input class="chipbox__input" type="checkbox" id="' + id + '" value="' + esc(b) + '">' +
        '<label class="chipbox__label" for="' + id + '">' + esc(b) +
        '<span class="chipbox__n">' + counts[b] + '</span>' +
        '<span class="vh"> ' + offersWord(counts[b]) + '</span></label></span>';
    }).join(''));
    if (!top.length) chipsBox.hidden = true;

    chipsBox.addEventListener('change', function (e) {
      var box = e.target.closest('.chipbox__input');
      if (!box) return;
      if (box.checked) state.badges.push(box.value);
      else state.badges = state.badges.filter(function (b) { return b !== box.value; });
      manual();
      render();
    });
  }

  if (sortSel) {
    sortSel.addEventListener('change', function () {
      state.sort = sortSel.value;
      render();
    });
  }

  function clearFilters() {
    state.badges = [];
    state.sort = 'order';
    state.caseName = '';
    if (sortSel) sortSel.value = 'order';
    each('.chipbox__input:checked', function (b) { b.checked = false; });
    if (sumInput) { sumInput.value = sumInput.min; syncSum(false, true); }
    if (termInput) { termInput.value = termInput.min; syncTerm(false, true); }
  }

  function resetAll() { clearFilters(); render(); }

  each('#f-reset, [data-reset]', function (b) { b.addEventListener('click', resetAll); });

  /* ── переход к каталогу вместе с фокусом ──────────────────────────── */

  /* jump — сразу, без плавной прокрутки: из «Сценариев» до каталога несколько
     экранов, а список по дороге ещё и меняет высоту. */
  function goCatalog(jump) {
    var target = document.getElementById('catalog');
    var title = document.getElementById('catalog-title');
    if (!target) return;
    target.scrollIntoView({ behavior: (reduced || jump === true) ? 'auto' : 'smooth', block: 'start' });
    (title || target).focus({ preventScroll: true });
  }

  if (pickBtn) pickBtn.addEventListener('click', function () { goCatalog(false); });

  /* ── сценарии: кнопка ставит настоящие фильтры каталога ───────────── */

  var CASES = {
    payday: { name: 'До зарплаты', sum: 15000, term: 14, badge: 'На карту' },
    big:    { name: 'Крупная сумма надолго', sum: 50000, term: 90 },
    zero:   { name: 'Первый займ без процентов', badgeTest: /0\s*%/ }
  };

  function snap(v, input) {
    var step = parseInt(input.step, 10) || 1;
    return clamp(Math.ceil(v / step) * step, input);
  }

  each('[data-case]', function (btn) {
    btn.addEventListener('click', function () {
      var c = CASES[btn.getAttribute('data-case')];
      if (!c) return;
      clearFilters();
      if (c.sum && sumInput) { sumInput.value = String(snap(c.sum, sumInput)); syncSum(false, true); }
      if (c.term && termInput) { termInput.value = String(snap(c.term, termInput)); syncTerm(false, true); }
      /* Плашку включаем, только если такая кнопка-фильтр есть на странице:
         клиент мог переименовать её в панели. */
      each('.chipbox__input', function (box) {
        var hit = c.badge ? box.value === c.badge : (c.badgeTest ? c.badgeTest.test(box.value) : false);
        if (hit && state.badges.indexOf(box.value) === -1) { box.checked = true; state.badges.push(box.value); }
      });
      state.caseName = c.name;
      render();
      goCatalog(true);
    });
  });

  /* Любая ссылка-якорь переносит фокус, а не только прокручивает экран:
     иначе следующий Tab возвращал бы человека в шапку. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var t = document.getElementById(id);
    if (!t) return;
    var done = false;
    var move = function () { if (!done) { done = true; t.focus({ preventScroll: true }); } };
    /* rAF с запасным таймером: в скрытой вкладке кадры не приходят. */
    requestAnimationFrame(move);
    setTimeout(move, 60);
  });

  /* ── вопросы и ответы ─────────────────────────────────────────────── */

  each('.faq__q', function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      var body = document.getElementById(btn.getAttribute('aria-controls'));
      if (body) body.hidden = open;
    });
  });

  /* ── появление блоков при прокрутке ───────────────────────────────── */

  /* Стартовую прозрачность ставит скрипт и только когда уверен, что сможет
     её снять: вкладка видима, наблюдатель есть, движение не отключено.
     Блок, попавший в фокус с клавиатуры, показывается сразу. */
  if (!reduced && 'IntersectionObserver' in window && document.visibilityState === 'visible') {
    var vh = window.innerHeight || 800;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    each('[data-reveal]', function (n) {
      if (n.getBoundingClientRect().top < vh * 0.92) return;   /* уже на экране — не прячем */
      n.classList.add('reveal');
      io.observe(n);
    });
    document.addEventListener('focusin', function (e) {
      var box = e.target.closest && e.target.closest('.reveal:not(.is-in)');
      if (box) { box.classList.add('is-in'); io.unobserve(box); }
    });
    /* Страховка: если наблюдатель так и не сработал (вкладку свернули),
       через 4 с открываем всё, что успели спрятать. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') each('.reveal:not(.is-in)', function (n) { n.classList.add('is-in'); });
    });
  }

  /* ── старт ────────────────────────────────────────────────────────── */

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (sumInput) syncSum(false, true);
  if (termInput) syncTerm(false, true);
  render();
  /* Первое число — это состояние страницы, а не новость: пишем его сразу,
     без отложенного объявления. */
  if (countBox) {
    clearTimeout(sayTimer);
    countBox.textContent = statusText(listBox.children.length);
  }
})();
