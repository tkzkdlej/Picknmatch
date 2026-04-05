/* 픽앤매치 메인 — 업무 요청 폼 (이메일 전송 + 성공 모달) */
(function () {
  "use strict";

  var form = document.getElementById("business-request-form");
  var modal = document.getElementById("business-request-success-modal");
  var modalBtn = document.getElementById("business-request-success-ok");
  if (!form || !modal) return;

  var fileInput = document.getElementById("business-request-file");
  var fileBtn = document.getElementById("business-request-file-btn");
  var fileDisplay = document.getElementById("business-request-file-display");
  var fileHint = document.getElementById("business-request-file-hint");
  var MAX_BYTES = 4 * 1024 * 1024;

  function setFileHint(name, size) {
    if (!fileHint) return;
    if (!name) {
      fileHint.textContent = "PDF, 이미지, 문서 등 · 최대 4MB";
      if (fileDisplay) fileDisplay.textContent = "선택된 파일 없음";
      return;
    }
    var kb = (size / 1024).toFixed(1);
    fileHint.textContent = "선택됨: " + name + " (" + kb + " KB)";
    if (fileDisplay) fileDisplay.textContent = name;
  }

  if (fileBtn && fileInput) {
    fileBtn.addEventListener("click", function () {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) {
        setFileHint("", 0);
        return;
      }
      if (f.size > MAX_BYTES) {
        alert("첨부 파일은 4MB 이하만 보낼 수 있습니다.");
        fileInput.value = "";
        setFileHint("", 0);
        return;
      }
      setFileHint(f.name, f.size);
    });
  }

  function openModal() {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("br-modal-open");
    if (modalBtn) modalBtn.focus();
  }

  function closeModalAndGoMain() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("br-modal-open");
    window.location.href = "/main";
  }

  if (modalBtn) {
    modalBtn.addEventListener("click", closeModalAndGoMain);
  }

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModalAndGoMain();
  });

  document.addEventListener("keydown", function (e) {
    if (!modal.hidden && e.key === "Escape") {
      closeModalAndGoMain();
    }
  });

  /** API(api/send-business-request.js)의 isValidEmail 과 동일 규칙 */
  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
  }

  /** Resend 영문 오류 → 한국어 (API와 동일 조건, 캐시·구버전 대비) */
  function formatResendErrorForUser(raw) {
    var s = String(raw || "");
    if (/testing emails|resend\.com\/domains|verify a domain|only send testing/i.test(s)) {
      return (
        "[Resend 설정] 아직 발송 도메인(picknmatch.co.kr)이 Resend에서 검증되지 않았습니다. " +
        "이 상태에서는 Resend 계정에 등록된 본인 이메일로만 테스트 발송이 가능합니다.\n\n" +
        "shkim@picknmatch.co.kr 등 다른 주소로 받으려면:\n" +
        "1) https://resend.com/domains 에서 picknmatch.co.kr DNS 검증\n" +
        "2) Vercel 환경 변수 RESEND_FROM을 검증된 도메인 주소(예: noreply@picknmatch.co.kr)로 설정\n" +
        "3) 필요 시 BUSINESS_REQUEST_TO도 함께 확인 후 재배포"
      );
    }
    return "";
  }

  function fileToAttachment(file, callback) {
    if (!file) {
      callback(null);
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = String(dataUrl).split(",")[1];
      callback({ filename: file.name, data: base64 });
    };
    reader.onerror = function () {
      callback(null);
    };
    reader.readAsDataURL(file);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var submitBtn = form.querySelector('[type="submit"]');
    var companyEl = form.elements.namedItem("company");
    var nameEl = form.elements.namedItem("name");
    var emailEl = form.elements.namedItem("email");
    var messageEl = form.elements.namedItem("message");
    var company = companyEl && companyEl.value ? companyEl.value.trim() : "";
    var name = nameEl && nameEl.value ? nameEl.value.trim() : "";
    var email = emailEl && emailEl.value ? emailEl.value.trim() : "";
    var message = messageEl && messageEl.value ? messageEl.value.trim() : "";

    if (!company || !name || !email || !message) {
      alert("회사명, 이름, 이메일, 요청 내용을 모두 입력해 주세요.");
      return;
    }

    if (!isValidEmail(email)) {
      alert("이메일 주소 형식에 맞게 입력해 주세요. (예: name@example.com)");
      if (emailEl && emailEl.focus) emailEl.focus();
      return;
    }

    var consentEl = form.elements.namedItem("privacy_consent");
    var consentOk = consentEl && consentEl.type === "checkbox" && consentEl.checked;
    if (!consentOk) {
      alert("개인정보 수집 및 이용에 동의해 주세요.");
      if (consentEl && consentEl.focus) consentEl.focus();
      return;
    }

    var file = fileInput && fileInput.files ? fileInput.files[0] : null;

    function send(attachment) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "전송 중…";
      }

      var payload = {
        company: company,
        name: name,
        email: email,
        message: message,
        privacyConsent: true,
      };
      if (attachment) payload.attachment = attachment;

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
              "이 환경에서는 메일 API(/api/send-business-request)가 없습니다. " +
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

      fetch("/api/send-business-request", {
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
              } catch (e) {
                data = null;
              }
            }
            if (!data && trimmed) {
              var ct = (r.headers.get("content-type") || "").toLowerCase();
              if (ct.indexOf("application/json") !== -1) {
                try {
                  data = JSON.parse(trimmed);
                } catch (e) {
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
            submitBtn.textContent = "업무 요청 보내기";
          }
          if (result.ok && result.data && result.data.ok) {
            form.reset();
            setFileHint("", 0);
            openModal();
            return;
          }
          var rawErr = (result.data && result.data.error) || "";
          var msg = formatResendErrorForUser(rawErr) ||
            rawErr ||
            "전송에 실패했습니다. 잠시 후 다시 시도하거나 이메일로 문의해 주세요.";
          alert(msg);
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "업무 요청 보내기";
          }
          alert("네트워크 오류로 전송하지 못했습니다.");
        });
    }

    if (file) {
      fileToAttachment(file, function (att) {
        send(att);
      });
    } else {
      send(null);
    }
  });
})();
