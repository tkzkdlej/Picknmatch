/* 루트(/) → /main: CSP가 인라인 스크립트를 막으므로 별도 파일로 분리 */
(function () {
  "use strict";
  try {
    var ref = document.referrer || "";
    if (/google\.[^/]+|googleusercontent|bing\.com|naver\.com|daum\.net/i.test(ref)) {
      sessionStorage.setItem("pnm_from_search_entry", "1");
    }
  } catch (e) {}
  var dest = "/main" + (window.location.search || "") + (window.location.hash || "");
  window.location.replace(dest);
})();
