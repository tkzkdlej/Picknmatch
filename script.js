/* 픽앤매치 - 네비게이션 & 폼 처리 */

(function () {
  "use strict";

  /** 메인(루트 / 또는 레거시 /main)에서만: 로고 클릭 시 맨 위로 스크롤. 그 외 페이지는 홈(/)으로 이동. */
  function isMainPagePath() {
    var p = (window.location.pathname || "").replace(/\/index\.html$/i, "");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p === "/" || p === "";
  }

  /** 메인: 새로고침(F5) 시 항상 히어로 최상단 — 스크롤 복원·#해시로 인한 중간 위치 방지 */
  (function initMainReloadScrollTop() {
    if (!document.body.classList.contains("page-main")) return;
    if (!isMainPagePath()) return;

    var isReload = false;
    try {
      var navEntries = performance.getEntriesByType && performance.getEntriesByType("navigation");
      if (navEntries && navEntries.length && navEntries[0].type === "reload") {
        isReload = true;
      } else if (performance.navigation && performance.navigation.type === 1) {
        isReload = true;
      }
    } catch (err) {}

    if (!isReload) return;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }

    window.addEventListener(
      "load",
      function () {
        window.scrollTo(0, 0);
      },
      { once: true }
    );
  })();

  /**
   * 엔트리 스플래시: 메인(/) 첫 방문 시 — 검색·SNS·메신저·공유 링크·referrer 비공개 인앱 등.
   * 같은 사이트 내부 링크로만 들어온 경우는 제외. ?entry=0 이면 비표시. root-entry-flags.js 와 동기화.
   */
  function isOurSiteReferrer(ref) {
    if (!ref) return false;
    try {
      var h = new URL(ref).hostname.replace(/^www\./i, "").toLowerCase();
      return h === "picknmatch.co.kr" || h === "localhost" || h === "127.0.0.1";
    } catch (e) {
      return false;
    }
  }

  /** 공유·광고 링크에 흔한 쿼리 — referrer 없이도 유입 추적 가능 */
  function hasExternalCampaignParams(params) {
    if (params.get("utm_source") || params.get("utm_medium") || params.get("utm_campaign")) return true;
    if (params.get("fbclid") || params.get("gclid") || params.get("msclkid")) return true;
    return false;
  }

  (function initEntrySplash() {
    if (!document.body.classList.contains("page-main")) return;
    if (!isMainPagePath()) return;

    var params = new URLSearchParams(window.location.search || "");
    if (params.get("entry") === "0") return;

    var ref = document.referrer || "";
    var fromSearch = false;
    if (params.get("entry") === "1") {
      fromSearch = true;
    } else if (hasExternalCampaignParams(params)) {
      fromSearch = true;
    } else if (!ref) {
      /* 카카오·라인·기타 인앱: referrer 비공개, 공유 링크 클릭, 주소 직접 입력·북마크 첫 방문 */
      fromSearch = true;
    } else if (!isOurSiteReferrer(ref)) {
      /* 구글·네이버·외부 사이트·메신저 웹뷰 등 */
      fromSearch = true;
    } else {
      /* ref 가 우리 도메인만: 서브페이지에서 메인으로 온 내비는 스플래시 생략 */
      fromSearch = false;
    }

    /* 루트(/) 직접 유입 또는 구버전 리다이렉트 직후 — root-entry-flags.js 등에서 넘긴 플래그 */
    if (!fromSearch) {
      try {
        if (window.sessionStorage && sessionStorage.getItem("pnm_from_search_entry") === "1") {
          fromSearch = true;
          sessionStorage.removeItem("pnm_from_search_entry");
        }
      } catch (e) {}
    }

    if (!fromSearch) return;
    if (window.sessionStorage && sessionStorage.getItem("pnm_entry_splash_done") === "1") return;

    var splash = document.getElementById("entry-splash");
    if (!splash) return;

    var reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var done = false;
    function dismiss() {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", onKeyDown);
      splash.classList.add("is-leaving");
      splash.setAttribute("aria-hidden", "true");
      if (window.sessionStorage) sessionStorage.setItem("pnm_entry_splash_done", "1");

      var cleaned = false;
      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        splash.removeEventListener("transitionend", onTransitionEnd);
        document.documentElement.classList.remove("entry-splash-on");
        document.body.classList.remove("entry-splash-on");
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }

      function onTransitionEnd(e) {
        if (e.target !== splash) return;
        if (e.propertyName !== "opacity") return;
        cleanup();
      }

      splash.addEventListener("transitionend", onTransitionEnd);
      /* opacity transitionend 누락 대비(타임아웃은 실제 애니보다 넉넉히) */
      window.setTimeout(cleanup, reduced ? 900 : 2200);
    }

    function onKeyDown(e) {
      if (e.key === "Escape") dismiss();
    }

    document.documentElement.classList.add("entry-splash-on");
    document.body.classList.add("entry-splash-on");
    splash.setAttribute("aria-hidden", "false");
    splash.classList.add("is-active");
    document.addEventListener("keydown", onKeyDown);
    splash.addEventListener("click", dismiss);

    window.setTimeout(function () {
      try {
        splash.focus();
      } catch (err) {}
    }, 100);

    window.setTimeout(dismiss, reduced ? 1100 : 2600);
  })();

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

  // 모바일 네비게이션 토글 · 배경 스크롤 잠금(CSS body.is-nav-open)
  var MOBILE_NAV_MAX = 900;
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  var navOverlay = null;

  /** ≤900px: .nav 를 body 직속으로 두어 fixed 드로어가 항상 뷰포트 기준이 되게 함(헤더 containing block 이슈 방지). */
  function relocateNavForViewport() {
    var navEl = document.querySelector(".nav");
    var headerInner = document.querySelector(".header-inner");
    var toggle = document.querySelector(".nav-toggle");
    if (!navEl || !headerInner || !toggle) return;
    if (window.innerWidth <= MOBILE_NAV_MAX) {
      if (navEl.parentElement !== document.body) {
        document.body.appendChild(navEl);
      }
    } else if (navEl.parentElement === document.body) {
      headerInner.insertBefore(navEl, toggle);
    }
  }

  if (navToggle && nav) {
    navOverlay = document.createElement("div");
    navOverlay.className = "nav-overlay";
    navOverlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(navOverlay);
    navOverlay.addEventListener("click", function () {
      setNavOpen(false);
    });

    (function setupMobileNavDrawerChrome() {
      if (!nav.querySelector(".nav-drawer-scroll")) {
        var items = nav.querySelectorAll(":scope > .nav-item");
        if (items.length) {
          var scroll = document.createElement("div");
          scroll.className = "nav-drawer-scroll";
          items.forEach(function (el) {
            scroll.appendChild(el);
          });
          nav.insertBefore(scroll, nav.firstChild);
        }
      }

      var rmBrand = nav.querySelector(".nav-drawer-brand");
      if (rmBrand) {
        rmBrand.remove();
      }

      nav.querySelectorAll(".nav-item.has-dropdown").forEach(function (item) {
        var submenu = item.querySelector(":scope > ul.nav-dropdown");
        if (!submenu) return;
        if (submenu.parentElement && submenu.parentElement.classList.contains("nav-dropdown-shell")) {
          return;
        }
        var shell = document.createElement("div");
        shell.className = "nav-dropdown-shell";
        submenu.parentNode.insertBefore(shell, submenu);
        shell.appendChild(submenu);
      });

      if (nav.querySelector(".nav-drawer-meta")) return;

      var meta = document.createElement("div");
      meta.className = "nav-drawer-meta";
      meta.setAttribute("aria-hidden", "true");

      var kicker = document.createElement("p");
      kicker.className = "nav-drawer-meta__kicker";
      kicker.textContent = "Executive Search Partner";

      var lead = document.createElement("p");
      lead.className = "nav-drawer-meta__lead";
      lead.textContent = "기업 맞춤형 인재 서치 · 헤드헌팅";

      var cta = document.createElement("a");
      cta.className = "nav-drawer-meta__cta";
      cta.href = document.body.classList.contains("page-main")
        ? "#business-request-title"
        : "/#business-request-title";
      cta.textContent = document.body.classList.contains("page-main")
        ? "지금 업무 요청하기"
        : "업무 요청하기 · 홈";

      var note = document.createElement("p");
      note.className = "nav-drawer-meta__note";
      note.appendChild(document.createTextNode("빠른 연락 "));
      var tel = document.createElement("a");
      tel.href = "tel:01054041672";
      tel.textContent = "010-5404-1672";
      note.appendChild(tel);
      note.appendChild(document.createTextNode(" · "));
      var mail = document.createElement("a");
      mail.href = "mailto:shkim@picknmatch.co.kr";
      mail.textContent = "메일 문의";
      note.appendChild(mail);

      meta.appendChild(kicker);
      meta.appendChild(lead);
      meta.appendChild(cta);
      meta.appendChild(note);
      nav.appendChild(meta);
    })();

    nav.querySelectorAll(".nav-item.has-dropdown").forEach(function (item, idx) {
      var parent = item.querySelector(".nav-link--parent");
      var submenu = item.querySelector(".nav-dropdown");
      if (!parent || !submenu) return;
      var sid = "nav-mobile-dd-" + idx;
      submenu.id = submenu.id || sid;
      parent.setAttribute("role", "button");
      parent.setAttribute("aria-expanded", "false");
      parent.setAttribute("aria-controls", submenu.id);
      parent.setAttribute("tabindex", "-1");
      parent.addEventListener("click", function (e) {
        if (window.innerWidth > MOBILE_NAV_MAX) return;
        e.preventDefault();
        e.stopPropagation();
        var opening = !item.classList.contains("is-expanded");
        nav.querySelectorAll(".nav-item.has-dropdown.is-expanded").forEach(function (other) {
          if (other !== item) {
            other.classList.remove("is-expanded");
            var op = other.querySelector(".nav-link--parent");
            if (op) op.setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("is-expanded", opening);
        parent.setAttribute("aria-expanded", opening ? "true" : "false");
      });
      parent.addEventListener("keydown", function (e) {
        if (window.innerWidth > MOBILE_NAV_MAX) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          parent.click();
        }
      });
    });

    relocateNavForViewport();
  }

  function collapseNavAccordions() {
    if (!nav) return;
    nav.querySelectorAll(".nav-item.has-dropdown.is-expanded").forEach(function (item) {
      item.classList.remove("is-expanded");
      var p = item.querySelector(".nav-link--parent");
      if (p) p.setAttribute("aria-expanded", "false");
    });
  }

  function syncNavParentTabindex() {
    if (!nav) return;
    var enabled = nav.classList.contains("is-open") && window.innerWidth <= MOBILE_NAV_MAX;
    nav.querySelectorAll(".nav-link--parent").forEach(function (p) {
      p.setAttribute("tabindex", enabled ? "0" : "-1");
    });
  }

  function syncMobileNavDrawerTheme() {
    if (!nav) return;
    if (window.innerWidth > MOBILE_NAV_MAX) {
      nav.classList.remove("nav--on-dark-canvas");
      return;
    }
    var headerEl = document.querySelector(".header");
    if (!nav.classList.contains("is-open")) {
      nav.classList.remove("nav--on-dark-canvas");
      return;
    }
    var onDark =
      document.body.classList.contains("page-main") &&
      headerEl &&
      headerEl.classList.contains("header--over-hero");
    nav.classList.toggle("nav--on-dark-canvas", onDark);
  }

  function setNavOpen(open) {
    if (!nav || !navToggle) return;

    if (open) {
      collapseNavAccordions();
    }

    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("is-nav-open", open);
    navToggle.classList.toggle("is-active", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute(
      "aria-label",
      open ? "메뉴 닫기" : "메뉴 열기"
    );
    if (navOverlay) {
      navOverlay.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (open && window.innerWidth <= MOBILE_NAV_MAX) {
      void nav.offsetWidth;
    }
    syncNavParentTabindex();
    if (open) {
      var qd = document.getElementById("quick-contact-dock");
      if (qd && qd._pnmDockSheetTimer) {
        clearTimeout(qd._pnmDockSheetTimer);
        qd._pnmDockSheetTimer = null;
      }
      if (qd) {
        qd.classList.remove("is-expanded");
        document.body.classList.remove("quick-contact-dock--expanded");
        var qFab = qd.querySelector(".quick-contact-dock__fab");
        var qPanel = qd.querySelector("#quick-contact-panel");
        if (qFab) {
          qFab.setAttribute("aria-expanded", "false");
          qFab.setAttribute("aria-label", "빠른 문의 열기");
        }
        if (qPanel) {
          qPanel.setAttribute("hidden", "");
          qPanel.setAttribute("aria-hidden", "true");
        }
      }
    }
    syncMobileNavDrawerTheme();
  }

  if (navToggle && nav) {
    if (!navToggle.hasAttribute("aria-expanded")) {
      navToggle.setAttribute("aria-expanded", "false");
    }
    navToggle.addEventListener("click", function () {
      setNavOpen(!nav.classList.contains("is-open"));
    });

    document.querySelectorAll(".nav a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= MOBILE_NAV_MAX) {
          setNavOpen(false);
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setNavOpen(false);
        navToggle.focus();
      }
    });

    /* 모바일: 메뉴 영역·햄버거 버튼 밖을 터치하면 메뉴 닫기 */
    document.addEventListener(
      "pointerdown",
      function (e) {
        if (window.innerWidth > MOBILE_NAV_MAX) return;
        if (!nav.classList.contains("is-open")) return;
        var t = e.target;
        if (nav.contains(t) || navToggle.contains(t)) return;
        setNavOpen(false);
      },
      true
    );

    window.addEventListener(
      "resize",
      function () {
        if (window.innerWidth > MOBILE_NAV_MAX) {
          setNavOpen(false);
          collapseNavAccordions();
        }
        relocateNavForViewport();
        syncNavParentTabindex();
        syncMobileNavDrawerTheme();
      },
      { passive: true }
    );
  }

  // 헤더: 스크롤 시 글래스 효과 + (데스크톱) 아래 방향 스크롤 시 숨김
  (function initHeaderScroll() {
    var header = document.querySelector(".header");
    if (!header) return;

    var nav = document.querySelector(".nav");
    var headerLogo = header.querySelector(".logo img");
    var lastY = window.scrollY || document.documentElement.scrollTop || 0;
    var ticking = false;
    var minScrollForHide = 96;
    var desktopMinWidth = 901;

    var prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function syncHeaderLogo() {
      if (!headerLogo) return;
      var defaultLogo = headerLogo.getAttribute("data-logo-default");
      var overHeroLogo = headerLogo.getAttribute("data-logo-over-hero");
      if (!defaultLogo || !overHeroLogo) return;

      var nextSrc = header.classList.contains("header--over-hero")
        ? overHeroLogo
        : defaultLogo;

      if (headerLogo.getAttribute("src") !== nextSrc) {
        headerLogo.setAttribute("src", nextSrc);
      }
    }

    function updateHeaderOverHero() {
      if (!document.body.classList.contains("page-main")) {
        header.classList.remove("header--over-hero");
        syncHeaderLogo();
        return false;
      }
      var hero = document.querySelector("[data-hero-slider]");
      if (!hero) {
        header.classList.remove("header--over-hero");
        syncHeaderLogo();
        return false;
      }
      var rect = hero.getBoundingClientRect();
      var overHero = rect.bottom > 8;
      header.classList.toggle("header--over-hero", overHero);
      syncHeaderLogo();
      return overHero;
    }

    function apply() {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var overHero = updateHeaderOverHero();

      header.classList.toggle("header--elevated", y > 12 && !overHero);

      var skipHide =
        prefersReduced ||
        window.innerWidth < desktopMinWidth ||
        (nav && nav.classList.contains("is-open"));

      if (skipHide) {
        header.classList.remove("header--hidden");
      } else if (y < minScrollForHide) {
        header.classList.remove("header--hidden");
      } else if (y > lastY) {
        header.classList.add("header--hidden");
      } else if (y < lastY) {
        header.classList.remove("header--hidden");
      }

      lastY = y;
      syncMobileNavDrawerTheme();
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
    var intervalMs = 7200;
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
      if (!el) return false;
      if (el.closest(".hero-dot") || el.closest(".hero-nav")) return false;
      /* 링크·버튼 등에서는 포인터 캡처를 걸지 않음 — 걸면 앵커 클릭이 동작하지 않음 */
      if (el.closest("a[href], button, input, textarea, select, label")) return false;
      return true;
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

    var prevBtn = root.querySelector(".hero-nav--prev");
    var nextBtn = root.querySelector(".hero-nav--next");
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

  // 스크롤 등장 · 푸터 등 비즈니스 톤 모션 (prefers-reduced-motion 이면 비활성)
  (function initRevealMotion() {
    var reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    document.documentElement.classList.add("reveal");

    var targets = [];
    document.querySelectorAll("main .section, main > .page-intro, .footer-main").forEach(function (el) {
      if (el.id === "business-request" && el.classList.contains("business-request--collapsed")) return;
      targets.push(el);
    });

    function markInView(el) {
      el.classList.add("is-inview");
    }

    function syncVisible() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > -vh * 0.08) {
          markInView(el);
        }
      });
    }

    syncVisible();

    if (!window.IntersectionObserver) {
      targets.forEach(markInView);
      return;
    }

    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            markInView(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );

    targets.forEach(function (el) {
      if (!el.classList.contains("is-inview")) {
        obs.observe(el);
      }
    });
  })();

  // 빠른 문의: 우하단 단일 FAB — 탭 시 패널 토글(업무 요청·전화·메일). 스크롤 방향으로 노출.
  (function initQuickContactDock() {
    if (document.getElementById("quick-contact-dock")) return;

    var isMainForm =
      document.body.classList.contains("page-main") && isMainPagePath();
    var formHref = isMainForm ? "#business-request-title" : "/#business-request-title";

    document.body.classList.add("has-quick-contact-dock");

    var svgFabChat =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    var svgFabClose =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

    function sheetLinkRow(href, primary, title, sub, dataForm) {
      var dataAttr = dataForm ? ' data-quick-contact="form"' : "";
      return (
        '<a class="quick-contact-dock__sheet-link' +
        (primary ? " quick-contact-dock__sheet-link--primary" : "") +
        '"' +
        dataAttr +
        ' href="' +
        href +
        '">' +
        '<span class="quick-contact-dock__sheet-link-text">' +
        '<span class="quick-contact-dock__sheet-link-title">' +
        title +
        "</span>" +
        '<span class="quick-contact-dock__sheet-link-sub">' +
        sub +
        "</span></span></a>"
      );
    }

    var dock = document.createElement("aside");
    dock.id = "quick-contact-dock";
    dock.className = "quick-contact-dock";
    dock.setAttribute("aria-hidden", "true");
    dock.setAttribute("aria-label", "빠른 문의 · 업무 요청");
    dock.innerHTML =
      '<div class="quick-contact-dock__backdrop" aria-hidden="true"></div>' +
      '<div class="quick-contact-dock__anchor">' +
      '<div class="quick-contact-dock__panel" id="quick-contact-panel" role="dialog" aria-modal="true" aria-labelledby="quick-contact-panel-title" hidden>' +
      '<div class="quick-contact-dock__panel-head">' +
      '<span id="quick-contact-panel-title" class="quick-contact-dock__panel-title">빠른 문의</span></div>' +
      '<div class="quick-contact-dock__panel-body">' +
      sheetLinkRow(formHref, true, "업무 요청", "폼으로 남기기", true) +
      sheetLinkRow("tel:01054041672", false, "전화", "010-5404-1672") +
      sheetLinkRow(
        "mailto:shkim@picknmatch.co.kr?subject=%5B%ED%94%BD%EC%95%A4%EB%A7%A4%EC%B9%98%5D%20%EB%AC%B8%EC%9D%98",
        false,
        "메일",
        "shkim@picknmatch.co.kr"
      ) +
      "</div></div>" +
      '<button type="button" class="quick-contact-dock__fab" aria-expanded="false" aria-controls="quick-contact-panel" aria-haspopup="dialog" aria-label="빠른 문의 열기">' +
      '<span class="quick-contact-dock__fab-inner" aria-hidden="true">' +
      '<span class="quick-contact-dock__fab-icon quick-contact-dock__fab-icon--chat">' +
      svgFabChat +
      "</span>" +
      '<span class="quick-contact-dock__fab-icon quick-contact-dock__fab-icon--close">' +
      svgFabClose +
      "</span></span></button></div>";

    document.body.appendChild(dock);

    var backdrop = dock.querySelector(".quick-contact-dock__backdrop");
    var panel = dock.querySelector("#quick-contact-panel");
    var fab = dock.querySelector(".quick-contact-dock__fab");

    var prefersReducedDock =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var topHidePx = 100;
    var deltaPx = 6;
    var lastDockScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    var dockTick = false;

    function setSheetExpanded(exp) {
      if (exp && nav && nav.classList.contains("is-open")) {
        setNavOpen(false);
      }
      if (dock._pnmDockSheetTimer) {
        clearTimeout(dock._pnmDockSheetTimer);
        dock._pnmDockSheetTimer = null;
      }
      document.body.classList.toggle("quick-contact-dock--expanded", exp);
      if (fab) {
        fab.setAttribute("aria-expanded", exp ? "true" : "false");
        fab.setAttribute("aria-label", exp ? "빠른 문의 닫기" : "빠른 문의 열기");
      }
      if (exp) {
        if (panel) {
          panel.removeAttribute("hidden");
          panel.setAttribute("aria-hidden", "false");
        }
        dock.classList.remove("is-expanded");
        window.requestAnimationFrame(function () {
          dock.classList.add("is-expanded");
        });
      } else {
        dock.classList.remove("is-expanded");
        if (panel) {
          panel.setAttribute("aria-hidden", "true");
          dock._pnmDockSheetTimer = window.setTimeout(function () {
            dock._pnmDockSheetTimer = null;
            if (!dock.classList.contains("is-expanded")) {
              panel.setAttribute("hidden", "");
            }
          }, 600);
        }
      }
    }

    function setScrollDockOpen(open) {
      dock.classList.toggle("is-visible", open);
      /* body.quick-contact-dock-open 은 쓰지 않음 — 토글 시 main padding 이 바뀌며 PC·하단 스크롤에서 화면이 출렁임 */
      dock.setAttribute("aria-hidden", open ? "false" : "true");
      if (!open) setSheetExpanded(false);
    }

    function applyDockScroll() {
      dockTick = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;

      if (prefersReducedDock) {
        setScrollDockOpen(true);
        lastDockScrollY = y;
        return;
      }

      if (y <= topHidePx) {
        setScrollDockOpen(false);
      } else if (y > lastDockScrollY + deltaPx) {
        setScrollDockOpen(true);
      } else if (y < lastDockScrollY - deltaPx) {
        setScrollDockOpen(false);
      }

      lastDockScrollY = y;
    }

    function onDockScroll() {
      if (!dockTick) {
        window.requestAnimationFrame(function () {
          applyDockScroll();
          dockTick = false;
        });
        dockTick = true;
      }
    }

    if (fab && panel) {
      fab.addEventListener("click", function (e) {
        e.stopPropagation();
        setSheetExpanded(!dock.classList.contains("is-expanded"));
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setSheetExpanded(false);
      });
    }
    dock.querySelectorAll(".quick-contact-dock__sheet-link").forEach(function (a) {
      a.addEventListener("click", function () {
        setSheetExpanded(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!dock.classList.contains("is-expanded")) return;
      setSheetExpanded(false);
      if (fab) fab.focus();
    });

    window.addEventListener("resize", function () {
      lastDockScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setSheetExpanded(false);
      applyDockScroll();
    });

    if (prefersReducedDock) {
      setScrollDockOpen(true);
    } else {
      if (lastDockScrollY > topHidePx) {
        setScrollDockOpen(true);
      } else {
        setScrollDockOpen(false);
      }
    }

    window.addEventListener("scroll", onDockScroll, { passive: true });
  })();

  // 업무 요청: 기본 숨김 → CTA 또는 #해시로 표시 후 제목 기준 스크롤
  (function initBusinessRequestAnchorScroll() {
    if (!document.body.classList.contains("page-main") || !isMainPagePath()) return;

    var SECTION_ID = "business-request";
    var SCROLL_TARGET_ID = "business-request-title";
    var HASH_TITLE = "#business-request-title";
    var HASH_SECTION = "#business-request";
    var LEGACY_HASHES = [HASH_TITLE, HASH_SECTION];

    function headerOverlapPx() {
      var h = document.querySelector(".header");
      if (!h) return 0;
      return Math.ceil(h.getBoundingClientRect().height);
    }

    function revealBusinessRequestSection() {
      var sec = document.getElementById(SECTION_ID);
      if (!sec || !sec.classList.contains("business-request--collapsed")) return;
      sec.classList.remove("business-request--collapsed");
      sec.setAttribute("aria-hidden", "false");
      sec.classList.add("is-inview");
    }

    function scrollToTarget(smooth) {
      var el = document.getElementById(SCROLL_TARGET_ID);
      if (!el) return;
      var prefersReduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var top = el.getBoundingClientRect().top + window.pageYOffset - headerOverlapPx() - 12;
      top = Math.max(0, top);
      if (prefersReduced || !smooth) {
        window.scrollTo(0, top);
      } else {
        window.scrollTo({ top: top, behavior: "smooth" });
      }
    }

    function hashMatchesBusinessRequest() {
      var h = location.hash;
      return LEGACY_HASHES.indexOf(h) !== -1;
    }

    function applyHashScroll(smooth) {
      if (!hashMatchesBusinessRequest()) return;
      revealBusinessRequestSection();
      scrollToTarget(smooth);
    }

    document.addEventListener(
      "click",
      function (e) {
        var a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        var href = a.getAttribute("href") || "";
        if (href !== HASH_TITLE && href !== HASH_SECTION) return;
        var el = document.getElementById(SCROLL_TARGET_ID);
        if (!el) return;
        e.preventDefault();
        revealBusinessRequestSection();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            scrollToTarget(true);
            if (history.replaceState) {
              history.replaceState(null, "", HASH_TITLE);
            } else {
              location.hash = SCROLL_TARGET_ID;
            }
          });
        });
      },
      false
    );

    window.addEventListener("hashchange", function () {
      if (!hashMatchesBusinessRequest()) return;
      var smooth =
        typeof window.matchMedia !== "function" ||
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          applyHashScroll(smooth);
        });
      });
    });

    function afterPaint() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          applyHashScroll(false);
        });
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", afterPaint);
    } else {
      afterPaint();
    }
  })();

  /** 평판조회 의뢰 → /api/send-reference-request (Vercel·Resend) */
  (function initReferenceRequestForms() {
    function isValidEmail(s) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
    }

    function formatResendErrorForUser(raw) {
      var s = String(raw || "");
      if (/testing emails|resend\.com\/domains|verify a domain|only send testing/i.test(s)) {
        return (
          "[Resend 설정] 아직 발송 도메인(picknmatch.co.kr)이 Resend에서 검증되지 않았습니다. " +
          "이 상태에서는 Resend 계정에 등록된 본인 이메일로만 테스트 발송이 가능합니다.\n\n" +
          "shkim@picknmatch.co.kr 등 다른 주소로 받으려면:\n" +
          "1) https://resend.com/domains 에서 picknmatch.co.kr DNS 검증\n" +
          "2) Vercel 환경 변수 RESEND_FROM을 검증된 도메인 주소로 설정\n" +
          "3) 필요 시 REFERENCE_REQUEST_TO·BUSINESS_REQUEST_TO 확인 후 재배포"
        );
      }
      return "";
    }

    function friendlyErrorForBadBody(status, text) {
      var t = (text || "").trim();
      var host = "";
      try {
        host = window.location.hostname || "";
      } catch (e) {}
      var isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        /^192\.168\./.test(host) ||
        /^10\./.test(host);
      if (!t) {
        return "서버에서 내용 없는 응답을 받았습니다. (HTTP " + status + ")";
      }
      if (t.charAt(0) === "<" || /<!DOCTYPE/i.test(t)) {
        if (isLocal || status === 404) {
          return (
            "이 환경에서는 메일 API(/api/send-reference-request)가 없습니다. " +
            "VS Code Live Server 등으로 연 주소에서는 전송을 테스트할 수 없습니다. " +
            "Vercel에 배포된 사이트에서 시도하거나, 프로젝트 폴더에서 `npx vercel dev` 로 로컬 API를 띄운 뒤 그 주소로 열어 주세요."
          );
        }
        return "서버가 JSON 대신 HTML을 돌려주었습니다. (HTTP " + status + ") 잠시 후 다시 시도해 주세요.";
      }
      try {
        var j = JSON.parse(t);
        if (j && j.error) return j.error;
      } catch (e2) {}
      return "서버 응답을 해석할 수 없습니다. (HTTP " + status + ")";
    }

    function val(form, name) {
      var el = form.elements.namedItem(name);
      return el && "value" in el ? String(el.value || "").trim() : "";
    }

    function checked(form, name) {
      var el = form.elements.namedItem(name);
      return !!(el && el.type === "checkbox" && el.checked);
    }

    document.querySelectorAll('.request-form[data-type="reference"]').forEach(function (form) {
      var successEl = document.getElementById("reference-request-success");
      var errorEl = document.getElementById("reference-request-error");
      var submitBtn = form.querySelector('[type="submit"]');

      function hideFeedback() {
        if (successEl) {
          successEl.hidden = true;
          successEl.textContent =
            "의뢰가 접수되었습니다. 확인 후 빠른 시일 내에 연락드리겠습니다.";
        }
        if (errorEl) {
          errorEl.hidden = true;
          errorEl.textContent = "";
        }
      }

      form.addEventListener(
        "input",
        function () {
          hideFeedback();
        },
        true
      );
      form.addEventListener(
        "change",
        function () {
          hideFeedback();
        },
        true
      );

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        hideFeedback();

        var consentEl = form.elements.namedItem("privacy_consent");
        if (!consentEl || consentEl.type !== "checkbox" || !consentEl.checked) {
          alert("개인정보 수집 및 이용에 동의해 주세요.");
          if (consentEl && consentEl.focus) consentEl.focus();
          return;
        }

        var phone = val(form, "phone");
        var phoneDigits = phone.replace(/[\s\-().]/g, "");
        if (phoneDigits.length < 8) {
          alert("연락처를 올바르게 입력해 주세요.");
          var phoneInput = form.elements.namedItem("phone");
          if (phoneInput && phoneInput.focus) phoneInput.focus();
          return;
        }

        var email = val(form, "email");
        if (!isValidEmail(email)) {
          alert("유효한 이메일 주소를 입력해 주세요.");
          var emailInput = form.elements.namedItem("email");
          if (emailInput && emailInput.focus) emailInput.focus();
          return;
        }

        var scopeOk =
          checked(form, "scope_career") ||
          checked(form, "scope_reputation") ||
          checked(form, "scope_education") ||
          checked(form, "scope_legal") ||
          checked(form, "scope_other");
        if (!scopeOk) {
          alert("희망 조회 항목을 한 가지 이상 선택해 주세요.");
          return;
        }

        var payload = {
          company: val(form, "company"),
          dept: val(form, "dept"),
          name: val(form, "name"),
          contactTitle: val(form, "contact_title"),
          phone: phone,
          email: email,
          targetName: val(form, "target_name"),
          targetCompany: val(form, "target_company"),
          targetPeriod: val(form, "target_period"),
          relationship: val(form, "relationship"),
          purpose: val(form, "purpose"),
          purposeDetail: val(form, "purpose_detail"),
          deadline: val(form, "deadline"),
          additional: val(form, "additional"),
          scopeCareer: checked(form, "scope_career"),
          scopeReputation: checked(form, "scope_reputation"),
          scopeEducation: checked(form, "scope_education"),
          scopeLegal: checked(form, "scope_legal"),
          scopeOther: checked(form, "scope_other"),
          privacyConsent: true,
        };

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "전송 중…";
        }

        fetch("/api/send-reference-request", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            return r.text().then(function (text) {
              var data = null;
              var trimmed = (text || "").trim();
              if (trimmed && trimmed.charAt(0) === "{" && trimmed.charAt(trimmed.length - 1) === "}") {
                try {
                  data = JSON.parse(trimmed);
                } catch (err) {
                  data = null;
                }
              }
              if (!data && trimmed) {
                var ct = (r.headers.get("content-type") || "").toLowerCase();
                if (ct.indexOf("application/json") !== -1) {
                  try {
                    data = JSON.parse(trimmed);
                  } catch (err2) {
                    data = null;
                  }
                }
              }
              if (!data) {
                return {
                  ok: false,
                  status: r.status,
                  data: { error: friendlyErrorForBadBody(r.status, text) },
                };
              }
              return { ok: r.ok, status: r.status, data: data };
            });
          })
          .then(function (result) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "의뢰 보내기";
            }
            if (result.ok && result.data && result.data.ok) {
              form.reset();
              if (successEl) {
                successEl.hidden = false;
                successEl.focus();
                try {
                  successEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
                } catch (err) {
                  successEl.scrollIntoView(true);
                }
              }
              return;
            }
            var rawErr = (result.data && result.data.error) || "";
            var msg =
              formatResendErrorForUser(rawErr) ||
              rawErr ||
              "전송에 실패했습니다. 잠시 후 다시 시도하거나 이메일로 문의해 주세요.";
            if (errorEl) {
              errorEl.textContent = msg;
              errorEl.hidden = false;
              try {
                errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
              } catch (err) {
                errorEl.scrollIntoView(true);
              }
            } else {
              alert(msg);
            }
          })
          .catch(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "의뢰 보내기";
            }
            alert("네트워크 오류로 전송하지 못했습니다.");
          });
      });
    });
  })();

  /** 그 외 의뢰 폼(복원 시): 접수 안내만 표시 */
  document.querySelectorAll(".request-form").forEach(function (form) {
    if ((form.getAttribute("data-type") || "") === "reference") return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var type = form.getAttribute("data-type") || "문의";
      var typeNames = {
        headhunting: "헤드헌팅",
        recruitment: "채용대행",
        reference: "평판조회",
        career: "취업이직컨설팅",
        resume: "이력서등록",
      };
      var typeName = typeNames[type] || type;
      alert(typeName + " 의뢰가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.");
      form.reset();
    });
  });

  /** 메인 — 국내 뉴스 인사이트 카드 (/api/kr-news-insights) */
  (function initKrNewsInsightFeed() {
    var root = document.getElementById("insight-feed");
    var statusEl = document.getElementById("insight-feed-status");
    if (!root || !document.body.classList.contains("page-main")) return;

    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function setStatus(msg) {
      if (statusEl) statusEl.textContent = msg;
    }

    var fallbackImgSrc =
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=960&q=80";

    var chev =
      '<span class="insight-card__chev" aria-hidden="true">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
      "</span>";

    function renderError(msg) {
      root.classList.remove("insight-feed--loading");
      root.innerHTML =
        '<p class="insight-feed__error" role="alert">' + esc(msg) + "</p>";
      setStatus(msg);
    }

    function renderCards(cards) {
      var html = "";
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i] || {};
        var title = c.title || "뉴스";
        var src = (c.image && String(c.image).trim()) || "";
        var srcEsc = esc(src);
        var dateAttr = c.date && String(c.date).length >= 10 ? esc(String(c.date).slice(0, 10)) : "";
        var dateDisp = esc(c.dateDisplay || "—");
        var excerpt = esc(c.excerpt || "");
        var body = esc(c.body || c.excerpt || title);
        var url = esc(c.sourceUrl || "#");
        var cat = esc(c.category || "");

        var imgTag =
          '<img src="' +
          (src ? srcEsc : esc(fallbackImgSrc)) +
          '" width="640" height="360" alt="' +
          esc(title) +
          '" loading="lazy" decoding="async" itemprop="image"' +
          (src ? ' onerror="this.onerror=null;this.src=\'' + fallbackImgSrc + '\'"' : "") +
          " />";

        html +=
          '<article class="insight-card" role="listitem" itemscope itemtype="https://schema.org/BlogPosting">' +
          '<div class="insight-card__media">' +
          imgTag +
          "</div>" +
          '<div class="insight-card__content">' +
          '<div class="insight-card__meta">' +
          '<span class="insight-card__cat">' +
          cat +
          "</span>" +
          (dateAttr
            ? '<time datetime="' + dateAttr + '" itemprop="datePublished">' + dateDisp + "</time>"
            : "<span>" + dateDisp + "</span>") +
          "</div>" +
          '<h3 class="insight-card__title" itemprop="headline">' +
          esc(title) +
          "</h3>" +
          '<p class="insight-card__excerpt" itemprop="description">' +
          excerpt +
          "</p>" +
          '<details class="insight-card__details">' +
          '<summary class="insight-card__summary">' +
          '<span class="insight-card__summary-text">인사이트 더 보기</span>' +
          chev +
          "</summary>" +
          '<div class="insight-card__full">' +
          '<p class="insight-card__body-copy" itemprop="articleBody">' +
          body +
          "</p>" +
          '<p class="insight-card__sources">' +
          '<span class="insight-card__sources-label">원문</span>' +
          '<a href="' +
          url +
          '" rel="noopener noreferrer" target="_blank" itemprop="url">기사 전문 보기 (언론사)</a>' +
          "</p>" +
          "</div>" +
          "</details>" +
          "</div>" +
          "</article>";
      }
      root.classList.remove("insight-feed--loading");
      root.innerHTML = html;
      setStatus("국내 뉴스 " + cards.length + "건을 표시 중입니다.");
    }

    setStatus("국내 뉴스를 불러오는 중입니다.");

    fetch("/api/kr-news-insights")
      .then(function (r) {
        return r.json().catch(function () {
          return null;
        });
      })
      .then(function (data) {
        if (!data || !data.ok) {
          renderError((data && data.error) || "뉴스를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.");
          return;
        }
        var cards = data.cards || [];
        if (!cards.length) {
          renderError("표시할 국내 뉴스가 없습니다.");
          return;
        }
        renderCards(cards);
      })
      .catch(function () {
        renderError("네트워크 오류로 뉴스를 불러오지 못했습니다.");
      });
  })();
})();
