/**
 * 국내(한국) 뉴스 — Google News RSS(ko-KR) 최신 1건씩 × 3주제
 * 기사 링크를 따라 메타(og:description, og:image)를 보강합니다.
 *
 * 저작권: 전문 본문이 아니라 RSS·OG 메타에 공개된 요약·썸네일만 사용합니다.
 * 원문은 항상 언론사 링크로 이동합니다.
 */

var UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

var FEEDS = [
  { query: encodeURIComponent("반도체"), category: "반도체" },
  { query: encodeURIComponent("2차전지"), category: "2차전지 · 배터리" },
  { query: encodeURIComponent("채용"), category: "채용 · 인력" },
];

function rssUrl(q) {
  return "https://news.google.com/rss/search?q=" + q + "&hl=ko&gl=KR&ceid=KR:ko";
}

function decodeHtmlEntities(s) {
  if (!s) return "";
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, function (_, n) {
      return String.fromCharCode(parseInt(n, 10));
    });
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanGoogleTitle(title) {
  var s = stripTags(decodeHtmlEntities(title)).trim();
  var idx = s.lastIndexOf(" - ");
  if (idx > 0 && idx < s.length - 3) return s.slice(0, idx).trim();
  return s;
}

function extractTag(block, tag) {
  var re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i");
  var m = re.exec(block);
  return m ? m[1] : "";
}

function parseFirstItem(xml) {
  var m = /<item>([\s\S]*?)<\/item>/i.exec(xml);
  if (!m) return null;
  var block = m[1];

  var titleRaw = extractTag(block, "title");
  if (titleRaw.indexOf("<![CDATA[") !== -1) {
    titleRaw = titleRaw.replace(/^[\s\S]*?<!\[CDATA\[/, "").replace(/\]\]>[\s\S]*$/, "");
  }
  var title = cleanGoogleTitle(titleRaw);

  var link = extractTag(block, "link").trim();
  var pubDate = extractTag(block, "pubDate").trim();
  var descBlock = extractTag(block, "description");
  var descText = cleanGoogleTitle(descBlock);

  return { title: title, link: link, pubDate: pubDate, rssSnippet: descText };
}

function metaFromHtml(html, prop) {
  var p = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re1 = new RegExp(
    '<meta[^>]+property=["\']' + p + '["\'][^>]+content=["\']([^"\']*)["\']',
    "i"
  );
  var re2 = new RegExp(
    '<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']' + p + '["\']',
    "i"
  );
  var m = re1.exec(html) || re2.exec(html);
  return m ? decodeHtmlEntities(m[1].trim()) : "";
}

async function fetchText(url, ms) {
  var r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(ms || 10000),
  });
  if (!r.ok) throw new Error("http " + r.status);
  return { text: await r.text(), finalUrl: r.url };
}

async function enrichArticle(googleLink) {
  if (!googleLink) return { sourceUrl: "", ogImage: "", ogDescription: "" };
  try {
    var { text, finalUrl } = await fetchText(googleLink, 9000);
    var ogImage = metaFromHtml(text, "og:image");
    if (ogImage) {
      ogImage = ogImage.replace(/&amp;/g, "&");
      try {
        if (ogImage.indexOf("//") === 0) ogImage = "https:" + ogImage;
        else if (ogImage.charAt(0) === "/") {
          var base = new URL(finalUrl);
          ogImage = base.origin + ogImage;
        }
      } catch (e2) {}
    }
    var ogDescription = metaFromHtml(text, "og:description");
    if (!ogDescription) ogDescription = metaFromHtml(text, "description");
    return { sourceUrl: finalUrl || googleLink, ogImage: ogImage, ogDescription: ogDescription };
  } catch (e) {
    return { sourceUrl: googleLink, ogImage: "", ogDescription: "" };
  }
}

function toISODate(pubDate) {
  try {
    var d = new Date(pubDate);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
}

function formatKoreanDate(iso) {
  if (!iso || iso.length < 10) return "";
  return iso.replace(/-/g, ".");
}

function truncate(s, n) {
  s = String(s || "").trim();
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

function thumbProxyPath(absUrl) {
  if (!absUrl || !/^https:\/\//i.test(absUrl)) return "";
  return "/api/news-img?w=720&q=82&u=" + encodeURIComponent(absUrl);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.json({ ok: false, error: "Method not allowed" });
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  /* 엣지 캐시: 최대 6시간(21600s) 동안 동일 JSON 재사용 → 이후 재검증. SWR로 짧은 stale 허용 */
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=21600, stale-while-revalidate=7200"
  );

  try {
    var rssBodies = await Promise.all(
      FEEDS.map(function (f) {
        return fetchText(rssUrl(f.query), 11000).then(function (x) {
          return x.text;
        });
      })
    );

    var rawItems = [];
    for (var i = 0; i < FEEDS.length; i++) {
      var item = parseFirstItem(rssBodies[i] || "");
      if (item) rawItems.push({ feed: FEEDS[i], item: item });
    }

    var enriched = await Promise.all(
      rawItems.map(function (row) {
        return enrichArticle(row.item.link);
      })
    );

    var cards = [];
    for (var j = 0; j < rawItems.length; j++) {
      var row = rawItems[j];
      var it = row.item;
      var en = enriched[j] || {};
      var body =
        (en.ogDescription && String(en.ogDescription).trim()) ||
        it.rssSnippet ||
        it.title;
      body = truncate(stripTags(body), 2000);
      var excerpt = truncate(body, 220);
      var iso = toISODate(it.pubDate);
      var img = en.ogImage ? thumbProxyPath(en.ogImage) : "";

      cards.push({
        category: row.feed.category,
        title: it.title || "뉴스",
        date: iso,
        dateDisplay: formatKoreanDate(iso) || "—",
        excerpt: excerpt,
        body: body,
        sourceUrl: en.sourceUrl || it.link,
        image: img,
      });
    }

    return res.status(200).json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      cards: cards,
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      error: "뉴스를 불러오지 못했습니다.",
      cards: [],
    });
  }
};
