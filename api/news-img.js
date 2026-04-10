/**
 * 뉴스 썸네일 프록시 — 외부 img-src CSP 없이 안전하게 표시
 * ?u=<encodeURIComponent(https://...)> — 허용된 호스트의 이미지만 전달
 * ?w=&q= — 가로 최대 w(px)로 리사이즈 후 WebP로 내려 용량·디코딩 부담 완화 (sharp)
 */

var UA =
  "Mozilla/5.0 (compatible; PicknMatch/1.0; +https://www.picknmatch.co.kr/) AppleWebKit/537.36 Chrome/120 Safari/537.36";

var sharpMod = null;
try {
  sharpMod = require("sharp");
} catch (e) {
  sharpMod = null;
}

function allowImageHost(hostname) {
  var h = String(hostname || "").toLowerCase();
  if (!h || h === "localhost" || h.endsWith(".local")) return false;
  if (h.includes("pstatic.net") || h.includes("daumcdn.net") || h.includes("kakaocdn.net")) return true;
  if (h.includes("googleusercontent.com")) return true;
  if (h.endsWith(".akamaized.net") || h.endsWith(".cloudfront.net")) return true;
  return (
    /\.joins\.com$/i.test(h) ||
    /\.chosun\.com$/i.test(h) ||
    /\.hani\.co\.kr$/i.test(h) ||
    /\.yna\.co\.kr$/i.test(h) ||
    /\.mk\.co\.kr$/i.test(h) ||
    /\.etnews\.com$/i.test(h) ||
    /\.fnnews\.com$/i.test(h) ||
    /\.newsis\.com$/i.test(h) ||
    /\.ytn\.co\.kr$/i.test(h) ||
    /\.news1\.kr$/i.test(h) ||
    /\.nocutnews\.co\.kr$/i.test(h) ||
    /\.sedaily\.com$/i.test(h) ||
    /\.hankyung\.com$/i.test(h) ||
    /\.mt\.co\.kr$/i.test(h) ||
    /\.bizwatch\.co\.kr$/i.test(h) ||
    /\.edaily\.co\.kr$/i.test(h) ||
    /\.zdnet\.co\.kr$/i.test(h) ||
    /\.donga\.com$/i.test(h) ||
    /\.khan\.co\.kr$/i.test(h) ||
    /\.imbc\.com$/i.test(h) ||
    /\.daum\.net$/i.test(h) ||
    /\.naver\.com$/i.test(h) ||
    /\.nate\.com$/i.test(h)
  );
}

function parseDim(q, def, min, max) {
  if (q == null || q === "") return def;
  var n = parseInt(String(q), 10);
  if (isNaN(n) || n <= 0) return def;
  return Math.min(max, Math.max(min, n));
}

async function toWebpThumb(buf, maxWidth, quality) {
  if (!sharpMod || !buf || !buf.length) return null;
  try {
    var out = await sharpMod(buf)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: quality, effort: 4 })
      .toBuffer();
    return out && out.length ? out : null;
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end();
  }

  var raw = req.query && req.query.u;
  if (!raw || typeof raw !== "string") {
    res.statusCode = 400;
    return res.end();
  }

  var target;
  try {
    target = new URL(decodeURIComponent(raw));
  } catch (e) {
    res.statusCode = 400;
    return res.end();
  }

  if (target.protocol !== "https:") {
    res.statusCode = 400;
    return res.end();
  }

  if (!allowImageHost(target.hostname)) {
    res.statusCode = 403;
    return res.end();
  }

  var maxW = parseDim(req.query && req.query.w, 0, 160, 960);
  var quality = parseDim(req.query && req.query.q, 82, 50, 95);

  try {
    var r = await fetch(target.href, {
      headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(12000),
    });

    if (!r.ok) {
      res.statusCode = 404;
      return res.end();
    }

    var ct = r.headers.get("content-type") || "image/jpeg";
    if (!/^image\//i.test(ct)) {
      res.statusCode = 415;
      return res.end();
    }

    var buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 2 * 1024 * 1024) {
      res.statusCode = 413;
      return res.end();
    }

    var isSvg = /svg/i.test(ct);
    var optimized = null;
    if (maxW > 0 && sharpMod && !isSvg) {
      optimized = await toWebpThumb(buf, maxW, quality);
    }

    if (optimized) {
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=43200");
      res.statusCode = 200;
      return res.end(optimized);
    }

    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=43200");
    res.statusCode = 200;
    return res.end(buf);
  } catch (e) {
    res.statusCode = 502;
    return res.end();
  }
};
