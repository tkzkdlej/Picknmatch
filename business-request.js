/* 픽앤매치 메인 — 업무 요청 폼 (이메일 전송 + 성공 모달) */
(function () {
  "use strict";

  var form = document.getElementById("business-request-form");
  var modal = document.getElementById("business-request-success-modal");
  var modalBtn = document.getElementById("business-request-success-ok");
  if (!form || !modal) return;

  var fileInput = document.getElementById("business-request-file");
  var fileHint = document.getElementById("business-request-file-hint");
  var MAX_BYTES = 4 * 1024 * 1024;

  function setFileHint(name, size) {
    if (!fileHint) return;
    if (!name) {
      fileHint.textContent = "선택된 파일 없음 · PDF, 이미지, 문서 등 (최대 4MB)";
      return;
    }
    var kb = (size / 1024).toFixed(1);
    fileHint.textContent = "선택됨: " + name + " (" + kb + " KB)";
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

    var file = fileInput && fileInput.files ? fileInput.files[0] : null;

    function send(attachment) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "전송 중…";
      }

      var payload = { company: company, name: name, email: email, message: message };
      if (attachment) payload.attachment = attachment;

      fetch("/api/send-business-request", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().then(
            function (data) {
              return { ok: r.ok, status: r.status, data: data };
            },
            function () {
              return { ok: false, status: r.status, data: { error: "서버 응답을 해석할 수 없습니다." } };
            }
          );
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
          var msg =
            (result.data && result.data.error) ||
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
