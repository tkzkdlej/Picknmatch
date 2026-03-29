/* 픽앤매치 - 네비게이션 & 폼 처리 */

(function () {
  "use strict";

  // 모바일 네비게이션 토글
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      nav.classList.toggle("is-open");
      navToggle.setAttribute(
        "aria-label",
        nav.classList.contains("is-open") ? "메뉴 닫기" : "메뉴 열기"
      );
    });
  }

  // 모바일에서 메뉴 링크 클릭 시 메뉴 닫기
  document.querySelectorAll(".nav a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 600) {
        nav.classList.remove("is-open");
      }
    });
  });

  // 의뢰 폼 제출 처리 (비활성: 복원 시 주석 해제)
  /*
  document.querySelectorAll(".request-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var type = form.getAttribute("data-type") || "문의";
      var typeNames = {
        headhunting: "헤드헌팅",
        recruitment: "채용대행",
        reference: "평판조회",
        career: "취업이직컨설팅",
        resume: "이력서등록"
      };
      var typeName = typeNames[type] || type;
      alert(typeName + " 의뢰가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.");
      form.reset();
    });
  });
  */
})();
