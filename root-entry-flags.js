/* 루트(/) 메인 직접 로드 시 — 엔트리 스플래시 판별용 sessionStorage 만 설정 (리다이렉트 없음). script.js·구버전 root-redirect.js 와 동기화 */
(function () {
  "use strict";
  function isOurSiteReferrer(ref) {
    if (!ref) return false;
    try {
      var h = new URL(ref).hostname.replace(/^www\./i, "").toLowerCase();
      return h === "picknmatch.co.kr" || h === "localhost" || h === "127.0.0.1";
    } catch (e) {
      return false;
    }
  }
  function hasExternalCampaignParams(params) {
    if (params.get("utm_source") || params.get("utm_medium") || params.get("utm_campaign")) return true;
    if (params.get("fbclid") || params.get("gclid") || params.get("msclkid")) return true;
    return false;
  }
  function matchesExternalReferrer(ref) {
    if (!ref || isOurSiteReferrer(ref)) return false;
    return /google\.[^/]+|googleusercontent|bing\.com|naver\.com|daum\.net|kakao\.|line\.|line\.naver|facebook\.|fb\.com|l\.facebook|lm\.facebook|instagram\.|twitter\.|t\.co|\/x\.com\/|linkedin\.|threads\.|slack\.|discord\.|mail\.google|inbox\.google|outlook\.|outlook\.live|mail\.yahoo|teams\.|microsoft\.|office\.com|live\.com\/mail|web\.whatsapp|telegram\.|mzstatic\.com/i.test(
      ref
    );
  }
  try {
    var search = window.location.search || "";
    var params = new URLSearchParams(search);
    var ref = document.referrer || "";
    if (hasExternalCampaignParams(params) || matchesExternalReferrer(ref) || !ref) {
      sessionStorage.setItem("pnm_from_search_entry", "1");
    }
  } catch (e) {}
})();
