/**
 * 평판조회 의뢰 폼 → 이메일 (Vercel Serverless + Resend)
 *
 * Vercel 환경 변수: RESEND_API_KEY, RESEND_FROM
 * 수신: REFERENCE_REQUEST_TO (없으면 BUSINESS_REQUEST_TO, 그다음 shkim@picknmatch.co.kr)
 */

const { Resend } = require("resend");

var MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var total = 0;
    req.on("data", function (c) {
      total += c.length;
      if (total <= MAX_JSON_BODY_BYTES) chunks.push(c);
    });
    req.on("end", function () {
      if (total > MAX_JSON_BODY_BYTES) {
        return resolve(null);
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function stripSmtpHeaderBreaks(s) {
  return String(s || "")
    .replace(/[\r\n\x00\x1a]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

function parseFromEnvelopeAddress(envFrom) {
  var s = String(envFrom || "").trim();
  var m = s.match(/<([^>]+)>/);
  if (m) return m[1].trim();
  if (/^[^\s@]+@[^\s@]+$/.test(s)) return s;
  return "onboarding@resend.dev";
}

function escapeDisplayName(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeResendErrorMessage(raw) {
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
  return s;
}

function trimLen(s, max) {
  var t = String(s || "").trim();
  if (t.length > max) return t.slice(0, max);
  return t;
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "메일 서버가 설정되지 않았습니다. RESEND_API_KEY를 설정해 주세요.",
    });
  }

  var raw;
  try {
    raw = await readBody(req);
  } catch (e) {
    return res.status(400).json({ ok: false, error: "본문을 읽을 수 없습니다." });
  }
  if (raw === null) {
    return res.status(413).json({ ok: false, error: "요청 본문이 허용 크기를 초과했습니다." });
  }

  var body;
  try {
    body = JSON.parse(raw || "{}");
  } catch (e) {
    return res.status(400).json({ ok: false, error: "JSON 형식이 올바르지 않습니다." });
  }

  var company = trimLen(body.company, 160);
  var dept = trimLen(body.dept, 120);
  var name = trimLen(body.name, 120);
  var contactTitle = trimLen(body.contactTitle, 120);
  var phone = trimLen(body.phone, 40);
  var email = trimLen(body.email, 200);
  var targetName = trimLen(body.targetName, 120);
  var targetCompany = trimLen(body.targetCompany, 200);
  var targetPeriod = trimLen(body.targetPeriod, 200);
  var relationship = trimLen(body.relationship, 300);
  var purpose = trimLen(body.purpose, 80);
  var purposeDetail = trimLen(body.purposeDetail, 4000);
  var deadline = trimLen(body.deadline, 80);
  var additional = trimLen(body.additional, 12000);

  var scopeCareer = !!body.scopeCareer;
  var scopeReputation = !!body.scopeReputation;
  var scopeEducation = !!body.scopeEducation;
  var scopeLegal = !!body.scopeLegal;
  var scopeOther = !!body.scopeOther;

  if (!company) {
    return res.status(400).json({ ok: false, error: "의뢰 기업(회사)명을 입력해 주세요." });
  }
  if (!name) {
    return res.status(400).json({ ok: false, error: "담당자명을 입력해 주세요." });
  }
  if (!phone || phone.replace(/[\s\-().]/g, "").length < 8) {
    return res.status(400).json({ ok: false, error: "연락처를 올바르게 입력해 주세요." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "유효한 이메일 주소를 입력해 주세요." });
  }
  if (!targetName) {
    return res.status(400).json({ ok: false, error: "조회 대상 성명(또는 식별 가능한 호칭)을 입력해 주세요." });
  }
  if (!targetCompany) {
    return res.status(400).json({ ok: false, error: "조회 대상의 소속·경력 회사(기관)를 입력해 주세요." });
  }
  if (!purpose) {
    return res.status(400).json({ ok: false, error: "조회 목적을 선택해 주세요." });
  }
  if (!deadline) {
    return res.status(400).json({ ok: false, error: "희망 일정을 선택해 주세요." });
  }
  if (!scopeCareer && !scopeReputation && !scopeEducation && !scopeLegal && !scopeOther) {
    return res.status(400).json({ ok: false, error: "희망 조회 항목을 한 가지 이상 선택해 주세요." });
  }
  if (!body.privacyConsent) {
    return res.status(400).json({ ok: false, error: "개인정보 수집 및 이용에 동의해 주세요." });
  }

  var scopeLines = [];
  if (scopeCareer) scopeLines.push("경력·재직 사실 확인");
  if (scopeReputation) scopeLines.push("재직 평판·업무 수행 평가");
  if (scopeEducation) scopeLines.push("학력·자격·면허");
  if (scopeLegal) scopeLines.push("소송·징계 등 리스크 관련(가능 범위)");
  if (scopeOther) scopeLines.push("기타(추가 전달사항에 기재)");

  var to =
    process.env.REFERENCE_REQUEST_TO ||
    process.env.BUSINESS_REQUEST_TO ||
    "shkim@picknmatch.co.kr";
  var fromEnvelope = parseFromEnvelopeAddress(process.env.RESEND_FROM);
  var companyHdr = stripSmtpHeaderBreaks(company);
  var nameHdr = stripSmtpHeaderBreaks(name);
  var fromHeader = '"' + escapeDisplayName(companyHdr) + '" <' + fromEnvelope + ">";

  var subject = "[평판조회 의뢰] " + companyHdr + " · " + nameHdr;

  var textBody =
    "평판조회 의뢰 — 픽앤매치 웹사이트\n\n" +
    "보낸 사람  " +
    name +
    " <" +
    email +
    ">\n" +
    "연락처: " +
    phone +
    "\n" +
    "(회신 시 이 주소로 연결됩니다. 실제 발송은 픽앤매치 웹사이트·Resend 경유)\n\n" +
    "개인정보 수집·이용 동의: 예 (평판조회 의뢰)\n\n" +
    "■ 의뢰 기업·담당\n" +
    "회사명: " +
    company +
    "\n" +
    "부서: " +
    (dept || "(없음)") +
    "\n" +
    "담당자: " +
    name +
    "\n" +
    "직함: " +
    (contactTitle || "(없음)") +
    "\n" +
    "연락처: " +
    phone +
    "\n" +
    "이메일: " +
    email +
    "\n\n" +
    "■ 조회 대상\n" +
    "성명(또는 호칭): " +
    targetName +
    "\n" +
    "소속·경력 회사(기관): " +
    targetCompany +
    "\n" +
    "해당 기간·근무 형태: " +
    (targetPeriod || "(없음)") +
    "\n" +
    "의뢰사와의 관계: " +
    (relationship || "(없음)") +
    "\n\n" +
    "■ 조회 목적\n" +
    purpose +
    "\n" +
    (purposeDetail ? "상세: " + purposeDetail + "\n" : "") +
    "\n" +
    "■ 희망 조회 항목\n" +
    scopeLines.map(function (l) {
      return "· " + l;
    }).join("\n") +
    "\n\n" +
    "■ 희망 일정\n" +
    deadline +
    "\n\n" +
    "■ 추가 전달사항\n" +
    (additional || "(없음)") +
    "\n\n" +
    "────────────────────\n" +
    "from picknmatch · 픽앤매치 웹사이트 평판조회 의뢰";

  var htmlScope = scopeLines
    .map(function (l) {
      return "<li>" + escHtml(l) + "</li>";
    })
    .join("");

  var htmlBody =
    '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1e293b;line-height:1.65;">' +
    '<div style="padding:14px 16px;margin:0 0 20px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">' +
    '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">보낸사람</div>' +
    "<div><strong>" +
    escHtml(name) +
    '</strong> &lt;<a href="mailto:' +
    encodeURIComponent(email) +
    '" style="color:#2563eb;">' +
    escHtml(email) +
    "</a>&gt;</div>" +
    "<div style=\"margin-top:6px;\">연락처: " +
    escHtml(phone) +
    '</div><div style="font-size:12px;color:#64748b;margin-top:10px;">실제 발신 주소: ' +
    escHtml(fromEnvelope) +
    " (픽앤매치 웹사이트·Resend)</div>" +
    '<p style="font-size:12px;color:#475569;margin:12px 0 0;">개인정보 수집·이용 동의: <strong>예</strong> (평판조회 의뢰)</p>' +
    "</div>" +
    "<h2 style=\"font-size:15px;margin:0 0 10px;color:#0f172a;\">의뢰 기업·담당</h2>" +
    '<table style="border-collapse:collapse;margin:0 0 18px;font-size:13px;">' +
    "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;vertical-align:top;\">회사명</td><td>" +
    escHtml(company) +
    "</td></tr>" +
    "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;vertical-align:top;\">부서</td><td>" +
    escHtml(dept || "—") +
    "</td></tr>" +
    "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;vertical-align:top;\">직함</td><td>" +
    escHtml(contactTitle || "—") +
    "</td></tr></table>" +
    "<h2 style=\"font-size:15px;margin:0 0 10px;color:#0f172a;\">조회 대상</h2>" +
    '<table style="border-collapse:collapse;margin:0 0 18px;font-size:13px;">' +
    "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;vertical-align:top;\">성명·호칭</td><td>" +
    escHtml(targetName) +
    "</td></tr>" +
    "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;vertical-align:top;\">소속·경력</td><td>" +
    escHtml(targetCompany) +
    "</td></tr>" +
    "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;vertical-align:top;\">기간</td><td>" +
    escHtml(targetPeriod || "—") +
    "</td></tr>" +
    "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;vertical-align:top;\">관계</td><td>" +
    escHtml(relationship || "—") +
    "</td></tr></table>" +
    "<h2 style=\"font-size:15px;margin:0 0 10px;color:#0f172a;\">조회 목적</h2>" +
    "<p style=\"margin:0 0 8px;\">" +
    escHtml(purpose) +
    "</p>" +
    (purposeDetail
      ? '<div style="white-space:pre-wrap;word-break:break-word;margin:0 0 18px;">' +
        escHtml(purposeDetail) +
        "</div>"
      : "") +
    "<h2 style=\"font-size:15px;margin:0 0 10px;color:#0f172a;\">희망 조회 항목</h2>" +
    "<ul style=\"margin:0 0 18px;padding-left:1.2rem;\">" +
    htmlScope +
    "</ul>" +
    "<h2 style=\"font-size:15px;margin:0 0 10px;color:#0f172a;\">희망 일정</h2>" +
    "<p style=\"margin:0 0 18px;\">" +
    escHtml(deadline) +
    "</p>" +
    "<h2 style=\"font-size:15px;margin:0 0 10px;color:#0f172a;\">추가 전달사항</h2>" +
    '<div style="white-space:pre-wrap;word-break:break-word;margin:0 0 24px;">' +
    escHtml(additional || "—") +
    "</div>" +
    '<p style="font-size:12px;color:#64748b;margin:0;border-top:1px solid #e2e8f0;padding-top:16px;">────────────────────<br/>from picknmatch · 픽앤매치 웹사이트 평판조회 의뢰</p>' +
    "</div>";

  var resend = new Resend(apiKey);

  try {
    var result = await resend.emails.send({
      from: fromHeader,
      to: [to],
      replyTo: email,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });
    if (result.error) {
      var errMsg =
        (result.error && result.error.message) ||
        (typeof result.error === "string" ? result.error : null) ||
        "전송에 실패했습니다.";
      return res.status(500).json({ ok: false, error: normalizeResendErrorMessage(errMsg) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: normalizeResendErrorMessage(e.message || "전송에 실패했습니다."),
    });
  }
};
