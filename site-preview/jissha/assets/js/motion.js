/* 株式会社complete コーポレートサイト — motion.js（Phase4-3 共通モーション基盤）
   設計書_L2展開モーションUI_R08_2026_07_04.html 05章の共通7点のうちJS担当分：
   - B-8  スクロール進捗バー（上部オレンジ2px）
   - E-22 スクロールで縮むヘッダー（半透明白＋backdrop-blur＝ガラス質感）
   - H-44 トップへ戻るボタン（600px超で表示）
   ※ B-6 リビール／B-7 カウントアップは main.js、C-11/C-12/C-13 は CSS 側。
   prefers-reduced-motion: reduce では滑らかスクロールを無効化（CSS側でも無効化）。 */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { f(); };

  /* B-8 スクロール進捗バー */
  var bar = document.createElement("div");
  bar.id = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  /* H-44 トップへ戻る */
  var btt = document.createElement("button");
  btt.id = "back-to-top";
  btt.type = "button";
  btt.setAttribute("aria-label", "ページの先頭へ戻る");
  btt.innerHTML = "&#8593;";
  document.body.appendChild(btt);
  btt.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  /* E-22 縮むヘッダー ＋ スクロール連動まとめ（＋M-72 ヒーロー視差） */
  var header = document.querySelector(".site-header");
  var heroMedia = document.querySelector(".hero-media");
  var vh = window.innerHeight;
  window.addEventListener("resize", function () { vh = window.innerHeight; }, { passive: true });
  var ticking = false;
  function update() {
    ticking = false;
    var st = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? Math.min(st / max, 1) * 100 : 0) + "%";
    if (header) header.classList.toggle("scrolled", st > 10);
    btt.classList.toggle("show", st > 600);
    /* ヒーロー背景を控えめに視差（ファーストビュー内のみ・Ken Burnsは動画側で別系統） */
    if (heroMedia && !reduced && st < vh) {
      heroMedia.style.transform = "translate3d(0," + (st * 0.16).toFixed(1) + "px,0)";
    }
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; raf(update); }
  }, { passive: true });
  update();

  /* A-5 ヒーロー見出しの文字リビール（テキストノードのみ分解・<br>等は保持） */
  var h1 = document.querySelector(".hero h1, .page-hero h1");
  if (h1 && !reduced) {
    var idx = 0;
    function splitNode(node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split("").forEach(function (c) {
          if (c === " " || c === "\u3000") { frag.appendChild(document.createTextNode(c)); return; }
          var s = document.createElement("span");
          s.className = "ch";
          s.style.transitionDelay = Math.min(idx * 35, 1400) + "ms";
          s.textContent = c;
          idx++;
          frag.appendChild(s);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.childNodes) {
        Array.prototype.slice.call(node.childNodes).forEach(splitNode);
      }
    }
    splitNode(h1);
    raf(function () { raf(function () { h1.classList.add("play"); }); });
  }
})();
