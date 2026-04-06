/* 채용핵심분야/포지션 — 카테고리 상세 다이얼로그 */
(function () {
  "use strict";

  var DIALOG_ID = "position-detail-dialog";

  /**
   * 분야별 소개·예시 기업(공식 사이트 링크, 필요 시 companies에서 url 제거 가능)
   * 이미지: Unsplash(상업 이용 가능) — 교체 시 src·alt만 수정
   */
  var POSITION_DATA = {
    chemical: {
      title: "화학",
      lead: "석유·정밀·전지 소재까지, 산업 전반을 지탱하는 화학 산업의 인재 매칭",
      paragraphs: [
        "정유·석유화학부터 정밀화학, 배터리 소재, 전자재료까지 화학은 거의 모든 제조업의 상류를 담당합니다. 공정·품질·R&D·영업·SCM 등 직무별로 요구되는 역량이 뚜렷합니다.",
        "픽앤매치는 현장 중심의 직무 이해를 바탕으로, 귀사의 사업 포트폴리오에 맞는 인재를 제안합니다.",
      ],
      companies: [
        { name: "LG화학", url: "https://www.lgchem.com" },
        { name: "롯데케미칼", url: "https://www.lottechem.com" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=1200&q=80",
        alt: "화학 실험 및 연구 환경",
      },
    },
    heavyIndustry: {
      title: "중공업",
      lead: "조선·기계·플랜트 등 대형 설비와 장비를 다루는 중공업 분야",
      paragraphs: [
        "대형 구조물·설비·엔진 등 생산·설계·건조·서비스가 얽힌 산업으로, 프로젝트 단위 업무와 안전·품질 규정 이해도가 중요합니다.",
        "현장 경험과 글로벌 수주 환경에 익숙한 인재를 중심으로 매칭을 지원합니다.",
      ],
      companies: [
        { name: "HD현대중공업", url: "https://www.hhi.co.kr" },
        { name: "두산에너빌리티", url: "https://www.doosanenerbility.com" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
        alt: "중공업·기계 설비 현장",
      },
    },
    semiconductor: {
      title: "반도체",
      lead: "파운드리·메모리·시스템반도체·장비·소재까지 이어지는 반도체 생태계",
      paragraphs: [
        "미세 공정, 수율, 제조·개발 협업이 핵심인 분야로, 공정/장비/설계/품질 등 세분 직무 이해가 필요합니다.",
        "빠르게 변하는 기술·투자 사이클에 맞춰, 실무 경험이 검증된 인재를 제안합니다.",
      ],
      companies: [
        { name: "삼성전자", url: "https://www.samsung.com/sec/" },
        { name: "SK하이닉스", url: "https://www.skhynix.com" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
        alt: "반도체·전자 기판 이미지",
      },
    },
    secondaryBattery: {
      title: "2차전지",
      lead: "셀·모듈·팩, 소재·장비까지 이차전지 밸류체인 전반",
      paragraphs: [
        "전기차·에너지 저장 수요와 함께 공정 혁신·원가·품질 경쟁이 심화되고 있습니다.",
        "양산·개발·SCM·해외 거점 등 단계별로 필요한 인재 프로필을 구분해 지원합니다.",
      ],
      companies: [
        { name: "LG에너지솔루션", url: "https://www.lgensol.com" },
        { name: "삼성SDI", url: "https://www.samsungsdi.co.kr" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1619641753168-26a487fc6220?auto=format&fit=crop&w=1200&q=80",
        alt: "배터리·에너지 저장 관련 이미지",
      },
    },
    ecoFriendly: {
      title: "친환경",
      lead: "재생에너지·탄소저감·환경 인프라 등 지속가능성 관련 산업",
      paragraphs: [
        "정책·규제·시장 요구가 함께 움직이는 분야로, 기술·사업·ESG 대응 역량이 복합적으로 요구됩니다.",
        "환경·에너지 교차 경험을 가진 인재를 중심으로 매칭 시나리오를 제안합니다.",
      ],
      companies: [
        { name: "SK이노베이션", url: "https://www.skinnovation.com" },
        { name: "한화솔루션", url: "https://www.hanwha-solutions.com" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80",
        alt: "풍력 등 친환경 에너지",
      },
    },
    energy: {
      title: "에너지",
      lead: "발전·송배전·에너지 트레이딩·신전력 등 에너지 인프라",
      paragraphs: [
        "전력 안정성·수요 관리·디지털 전력 등 전통 영역과 신사업이 공존합니다.",
        "규제·설비·운영 이해를 바탕으로 한 실무형 인재 매칭을 지원합니다.",
      ],
      companies: [
        { name: "한국전력공사", url: "https://www.kepco.co.kr" },
        { name: "한국남동발전", url: "https://www.koen.kr" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80",
        alt: "송전선·에너지 인프라",
      },
    },
    materials: {
      title: "소재·재료",
      lead: "첨단 금속·세라믹·복합재 등 소재 개발·적용 산업",
      paragraphs: [
        "자동차·전자·건설·에너지 등 응용 분야별로 요구되는 물성·공정 조건이 다릅니다.",
        "R&D·품질·생산·영업 등 직무별 깊이에 맞춰 후보를 정교화합니다.",
      ],
      companies: [
        { name: "POSCO홀딩스", url: "https://www.posco-inc.com" },
        { name: "고려아연", url: "https://www.kz.co.kr" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80",
        alt: "금속·소재 산업 이미지",
      },
    },
    defense: {
      title: "방산",
      lead: "항공우주·방위산업·첨단 시스템 등 전략 산업",
      paragraphs: [
        "품질·보안·규격·프로젝트 관리가 중요한 분야로, 이해관계자와의 협업 역량이 함께 요구됩니다.",
        "민감 정보와 무관한 공개 채용·커리어 범위에서, 직무 적합성 중심으로 지원합니다.",
      ],
      companies: [
        { name: "한화에어로스페이스", url: "https://www.hanwha.com/aerospace/" },
        { name: "LIG넥스원", url: "https://www.lignex1.com" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
        alt: "항공·방위 산업 상징 이미지",
      },
    },
    distribution: {
      title: "유통",
      lead: "물류·유통·리테일·SCM 등 공급망 전반",
      paragraphs: [
        "온·오프라인 통합, 재고·배송 최적화, 글로벌 네트워크 운영이 핵심 과제입니다.",
        "현장 운영과 데이터·IT를 아우르는 인재 매칭을 지원합니다.",
      ],
      companies: [
        { name: "CJ대한통운", url: "https://www.cjlogistics.com" },
        { name: "현대글로비스", url: "https://www.glovis.net" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
        alt: "물류·창고 이미지",
      },
    },
    construction: {
      title: "건설",
      lead: "토목·건축·플랜트·인프라 등 건설·엔지니어링",
      paragraphs: [
        "발주·설계·시공·PM·안전·품질까지 단계별 전문성이 요구되며, 프로젝트 규모가 큽니다.",
        "현장 경험과 재무·리스크 관리 감각을 함께 갖춘 인재 제안에 집중합니다.",
      ],
      companies: [
        { name: "삼성물산", url: "https://www.samsungcnt.com" },
        { name: "현대건설", url: "https://www.hdec.co.kr" },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80",
        alt: "건설 현장·크레인 이미지",
      },
    },
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openDialog(dialog, key) {
    var data = POSITION_DATA[key];
    if (!data || !dialog) return;

    var titleEl = dialog.querySelector("[data-dialog-title]");
    var leadEl = dialog.querySelector("[data-dialog-lead]");
    var contentEl = dialog.querySelector("[data-dialog-content]");
    var companiesEl = dialog.querySelector("[data-dialog-companies]");
    var imgEl = dialog.querySelector("[data-dialog-image]");
    var capEl = dialog.querySelector("[data-dialog-caption]");

    if (titleEl) titleEl.textContent = data.title;
    if (leadEl) leadEl.textContent = data.lead;

    if (contentEl) {
      contentEl.innerHTML = (data.paragraphs || [])
        .map(function (p) {
          return "<p>" + esc(p) + "</p>";
        })
        .join("");
    }

    if (companiesEl) {
      var list = data.companies || [];
      if (list.length === 0) {
        companiesEl.hidden = true;
        companiesEl.innerHTML = "";
      } else {
        companiesEl.hidden = false;
        var items = list
          .map(function (c) {
            var name = esc(c.name);
            if (c.url) {
              return (
                '<li><a href="' +
                esc(c.url) +
                '" target="_blank" rel="noopener noreferrer">' +
                name +
                "</a></li>"
              );
            }
            return "<li><span>" + name + "</span></li>";
          })
          .join("");
        companiesEl.innerHTML =
          '<h3 class="position-dialog__subhead">대표 기업 예시 <span class="position-dialog__subnote">(참고용 공개 정보)</span></h3><ul class="position-dialog__company-list">' +
          items +
          "</ul>";
      }
    }

    if (imgEl && data.image) {
      imgEl.src = data.image.src;
      imgEl.alt = data.image.alt || "";
      imgEl.closest("figure").hidden = false;
    } else if (imgEl) {
      imgEl.closest("figure").hidden = true;
    }

    if (capEl && data.image && data.image.alt) {
      capEl.textContent = data.image.alt;
      capEl.hidden = false;
    } else if (capEl) {
      capEl.hidden = true;
    }

    document.body.classList.add("position-dialog-open");

    if (typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
        return;
      } catch (err) {}
    }

    /* showModal 미지원·예외 시 네이티브 open 속성으로 표시 */
    dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    document.body.classList.remove("position-dialog-open");

    if (typeof dialog.close === "function") {
      try {
        dialog.close();
        return;
      } catch (err) {}
    }

    dialog.removeAttribute("open");
  }

  function init() {
    var dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return;

    var cards = document.querySelectorAll(".position-card[data-position]");

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        var key = card.getAttribute("data-position");
        if (key) openDialog(dialog, key);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          var key = card.getAttribute("data-position");
          if (key) openDialog(dialog, key);
        }
      });
    });

    var closeTriggers = dialog.querySelectorAll("[data-dialog-close]");
    closeTriggers.forEach(function (el) {
      el.addEventListener("click", function () {
        closeDialog(dialog);
      });
    });

    var panel = dialog.querySelector(".position-dialog__panel");
    if (panel) {
      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    dialog.addEventListener("close", function () {
      document.body.classList.remove("position-dialog-open");
    });

    dialog.addEventListener("cancel", function () {
      document.body.classList.remove("position-dialog-open");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
