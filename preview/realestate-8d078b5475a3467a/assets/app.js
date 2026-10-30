/* ゆきあかり不動産 共通スクリプト（素のJS・外部ライブラリなし・R08_2026_10_31） */
(function () {
  'use strict';

  /* ── 問い合わせの受け口（Googleフォーム） ──
     ACTION を空にすると送信せず「準備中」と表示する（安全装置）。 */
  var FORM = {
    // 〈作業中〉フォーム_ゆきあかり不動産_問い合わせ_R08_2026_10_31（12_不動産事業部）→ 回答は同じ棚の〈作業中〉回答_… へ
    ACTION: 'https://docs.google.com/forms/d/e/1FAIpQLSduFwmLY-Kol0kDLrl5ZEsPt_YrlJh8sLFCq8MjRdizDGQ2XA/formResponse',
    ENTRY: {
      kind: 'entry.1126712273', // 種類
      name: 'entry.982550734',  // お名前
      tel: 'entry.616084711',   // 電話番号
      mail: 'entry.384595887',  // メールアドレス
      date: 'entry.1426673067', // ご希望日
      memo: 'entry.1176889611', // ご希望の条件・ご質問
      page: 'entry.103907851'   // 送信元ページ
    }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* スマホのメニュー */
  var menuBtn = $('.menu-btn');
  var mnav = $('#mnav');
  if (menuBtn && mnav) {
    var setMenu = function (open) {
      mnav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('.menu-label', menuBtn).textContent = open ? '閉じる' : 'メニュー';
    };
    menuBtn.addEventListener('click', function () { setMenu(!mnav.classList.contains('open')); });
    $all('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* 物件検索：探し方の切り替え */
  var SEARCH = {
    area: { label: 'エリア', options: ['すべての区', '中央区', '北区', '東区', '白石区', '厚別区', '豊平区', '清田区', '南区', '西区', '手稲区'] },
    line: { label: '沿線', options: ['すべての沿線', '地下鉄南北線', '地下鉄東西線', '地下鉄東豊線', '市電', 'JR函館本線', 'JR千歳線', 'JR札沼線（学園都市線）'] },
    school: { label: '通勤・通学先', options: ['札幌駅周辺', '大通・すすきの', '北海道大学', '札幌市立大学', 'その他（ご相談ください）'] }
  };
  var firstSel = $('#s-first');
  $all('[data-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = SEARCH[btn.getAttribute('data-mode')];
      $all('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      if (!firstSel || !m) return;
      $('#s-first-label').textContent = m.label;
      firstSel.innerHTML = '';
      m.options.forEach(function (o) { var op = document.createElement('option'); op.textContent = o; firstSel.appendChild(op); });
    });
  });
  var searchForm = $('#search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // 物件システム連携までは一覧ページへ条件を渡すだけ（一覧側で表示）
      var q = new URLSearchParams(new FormData(searchForm)).toString();
      location.href = searchForm.getAttribute('action') + '?' + q;
    });
  }

  /* 初期費用の目安 */
  var cost = $('#cost-form');
  if (cost) {
    var ASSUME = { guaranteeRate: 0.5, insurance: 20000, key: 15000 }; // 仮の目安（保証会社・保険が決まったら差し替え）
    var yen = function (n) { return Math.round(n).toLocaleString('ja-JP'); };
    var num = function (v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
    var calc = function () {
      var rent = num($('#c-rent').value);
      var monthly = rent + num($('#c-fee').value);
      var shiki = Number($('#c-shiki').value), rei = Number($('#c-rei').value);
      var rows = [
        ['敷金', '家賃 × ' + shiki + 'か月', rent * shiki],
        ['礼金', '家賃 × ' + rei + 'か月', rent * rei],
        ['仲介手数料', '当店は0円', 0],
        ['前家賃', '家賃＋管理費の1か月分', monthly],
        ['保証料', '目安：家賃＋管理費の50%', monthly * ASSUME.guaranteeRate],
        ['火災保険料', '目安：2年分', ASSUME.insurance],
        ['鍵交換代', '目安', ASSUME.key]
      ];
      var total = 0, html = '';
      rows.forEach(function (r) {
        total += r[2];
        html += '<tr><th scope="row">' + r[0] + '<small>' + r[1] + '</small></th><td>' + yen(r[2]) + ' 円</td></tr>';
      });
      $('#cost-rows').innerHTML = html;
      $('#cost-total').textContent = '約 ' + yen(total) + ' 円';
      $('#cost-saved').textContent = yen(rent * 1.1);
    };
    $all('input,select', cost).forEach(function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
    cost.addEventListener('submit', function (e) { e.preventDefault(); });
    calc();
  }

  /* 問い合わせフォーム */
  $all('form.cform').forEach(function (form) {
    var kindInput = $('input[name="kind"]', form);
    var dateRow = $('.date-row', form);
    var submitBtn = $('button[type="submit"]', form);
    var err = $('.form-error', form);
    var done = form.parentNode.querySelector('.form-done');
    var setKind = function (id) {
      if (!$('[data-kind="' + id + '"]', form)) return; // このページのフォームに無い種類は無視
      $all('[data-kind]', form).forEach(function (c) {
        var on = c.getAttribute('data-kind') === id;
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) { kindInput.value = c.textContent.trim(); submitBtn.textContent = c.getAttribute('data-submit'); }
      });
      if (dateRow) dateRow.hidden = !(id === 'visit' || id === 'online');
    };
    $all('[data-kind]', form).forEach(function (c) { c.addEventListener('click', function () { setKind(c.getAttribute('data-kind')); }); });
    $all('[data-pick-kind]').forEach(function (a) { a.addEventListener('click', function () { setKind(a.getAttribute('data-pick-kind')); }); });
    var first = $('[data-kind]', form);
    if (first) setKind(first.getAttribute('data-kind'));

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.textContent = '';
      var name = form.elements.name.value.trim();
      var tel = form.elements.tel.value.trim();
      var mail = form.elements.mail.value.trim();
      if (!name) { err.textContent = 'お名前をご記入ください。'; form.elements.name.focus(); return; }
      if (!tel && !mail) { err.textContent = '電話番号かメールアドレスのどちらかをご記入ください。'; form.elements.tel.focus(); return; }
      if (mail && !form.elements.mail.checkValidity()) { err.textContent = 'メールアドレスの形をご確認ください。'; form.elements.mail.focus(); return; }
      if (!form.elements.agree.checked) { err.textContent = 'プライバシーポリシーへの同意にチェックをお願いします。'; form.elements.agree.focus(); return; }
      if (!FORM.ACTION) { err.textContent = '（公開前の確認用）送信の受け口はまだ準備中です。'; return; }

      var body = new URLSearchParams();
      body.append(FORM.ENTRY.kind, kindInput.value);
      body.append(FORM.ENTRY.name, name);
      body.append(FORM.ENTRY.tel, tel);
      body.append(FORM.ENTRY.mail, mail);
      if (form.elements.date) body.append(FORM.ENTRY.date, form.elements.date.value);
      body.append(FORM.ENTRY.memo, form.elements.memo.value);
      body.append(FORM.ENTRY.page, form.getAttribute('data-page') || location.pathname);
      submitBtn.disabled = true;
      fetch(FORM.ACTION, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () { form.hidden = true; if (done) { done.classList.add('show'); done.focus(); } })
        .catch(function () { submitBtn.disabled = false; err.textContent = '送信できませんでした。お手数ですがお電話かLINEでご連絡ください。'; });
    });
  });
})();
