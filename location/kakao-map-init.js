(() => {
  "use strict";

  const appKey = String(window.KAKAO_MAP_APP_KEY || "").trim();
  const fullAddress = "충남 천안시 동남구 청수14로 60 (서미법조타워) 6층";
  const addressCandidates = [
    fullAddress,
    "충남 천안시 동남구 청수14로 60 서미법조타워 6층",
    "충남 천안시 동남구 청수14로 60 서미법조타워",
    "충남 천안시 동남구 청수14로 60",
  ];

  const mapContainer = document.getElementById("map");
  if (!mapContainer) return;

  const FIXED = { lat: 36.785375913496, lng: 127.15679767986 };

  const mapLink = `https://map.kakao.com/?q=${encodeURIComponent(fullAddress)}`;

  const missingKeyHtml =
    `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.75rem;">` +
    `<div style="font-weight:700;color:var(--color-primary);">지도 설정이 필요합니다</div>` +
    `<a href="${mapLink}" target="_blank" rel="noopener" style="color:var(--color-accent);font-weight:700;">카카오맵에서 보기 →</a>` +
    `</div>`;

  const fallbackHtml =
    `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.75rem;padding:1rem;text-align:center;">` +
    `<div style="font-weight:700;color:var(--color-primary);">지도를 불러오지 못했습니다</div>` +
    `<div style="font-size:0.9rem;color:var(--color-text-muted);">카카오 개발자 콘솔에 이 사이트 도메인이 등록돼 있는지 확인해 주세요.</div>` +
    `<a href="${mapLink}" target="_blank" rel="noopener" style="color:var(--color-accent);font-weight:700;">카카오맵에서 보기 →</a>` +
    `</div>`;

  if (!appKey || appKey === "YOUR_KAKAO_MAP_APP_KEY") {
    mapContainer.innerHTML = missingKeyHtml;
    return;
  }

  mapContainer.innerHTML =
    `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.5rem;color:var(--color-text-muted);font-size:0.9rem;">지도 로딩 중…</div>`;

  let mapInstance = null;
  let markerInstance = null;
  let infowindowInstance = null;
  let loadTimeout = null;

  function showMap(coords) {
    clearTimeout(loadTimeout);
    mapContainer.innerHTML = "";
    const mapOption = { center: coords, level: 4 };
    mapInstance = new kakao.maps.Map(mapContainer, mapOption);
    markerInstance = new kakao.maps.Marker({ position: coords });
    markerInstance.setMap(mapInstance);
    const iwContent =
      `<div style="padding:8px 12px;white-space:nowrap;font-size:13px;line-height:1.45;">` +
      `<strong>픽앤매치</strong><br>` +
      `${fullAddress}` +
      `</div>`;
    infowindowInstance = new kakao.maps.InfoWindow({ content: iwContent });
    infowindowInstance.open(mapInstance, markerInstance);
    kakao.maps.event.addListener(markerInstance, "click", function () {
      infowindowInstance.open(mapInstance, markerInstance);
    });
    requestAnimationFrame(() => {
      mapInstance.relayout();
    });
    setTimeout(() => {
      mapInstance.relayout();
    }, 200);

    var onResize = function () {
      if (!mapInstance) return;
      requestAnimationFrame(function () {
        try {
          mapInstance.relayout();
        } catch (_e) {}
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
  }

  function applyGeocodeResult(coords) {
    if (!mapInstance || !markerInstance || !coords) return;
    try {
      mapInstance.setCenter(coords);
      markerInstance.setPosition(coords);
      if (infowindowInstance) {
        infowindowInstance.close();
        infowindowInstance.open(mapInstance, markerInstance);
      }
      mapInstance.relayout();
    } catch (_e) {}
  }

  function geocodeByCandidates(geocoder, idx) {
    if (idx >= addressCandidates.length) return;
    geocoder.addressSearch(addressCandidates[idx], function (result, status) {
      try {
        if (status === kakao.maps.services.Status.OK && result && result.length) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
          applyGeocodeResult(coords);
        } else {
          geocodeByCandidates(geocoder, idx + 1);
        }
      } catch (_e) {
        geocodeByCandidates(geocoder, idx + 1);
      }
    });
  }

  function onSdkReady() {
    if (typeof kakao === "undefined" || !kakao.maps) {
      mapContainer.innerHTML = fallbackHtml;
      return;
    }
    kakao.maps.load(function () {
      clearTimeout(loadTimeout);
      try {
        const fixedLatLng = new kakao.maps.LatLng(FIXED.lat, FIXED.lng);
        showMap(fixedLatLng);
        const geocoder = new kakao.maps.services.Geocoder();
        geocodeByCandidates(geocoder, 0);
      } catch (_e) {
        mapContainer.innerHTML = fallbackHtml;
      }
    });
  }

  const s = document.createElement("script");
  s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=services&autoload=false`;
  s.async = true;
  s.onerror = function () {
    clearTimeout(loadTimeout);
    mapContainer.innerHTML = fallbackHtml;
  };
  loadTimeout = setTimeout(function () {
    if (typeof kakao === "undefined" || !kakao.maps) {
      mapContainer.innerHTML = fallbackHtml;
    }
  }, 8000);
  s.onload = onSdkReady;
  document.head.appendChild(s);
})();

