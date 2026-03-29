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

  // 메인 히어로 이미지 슬라이드
  (function initHeroSlider() {
    var root = document.querySelector("[data-hero-slider]");
    if (!root) return;

    var slides = root.querySelectorAll(".hero-slide");
    var dots = root.querySelectorAll(".hero-dot");
    var prevBtn = root.querySelector(".hero-arrow-prev");
    var nextBtn = root.querySelector(".hero-arrow-next");
    var index = 0;
    var timer = null;
    var intervalMs = 6500;
    var prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function goTo(i) {
      var n = slides.length;
      if (n === 0) return;
      index = ((i % n) + n) % n;

      slides.forEach(function (slide, j) {
        var active = j === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
        slide.querySelectorAll("a, button").forEach(function (el) {
          if (active) {
            el.removeAttribute("tabindex");
          } else {
            el.setAttribute("tabindex", "-1");
          }
        });
      });

      dots.forEach(function (dot, j) {
        var active = j === index;
        dot.classList.toggle("is-active", active);
        if (active) {
          dot.setAttribute("aria-current", "true");
          dot.setAttribute("aria-label", j + 1 + "번 슬라이드 (현재)");
        } else {
          dot.removeAttribute("aria-current");
          dot.setAttribute("aria-label", j + 1 + "번 슬라이드");
        }
      });
    }

    function next() {
      goTo(index + 1);
    }

    function prev() {
      goTo(index - 1);
    }

    function stopAutoplay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (prefersReduced || slides.length < 2) return;
      timer = setInterval(next, intervalMs);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        prev();
        startAutoplay();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        next();
        startAutoplay();
      });
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var to = parseInt(dot.getAttribute("data-slide-to"), 10);
        if (!isNaN(to)) goTo(to);
        startAutoplay();
      });
    });

    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", startAutoplay);

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
        startAutoplay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
        startAutoplay();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    goTo(0);
    startAutoplay();
  })();

  // 의뢰 폼 제출 처리 (비활성: 복원 시 주석 해제)
  // 맨 위로 스크롤
  (function initScrollTop() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scroll-top";
    btn.setAttribute("aria-label", "맨 위로");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 14h16l-8-9-8 9z"/></svg>';

    document.body.appendChild(btn);

    var threshold = 320;
    var prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      btn.classList.toggle("is-visible", y > threshold);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", function () {
      if (prefersReduced) {
        window.scrollTo(0, 0);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      btn.blur();
    });
  })();

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
