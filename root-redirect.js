/* 레거시 /main 북마크·링크 — 루트(/)로 이동. CSP 대응 외부 파일. */
(function () {
  "use strict";
  try {
    var path = window.location.pathname || "";
    if (path === "/main" || path === "/main/") {
      window.location.replace("/" + (window.location.search || "") + (window.location.hash || ""));
    }
  } catch (e) {}
})();
