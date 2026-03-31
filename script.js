/* 픽앤매치 - 네비게이션 & 폼 처리 */

(function () {
  "use strict";

  // 사이트맵 — 단일 페이지 제거, <dialog>로만 표시
  (function initSitemapDialog() {
    if (document.getElementById("sitemap-dialog")) return;

    var dialog = document.createElement("dialog");
    dialog.id = "sitemap-dialog";
    dialog.className = "sitemap-dialog";
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "sitemap-dialog-title");
    dialog.innerHTML =
      '<div class="sitemap-dialog__inner">' +
      '<header class="sitemap-dialog__header">' +
      '<h2 id="sitemap-dialog-title" class="sitemap-dialog__title">사이트맵</h2>' +
      '<button type="button" class="sitemap-dialog__close" aria-label="닫기">' +
      '<span aria-hidden="true">\u00d7</span></button>' +
      "</header>" +
      '<div class="sitemap-dialog__body">' +
      '<div class="sitemap-grid">' +
      '<div class="sitemap-col">' +
      "<h4>ABOUT US</h4>" +
      "<ul>" +
      '<li><a href="/greeting/">인사말</a></li>' +
      '<li><a href="/introduce/">회사소개</a></li>' +
      '<li><a href="/members/">MEMBERS</a></li>' +
      '<li><a href="/location/">오시는길</a></li>' +
      "</ul></div>" +
      '<div class="sitemap-col">' +
      "<h4>CLIENT</h4>" +
      "<ul>" +
      '<li><a href="/strength/">픽앤매치의 강점</a></li>' +
      '<li><a href="/headhunting/">헤드헌팅서비스</a></li>' +
      '<li><a href="/reference/">평판조회서비스</a></li>' +
      "</ul></div>" +
      '<div class="sitemap-col">' +
      "<h4>POSITION</h4>" +
      "<ul>" +
      '<li><a href="/position/">채용핵심분야/포지션</a></li>' +
      "</ul></div>" +
      '<div class="sitemap-col">' +
      "<h4>법적 고지</h4>" +
      "<ul>" +
      '<li><a href="/privacy/">개인정보처리방침</a></li>' +
      '<li><a href="/terms/">이용약관</a></li>' +
      "</ul></div>" +
      "</div></div></div>";

    document.body.appendChild(dialog);

    dialog.addEventListener("animationend", function (e) {
      if (e.target === dialog && e.animationName === "sitemap-dialog-in") {
        dialog.classList.add("sitemap-dialog--motion-done");
      }
    });

    dialog.addEventListener("close", function () {
      dialog.classList.remove("sitemap-dialog--motion-done");
    });

    var closeBtn = dialog.querySelector(".sitemap-dialog__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        dialog.close();
      });
    }

    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a || !dialog.contains(a)) return;
      var href = a.getAttribute("href") || "";
      if (href && href.charAt(0) !== "#") {
        dialog.close();
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

  // 모바일에서 메뉴 링크 클릭 시 메뉴 닫기 · SITEMAP은 다이얼로그
  document.querySelectorAll(".nav a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      if (link.classList.contains("nav-link--sitemap")) {
        e.preventDefault();
        var dlg = document.getElementById("sitemap-dialog");
        if (dlg && typeof dlg.showModal === "function") {
          dlg.showModal();
          dlg.classList.remove("sitemap-dialog--motion-done");
          requestAnimationFrame(function () {
            var closeEl = dlg.querySelector(".sitemap-dialog__close");
            if (closeEl) {
              closeEl.focus({ preventScroll: true });
            }
          });
        }
      }
      if (window.innerWidth <= 600 && nav) {
        nav.classList.remove("is-open");
      }
    });
  });

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

