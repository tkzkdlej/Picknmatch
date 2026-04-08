/**
 * 업무 요청 폼 → 이메일 전송 (Vercel Serverless + Resend)
 *
 * 발신 주소(괄호 안 실제 주소)는 Resend에 검증된 도메인만 가능합니다.
 * 표시 이름에는 회사명·이름을 넣고, 답장은 사용자 이메일(reply_to)로 연결됩니다.
 *
 * Vercel 환경 변수:
 *   RESEND_API_KEY, BUSINESS_REQUEST_TO, RESEND_FROM (예: PicknMatch <onboarding@resend.dev>)
 */

const { Resend } = require("resend");

/** JSON + base64 첨부 고려(대략 4MB 첨부 시 본문 팽창) */
var MAX_JSON_BODY_BYTES = 9 * 1024 * 1024;

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

/** 이메일 Subject·From 표시명 등 헤더 줄바꿈 주입 방지 */
function stripSmtpHeaderBreaks(s) {
  return String(s || "")
    .replace(/[\r\n\x00\x1a]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

/** RESEND_FROM에서 실제 메일 주소만 추출 */
function parseFromEnvelopeAddress(envFrom) {
  var s = String(envFrom || "").trim();
  var m = s.match(/<([^>]+)>/);
  if (m) return m[1].trim();
  if (/^[^\s@]+@[^\s@]+$/.test(s)) return s;
  return "onboarding@resend.dev";
}

/** RFC 5322 표시 이름용 따옴표 이스케이프 */
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

/** Resend 무료/미검증 도메인 시 영문 안내 → 사용자용 한국어 */
function normalizeResendErrorMessage(raw) {
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
  return s;
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

  var company = String(body.company || "").trim();
  var name = String(body.name || "").trim();
  var email = String(body.email || "").trim();
  var message = String(body.message || "").trim();
  var attachment = body.attachment || null;

  if (!company || company.length > 160) {
    return res.status(400).json({ ok: false, error: "회사명을 입력해 주세요." });
  }
  if (!name || name.length > 120) {
    return res.status(400).json({ ok: false, error: "이름을 입력해 주세요." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "유효한 이메일 주소를 입력해 주세요." });
  }
  if (!message || message.length > 20000) {
    return res.status(400).json({ ok: false, error: "요청 내용을 입력해 주세요." });
  }
  if (!body.privacyConsent) {
    return res.status(400).json({ ok: false, error: "개인정보 수집 및 이용에 동의해 주세요." });
  }

  var to = process.env.BUSINESS_REQUEST_TO || "shkim@picknmatch.co.kr";
  var fromEnvelope = parseFromEnvelopeAddress(process.env.RESEND_FROM);

  /**
   * 목록(첫 화면): 제목 [회사명] · 발신 표시명에 회사명(네이버 등에서 보낸이 줄과 맞춤)
   * 열람 화면: 본문 상단 블록에 이름·고객 이메일 표시(Resend 발신 주소는 검증 도메인만 가능)
   */
  var companyHdr = stripSmtpHeaderBreaks(company);
  var nameHdr = stripSmtpHeaderBreaks(name);
  var fromHeader = '"' + escapeDisplayName(companyHdr) + '" <' + fromEnvelope + ">";

  var subject = "[" + companyHdr + "] 업무 요청 · " + nameHdr;

  var footer =
    "\n\n────────────────────\nfrom picknmatch · 픽앤매치 웹사이트 업무 요청";

  var textBody =
    "보낸 사람  " + name + " <" + email + ">\n" +
    "(회신 시 이 주소로 연결됩니다. 실제 발송은 픽앤매치 웹사이트·Resend 경유)\n\n" +
    "개인정보 수집·이용 동의: 예 (웹사이트 업무 요청)\n\n" +
    "회사명: " +
    company +
    "\n" +
    "이름: " +
    name +
    "\n" +
    "이메일: " +
    email +
    "\n\n" +
    "요청 내용:\n" +
    message +
    footer;

  var htmlBody =
    '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1e293b;line-height:1.65;">' +
    '<div style="padding:14px 16px;margin:0 0 20px;background:#eef6ff;border-radius:10px;border:1px solid #bfdbfe;">' +
    '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">보낸사람</div>' +
    "<div><strong>" +
    escHtml(name) +
    '</strong> &lt;<a href="mailto:' +
    encodeURIComponent(email) +
    '" style="color:#2563eb;">' +
    escHtml(email) +
    "</a>&gt;</div>" +
    '<div style="font-size:12px;color:#64748b;margin-top:10px;">실제 발신 주소: ' +
    escHtml(fromEnvelope) +
    " (픽앤매치 웹사이트·Resend)</div>" +
    '<p style="font-size:12px;color:#475569;margin:12px 0 0;">개인정보 수집·이용 동의: <strong>예</strong> (웹사이트 업무 요청)</p>' +
    "</div>" +
    '<div style="white-space:pre-wrap;word-break:break-word;">' +
    escHtml(message) +
    "</div>" +
    '<p style="font-size:12px;color:#64748b;margin:24px 0 0;border-top:1px solid #e2e8f0;padding-top:16px;">────────────────────<br/>from picknmatch · 픽앤매치 웹사이트 업무 요청</p>' +
    "</div>";

  var attachments = [];
  if (attachment && attachment.filename && attachment.data) {
    var fname = String(attachment.filename).replace(/[^\w.\-가-힣]/g, "_").slice(0, 180);
    if (!fname) fname = "attachment";
    var buf;
    try {
      buf = Buffer.from(String(attachment.data), "base64");
    } catch (e) {
      return res.status(400).json({ ok: false, error: "첨부 파일 형식이 올바르지 않습니다." });
    }
    if (buf.length > 4 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: "첨부 파일은 4MB 이하로 제한됩니다." });
    }
    attachments.push({ filename: fname, content: buf.toString("base64") });
  }

  var resend = new Resend(apiKey);

  try {
    var payload = {
      from: fromHeader,
      to: [to],
      replyTo: email,
      subject: subject,
      text: textBody,
      html: htmlBody,
    };
    if (attachments.length) payload.attachments = attachments;

    var result = await resend.emails.send(payload);
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
