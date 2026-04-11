/**
 * 국내(한국) 뉴스 — Google News RSS(ko-KR) × 3주제(요청마다 풀에서 무작위 3개)
 * 주제별 RSS에서 여러 기사를 읽은 뒤, 분야 관련성·최신도를 고려해 1건 채택합니다.
 * 기사 링크를 따라 메타(og:description, og:image)를 보강합니다.
 *
 * 저작권: 전문 본문이 아니라 RSS·OG 메타에 공개된 요약·썸네일만 사용합니다.
 * 원문은 항상 언론사 링크로 이동합니다.
 */

var UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

/**
 * 검색어·표시용 라벨 — 메인 「핵심 산업 분야」10개와 동일.
 * 단일 키워드 대신 산업·기업·실적 등이 함께 걸리도록 쿼리를 구성(노이즈 기사 비중 완화).
 * 매 요청마다 3개를 무작위 추출.
 */
var TOPIC_POOL = [
  {
    query: encodeURIComponent("석유화학 화학 산업 기업 실적"),
    category: "화학",
  },
  {
    query: encodeURIComponent("중공업 기계 조선 철강 산업 기업"),
    category: "중공업",
  },
  {
    query: encodeURIComponent("반도체 산업 기업 실적 투자"),
    category: "반도체",
  },
  {
    query: encodeURIComponent("2차전지 배터리 산업 기업 실적"),
    category: "2차전지",
  },
  {
    query: encodeURIComponent("친환경 ESG 탄소중립 산업 기업"),
    category: "친환경",
  },
  {
    query: encodeURIComponent("에너지 전력 산업 기업 투자"),
    category: "에너지",
  },
  {
    query: encodeURIComponent("첨단소재 소재 산업 기업"),
    category: "소재·재료",
  },
  {
    query: encodeURIComponent("방산 국방 산업 기업"),
    category: "방산",
  },
  {
    query: encodeURIComponent("유통 물류 리테일 산업 기업"),
    category: "유통",
  },
  {
    query: encodeURIComponent("건설 건설사 산업 실적"),
    category: "건설",
  },
];

/** 분야별: 해당 산업·대표 이슈 키워드(제목·스니펫에 나타나야 관련 기사로 판단) */
var TOPIC_INDUSTRY_PATTERNS = {
  화학: /화학|석유화학|정유|폴리머|기초소재|정밀화학|케미칼|LG화학|롯데케미칼|한화솔루션/i,
  중공업: /중공업|조선|철강|중기계|플랜트|건설기계|공작기계|두산|HD현대|현대중공업/i,
  반도체: /반도체|파운드리|웨이퍼|팹|메모리|낸드|DRAM|시스템\s*반도체|삼성전자|SK하이닉스|팹리스/i,
  "2차전지": /2차전지|배터리|전고체|리튬|양극재|음극재|전지|LG에너지|삼성SDI|SK온/i,
  친환경: /친환경|탄소중립|ESG|재생에너지|그린|온실가스|배출권|탄소/i,
  에너지: /에너지|전력|발전|송배전|원전|신재생|한전|가스\s*공사|전기\s*사업/i,
  "소재·재료": /소재|재료|소부장|첨단소재|신소재|디스플레이\s*소재|소재부품/i,
  방산: /방산|국방|항공|우주|무기|K\s*방산|방위산업|군수/i,
  유통: /유통|물류|리테일|도소매|유통업|유통\s*산업|이커머스|마트|편의점/i,
  건설: /건설|건설사|토목|EPC|시공|플랜트\s*건설|아파트\s*분양|건설\s*실적/i,
};

/** 산업·기업·재무 맥락(해당 분야 외 일반 사회 뉴스 제외) */
var BIZ_INDUSTRY_RE =
  /산업|기업|회사|법인|그룹|계열사|매출|실적|영업이익|순이익|투자|공장|생산|수출|수주|기술|개발|시장|경영|영업|공시|상장|채용|설비|공정|전망|증권|코스피|코스닥|납품|계약|호황|침체|구조조정|M&A|인수/i;

/** 명백한 비경제 단신 위주(제목에 강하게 뜨면 감점) */
var NOISE_TITLE_RE =
  /연예|프로야구|KBO|K리그|손흥민|이강인|배우\s|가수\s|아이돌|드라마\s|예능|프로축구/i;

var RSS_ITEM_CAP = 22;
var MIN_ACCEPT_SCORE = 8;

