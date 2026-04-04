/**
 * Resend 연결 테스트 (로컬 전용).
 * 키는 파일에 넣지 말고 환경 변수만 사용합니다.
 *
 * PowerShell: $env:RESEND_API_KEY="re_..."; npm run email:test
 * bash:       RESEND_API_KEY=re_... npm run email:test
 */

import { Resend } from "resend";

var apiKey = process.env.RESEND_API_KEY;
if (!apiKey || typeof apiKey !== "string" || !apiKey.trim().startsWith("re_")) {
  console.error("오류: RESEND_API_KEY 환경 변수에 re_ 로 시작하는 Resend API 키를 설정하세요.");
  process.exit(1);
}

var resend = new Resend(apiKey.trim());

var to = process.env.BUSINESS_REQUEST_TO || "shkim@picknmatch.co.kr";

var result = await resend.emails.send({
  from: "onboarding@resend.dev",
  to: to,
  subject: "[테스트] Resend Hello World",
  html: "<p>Resend 연결 테스트입니다.</p>",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

console.log("전송됨:", result.data);
