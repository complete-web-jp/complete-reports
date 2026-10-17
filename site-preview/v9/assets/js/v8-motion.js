/* 株式会社complete コーポレートサイト v8 追加分（R08_2026_09_26）
   #network が画面に入ったら .is-on を付けて、路線の線引き・拠点の点灯を1回だけ再生する。 */
(function () {
  "use strict";
  var sec = document.getElementById("network");
  if (!sec) return;
  if (!("IntersectionObserver" in window)) { sec.classList.add("is-on"); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { sec.classList.add("is-on"); io.disconnect(); }
    });
  }, { threshold: 0.35 });
  io.observe(sec);
})();