function shuffleInPlace(arr) {
  var a = arr;
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function pickRandomFeeds(n) {
  var copy = TOPIC_POOL.slice();
  shuffleInPlace(copy);
  return copy.slice(0, Math.min(n, copy.length));
}

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
    .replace(/&#(\d+);/g, function (_, num) {
      return String.fromCharCode(parseInt(num, 10));
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

function parseItemBlock(block) {
  if (!block) return null;

  var titleRaw = extractTag(block, "title");
  if (titleRaw.indexOf("<![CDATA[") !== -1) {
    titleRaw = titleRaw.replace(/^[\s\S]*?<!\[CDATA\[/, "").replace(/\]\]>[\s\S]*$/, "");
  }
  var title = cleanGoogleTitle(titleRaw);
  if (!title) return null;

  var link = extractTag(block, "link").trim();
  var pubDate = extractTag(block, "pubDate").trim();
  var descBlock = extractTag(block, "description");
  var descText = cleanGoogleTitle(descBlock);

  return { title: title, link: link, pubDate: pubDate, rssSnippet: descText };
}

function parseItems(xml, limit) {
  var items = [];
  var re = /<item>([\s\S]*?)<\/item>/gi;
  var m;
  while ((m = re.exec(xml)) !== null) {
    if (items.length >= limit) break;
    var parsed = parseItemBlock(m[1]);
    if (parsed) items.push(parsed);
  }
  return items;
}

function pubDateToMs(pubDate) {
  try {
    var d = new Date(pubDate);
    if (isNaN(d.getTime())) return 0;
    return d.getTime();
  } catch (e) {
    return 0;
  }
}

/** 3→7→14→30일 순으로 좁혀, 가능한 한 최근 기사만 후보로 남김 */
var RECENCY_DAY_STEPS = [3, 7, 14, 30];

function narrowByRecency(items) {
  if (!items || !items.length) return items;
  var now = Date.now();
  for (var s = 0; s < RECENCY_DAY_STEPS.length; s++) {
    var maxMs = RECENCY_DAY_STEPS[s] * 24 * 60 * 60 * 1000;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var ms = pubDateToMs(items[i].pubDate);
      if (ms && now - ms <= maxMs) out.push(items[i]);
    }
    if (out.length) return out;
  }
  return items;
}

/**
 * 해당 산업 분야 키워드 + 기업·재무 맥락이 함께 보일 때 높은 점수.
 */
function relevanceScore(category, item) {
  var title = String((item && item.title) || "");
  var sn = String((item && item.rssSnippet) || "");
  var t = title + " " + sn;

  var topicRe = TOPIC_INDUSTRY_PATTERNS[category];
  if (!topicRe) return 0;

  var score = 0;
  if (topicRe.test(t)) score += 12;
  else return 0;

  if (BIZ_INDUSTRY_RE.test(t)) score += 6;

  if (NOISE_TITLE_RE.test(title)) score -= 25;

  return score;
}

function pickBestIndustryItem(category, items) {
  if (!items || !items.length) return null;

  var best = null;
  var bestScore = -Infinity;
  var bestDateMs = -Infinity;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var sc = relevanceScore(category, it);
    var ms = pubDateToMs(it.pubDate);
    if (sc > bestScore || (sc === bestScore && ms > bestDateMs)) {
      bestScore = sc;
      bestDateMs = ms;
      best = it;
    }
  }
  if (best && bestScore >= MIN_ACCEPT_SCORE) return best;

  /* 산업 키워드는 맞으나 점수만 낮은 경우(쿼리 변동) — 양수일 때만 채택 */
  if (best && bestScore > 0) return best;

  return null;
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
    var feeds = pickRandomFeeds(3);

    var rssBodies = await Promise.all(
      feeds.map(function (f) {
        return fetchText(rssUrl(f.query), 11000).then(function (x) {
          return x.text;
        });
      })
    );

    var rawItems = [];
    for (var i = 0; i < feeds.length; i++) {
      var list = parseItems(rssBodies[i] || "", RSS_ITEM_CAP);
      list = narrowByRecency(list);
      var item = pickBestIndustryItem(feeds[i].category, list);
      if (item) rawItems.push({ feed: feeds[i], item: item });
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

    var topics = feeds.map(function (f) {
      return { category: f.category };
    });

    return res.status(200).json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      topics: topics,
      cards: cards,
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      error: "뉴스를 불러오지 못했습니다.",
      topics: [],
      cards: [],
    });
  }
};
