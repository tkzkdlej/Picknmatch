/**
 * 업무 요청 폼 → 이메일 전송 (Vercel Serverless + Resend)
 *
 * Vercel 환경 변수:
 *   RESEND_API_KEY   — Resend 대시보드에서 발급 (필수)
 *   BUSINESS_REQUEST_TO — 수신 이메일 (기본: 테스트용 ms980822@naver.com, 운영 시 shkim@picknmatch.co.kr 로 변경)
 *   RESEND_FROM      — 발신 주소 (예: PicknMatch <noreply@picknmatch.co.kr> 또는 Resend 테스트: onboarding@resend.dev)
 */

const { Resend } = require("resend");

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on("data", function (c) {
      chunks.push(c);
    });
    req.on("end", function () {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

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

  var body;
  try {
    body = JSON.parse(raw || "{}");
  } catch (e) {
    return res.status(400).json({ ok: false, error: "JSON 형식이 올바르지 않습니다." });
  }

  var name = String(body.name || "").trim();
  var email = String(body.email || "").trim();
  var message = String(body.message || "").trim();
  var attachment = body.attachment || null;

  if (!name || name.length > 120) {
    return res.status(400).json({ ok: false, error: "이름을 입력해 주세요." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "유효한 이메일 주소를 입력해 주세요." });
  }
  if (!message || message.length > 20000) {
    return res.status(400).json({ ok: false, error: "요청 내용을 입력해 주세요." });
  }

  var to = process.env.BUSINESS_REQUEST_TO || "ms980822@naver.com";
  var from = process.env.RESEND_FROM || "PicknMatch <onboarding@resend.dev>";

  var footer =
    "\n\n────────────────────\nfrom picknmatch · 픽앤매치 웹사이트 업무 요청";

  var textBody =
    "[픽앤매치 웹사이트 업무 요청]\n\n" +
    "이름: " +
    name +
    "\n" +
    "회신 받을 이메일: " +
    email +
    "\n\n" +
    "요청 내용:\n" +
    message +
    footer;

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
      from: from,
      to: [to],
      replyTo: email,
      subject: "[픽앤매치] 업무 요청 · " + name,
      text: textBody,
    };
    if (attachments.length) payload.attachments = attachments;

    var result = await resend.emails.send(payload);
    if (result.error) {
      var errMsg =
        (result.error && result.error.message) ||
        (typeof result.error === "string" ? result.error : null) ||
        "전송에 실패했습니다.";
      return res.status(500).json({ ok: false, error: errMsg });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "전송에 실패했습니다." });
  }
};
