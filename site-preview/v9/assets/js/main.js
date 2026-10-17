/* 株式会社COMPLETE コーポレートサイト プロトタイプ
   - モバイルナビ開閉
   - 数字カウントアップ（IntersectionObserver）
   - スクロールリビール
*/
(function () {
  "use strict";

  /* ---- モバイルナビ ---- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (toggle && header) {
    toggle.addEventListener("click", function () {
      header.classList.toggle("open");
      var open = header.classList.contains("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---- ヒーロー画像スライダー（Ken Burns・8秒ごとにクロスフェード＝ズーム8.8秒と同期） ---- */
  var heroSlides = document.querySelectorAll(".hero-slide");
  if (heroSlides.length > 1) {
    var hs = 0;
    setInterval(function () {
      heroSlides[hs].classList.remove("is-active");
      hs = (hs + 1) % heroSlides.length;
      heroSlides[hs].classList.add("is-active");
    }, 8000);
  }

  /* ---- 数字カウントアップ ---- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var dur = 2400, start = null;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.floor(eased * target);
      var noComma = el.hasAttribute("data-nocomma");
      var fmt = function (n) { return noComma ? String(n) : n.toLocaleString("ja-JP"); };
      el.textContent = prefix + fmt(val) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + fmt(target) + suffix;
    }
    requestAnimationFrame(step);
  }

  var counts = document.querySelectorAll("[data-count]");
  var reveals = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var countObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    counts.forEach(function (el) { countObs.observe(el); });

    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { revealObs.observe(el); });
  } else {
    counts.forEach(function (el) {
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var _v = parseFloat(el.getAttribute("data-count"));
      el.textContent = prefix + (el.hasAttribute("data-nocomma") ? String(_v) : _v.toLocaleString("ja-JP")) + suffix;
    });
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- 現在の年（フッター） ---- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
