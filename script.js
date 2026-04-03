/* 픽앤매치 - 네비게이션 & 폼 처리 */

(function () {
  "use strict";

  /** 메인(/main)에서만: 로고 클릭 시 맨 위로 스크롤. 그 외 페이지는 href="/main" 그대로 이동. */
  function isMainPagePath() {
    var p = (window.location.pathname || "").replace(/\/index\.html$/i, "");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p === "/main";
  }

  (function initLogoScrollToTop() {
    if (!isMainPagePath()) return;
    var logo = document.querySelector("a.logo");
    if (!logo) return;
    var prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    logo.addEventListener("click", function (e) {
      e.preventDefault();
      if (prefersReduced) {
        window.scrollTo(0, 0);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  })();

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
      if (window.innerWidth <= 768 && nav) {
        nav.classList.remove("is-open");
      }
    });
  });

  // 헤더: 스크롤 시 글래스 효과 + (데스크톱) 아래 방향 스크롤 시 숨김
  (function initHeaderScroll() {
    var header = document.querySelector(".header");
    if (!header) return;

    var nav = document.querySelector(".nav");
    var lastY = window.scrollY || document.documentElement.scrollTop || 0;
    var ticking = false;
    var minScrollForHide = 96;
    var desktopMinWidth = 901;

    var prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function updateHeaderOverHero() {
      if (!document.body.classList.contains("page-main")) {
        header.classList.remove("header--over-hero");
        return false;
      }
      var hero = document.querySelector("[data-hero-slider]");
      if (!hero) {
        header.classList.remove("header--over-hero");
        return false;
      }
      var rect = hero.getBoundingClientRect();
      var overHero = rect.bottom > 8;
      header.classList.toggle("header--over-hero", overHero);
      return overHero;
    }

    function apply() {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var overHero = updateHeaderOverHero();

      header.classList.toggle("header--elevated", y > 12 && !overHero);

      if (
        prefersReduced ||
        window.innerWidth < desktopMinWidth ||
        (nav && nav.classList.contains("is-open"))
      ) {
        header.classList.remove("header--hidden");
        lastY = y;
        return;
      }

      if (y < minScrollForHide) {
        header.classList.remove("header--hidden");
      } else if (y > lastY) {
        header.classList.add("header--hidden");
      } else if (y < lastY) {
        header.classList.remove("header--hidden");
      }

      lastY = y;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          apply();
          ticking = false;
        });
        ticking = true;
      }
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      lastY = window.scrollY || document.documentElement.scrollTop || 0;
      apply();
    });

    if (nav) {
      nav.addEventListener(
        "transitionend",
        function () {
          apply();
        },
        true
      );
    }

    var navToggle = document.querySelector(".nav-toggle");
    if (navToggle) {
      navToggle.addEventListener("click", function () {
        window.requestAnimationFrame(apply);
      });
    }
  })();

  // 메인 히어로 이미지 슬라이드 (가로 트랙 + 드래그 시 이미지가 손가락/마우스를 따라 이동)
  (function initHeroSlider() {
    var root = document.querySelector("[data-hero-slider]");
    if (!root) return;

    var heroSlides = root.querySelector(".hero-slides");
    var track = root.querySelector(".hero-slides-track");
    if (!heroSlides || !track) return;

    var slides = root.querySelectorAll(".hero-slide");
    var dots = root.querySelectorAll(".hero-dot");
    var index = 0;
    var timer = null;
    var intervalMs = 6500;
    var prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function slideWidth() {
      return heroSlides.clientWidth || 0;
    }

    function setTrackPx(offsetPx, animate) {
      if (prefersReduced) animate = false;
      root.classList.toggle("hero-slider--no-transition", !animate);
      track.style.transform = "translateX(" + offsetPx + "px)";
    }

    function goTo(i) {
      var n = slides.length;
      if (n === 0) return;
      index = ((i % n) + n) % n;
      var w = slideWidth();
      setTrackPx(-index * w, true);

      slides.forEach(function (slide, j) {
        var active = j === index;
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

    var swipeThreshold = 56;
    var dragStartX = 0;
    var dragStartY = 0;
    var swipePointerId = null;

    function swipeTargetOk(el) {
      return el && !el.closest(".hero-dot");
    }

    root.addEventListener(
      "pointerdown",
      function (e) {
        if (prefersReduced) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (!swipeTargetOk(e.target)) return;
        swipePointerId = e.pointerId;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        try {
          root.setPointerCapture(e.pointerId);
        } catch (err) {}
        stopAutoplay();
        root.classList.add("hero-slider--no-transition");
      },
      true
    );

    root.addEventListener(
      "pointermove",
      function (e) {
        if (prefersReduced) return;
        if (swipePointerId !== e.pointerId) return;
        var w = slideWidth();
        if (w <= 0) return;
        var n = slides.length;
        var dx = e.clientX - dragStartX;
        var minX = -(n - 1) * w;
        var x = -index * w + dx;
        if (x > 0) x = 0;
        if (x < minX) x = minX;
        track.style.transform = "translateX(" + x + "px)";
      },
      true
    );

    function endSwipe(e) {
      if (swipePointerId !== e.pointerId) return;
      try {
        root.releasePointerCapture(e.pointerId);
      } catch (err) {}
      swipePointerId = null;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      if (Math.abs(dx) >= swipeThreshold && Math.abs(dx) >= Math.abs(dy) * 0.85) {
        if (dx < 0) next();
        else prev();
      } else {
        goTo(index);
      }
      startAutoplay();
    }

    root.addEventListener("pointerup", endSwipe, true);
    root.addEventListener(
      "pointercancel",
      function (e) {
        if (swipePointerId !== e.pointerId) return;
        try {
          root.releasePointerCapture(e.pointerId);
        } catch (err) {}
        swipePointerId = null;
        goTo(index);
        startAutoplay();
      },
      true
    );

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

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        goTo(index);
      }, 80);
    });

    goTo(0);
    requestAnimationFrame(function () {
      goTo(index);
    });
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

