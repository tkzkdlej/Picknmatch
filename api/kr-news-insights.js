/**
 * 국내(한국) 뉴스 — Google News RSS(ko-KR) × 3주제(요청마다 풀에서 무작위 3개)
 * 주제별 RSS(최근 7일 when: + pubDate 재검증)에서 관련성·최신도로 1건 채택합니다.
 * 제목에 한글이 없거나 해외 시장 전용인데 국내 맥락이 없으면 제외합니다.
 * 베트남(.vn) 등 비한국 도메인·현지 전용 사안은 출처 URL·본문으로 제외합니다.
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

var RSS_ITEM_CAP = 36;
var MIN_ACCEPT_SCORE = 8;

/** 표시·선별 기준: 이보다 오래된 기사는 제외(일). Google when: 연산자만으로는 옛 기사가 섞일 수 있어 서버에서 재검증 */
var MAX_ARTICLE_AGE_DAYS = 7;
var MAX_ARTICLE_AGE_MS = MAX_ARTICLE_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * 국내(한국) 맥락 신호 — 하나라도 있으면 해외 전용 필터를 통과하기 쉬움
 * (지명·시장·주요 그룹·국내 매체·정부 기관)
 */
var KOREA_DOMESTIC_RE =
  /한국|국내|대한민국|서울|부산|인천|대구|광주|대전|울산|세종|수원|성남|코스피|코스닥|KOSPI|KOSDAQ|한국은행|한국거래소|금융위|금융감독원|산업통상|산업부|기획재정|기재부|국회|여의도|과천|정부|청와대|삼성전자|삼성|SK하이닉스|SK\s*온|LG에너지|LG화학|LG\b|SK\b|현대차|현대|기아|포스코|현대중공업|HD현대|두산|한화|롯데|CJ|GS\s*그룹|네이버|카카오|SK텔레콤|KT|LG유플러스|한국전력|한전|셀트리온|아모레|신한|KB국민|하나은행|우리은행|NH투자|한국경제|매일경제|조선일보|중앙일보|동아일보|한겨레|연합뉴스|YTN|JTBC|MBN|채널A/i;

/**
 * 제목·요약이 해외 증시·거점만 강조하고 국내 신호가 없을 때(국내 한국판 뉴스 아님)
 */
var FOREIGN_ONLY_MARKET_RE =
  /미국\s*증시|뉴욕\s*증시|뉴욕\s*증권|나스닥\s*종목|다우\s*지수|다우존스|S\s*&\s*P\s*500|유럽\s*증시|영국\s*증시|프랑크푸르트|일본\s*증시|니케이\s*평균|상하이\s*종합|홍콩\s*항셍|홍콩증시|선전\s*증시|대만\s*증시|월\s*스트리트|워싱턴|백악관|연준\s*금리|\bFOMC\b|유럽\s*중앙은행|\bECB\b\s*금리/i;

function passesKoreaDomesticFilter(title, snippet, extra) {
  var tit = String(title || "").trim();
  var sn = String(snippet || "").trim();
  var ex = String(extra || "").trim();
  var combined = (tit + " " + sn + " " + ex).replace(/\s+/g, " ");

  if (!tit) return false;

  if (isForeignLocalOnlyStory(combined)) {
    return false;
  }

  /* 한글 제목이 없으면 국내 한국어 기사로 보기 어려움(외신·로이터 원제 등) */
  if (!/[가-힣]/.test(tit)) {
    return false;
  }

  var hasKr = KOREA_DOMESTIC_RE.test(combined);

  if (FOREIGN_ONLY_MARKET_RE.test(combined) && !hasKr) {
    return false;
  }

  /* 해외 거시만, 한국 언급 전무 */
  if (
    /\b(Federal\s*Reserve|FOMC\s*결정|White\s*House|European\s*Central\s*Bank)\b/i.test(combined) &&
    !hasKr
  ) {
    return false;
  }

  return true;
}

function hostnameFromUrl(urlStr) {
  try {
    var u = new URL(String(urlStr || "").trim());
    return String(u.hostname || "")
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch (e) {
    return "";
  }
}

/** 국내 언론·한국 발행이 아닌 출처(예: 베트남 .vn 도메인) */
function isBlockedNonKrPublisherUrl(urlStr) {
  var h = hostnameFromUrl(urlStr);
  if (!h) return false;
  if (h === "vietnam.vn" || h.endsWith(".vietnam.vn")) return true;
  if (/\.vn$/i.test(h)) return true;
  return false;
}

/**
 * 한국 연계 없이 베트남 등 현지 사안만 다루는 기사(한국어 번역 페이지 포함)
 */
function isForeignLocalOnlyStory(combined) {
  var t = String(combined || "").replace(/\s+/g, " ");
  if (/vietnam\.vn|베트남\.vn/i.test(t)) return true;
  if (
    /(손라전력|손라성|송라|메콩\s*델타|호치민시|다낭시|쩐\s*탄|VND\s*[\d,]+억)/i.test(t) &&
    !/(한국|국내|대한민국|한[·\s\-]베|한베|수출입\s*협|주한)/i.test(t)
  ) {
    return true;
  }
  if (/\b베트남\b/i.test(t) && /(전력공사|성\s*내|지방자치|인민위원회)/i.test(t) && !/(한국|국내|대한민국)/i.test(t)) {
    return true;
  }
  return false;
}

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

function rssUrl(encodedQuery) {
  return (
    "https://news.google.com/rss/search?q=" +
    encodedQuery +
    encodeURIComponent(" when:7d") +
    "&hl=ko&gl=KR&ceid=KR:ko"
  );
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

/** RSS pubDate 기준 — 오래된 기사는 후보에서 제외(옛날 기사로 되돌아가지 않음) */
function filterByMaxAgeDays(items, maxDays) {
  if (!items || !items.length) return [];
  var maxMs = maxDays * 24 * 60 * 60 * 1000;
  var now = Date.now();
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var ms = pubDateToMs(items[i].pubDate);
    if (!ms) continue;
    var age = now - ms;
    if (age < 0) continue;
    if (age <= maxMs) out.push(items[i]);
  }
  return out;
}

function sortNewestFirst(items) {
  return items.slice().sort(function (a, b) {
    return pubDateToMs(b.pubDate) - pubDateToMs(a.pubDate);
  });
}

/** 최종 표시일이 기준을 넘으면 카드 제외(원문 OG에 옛 날짜가 있을 때) */
function isWithinMaxAgeMs(dateInput) {
  var ms = pubDateToMs(dateInput);
  if (!ms) return false;
  var age = Date.now() - ms;
  if (age < 0) return false;
  return age <= MAX_ARTICLE_AGE_MS;
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
  if (!googleLink) return { sourceUrl: "", ogImage: "", ogDescription: "", publishedAt: "" };
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
    var publishedAt = metaFromHtml(text, "article:published_time");
    if (!publishedAt) publishedAt = metaFromHtml(text, "article:modified_time");
    return {
      sourceUrl: finalUrl || googleLink,
      ogImage: ogImage,
      ogDescription: ogDescription,
      publishedAt: publishedAt,
    };
  } catch (e) {
    return { sourceUrl: googleLink, ogImage: "", ogDescription: "", publishedAt: "" };
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
  /* 짧은 캐시 — 인사이트 뉴스가 최근 기사 위주로 보이도록 CDN 재검증 주기 단축 */
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=900, stale-while-revalidate=300"
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
      list = filterByMaxAgeDays(list, MAX_ARTICLE_AGE_DAYS);
      list = list.filter(function (it) {
        return passesKoreaDomesticFilter(it.title, it.rssSnippet, "");
      });
      list = sortNewestFirst(list);
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
      if (isBlockedNonKrPublisherUrl(en.sourceUrl || it.link)) {
        continue;
      }
      var body =
        (en.ogDescription && String(en.ogDescription).trim()) ||
        it.rssSnippet ||
        it.title;
      body = truncate(stripTags(body), 2000);
      var excerpt = truncate(body, 220);

      if (!passesKoreaDomesticFilter(it.title, it.rssSnippet, stripTags(body))) {
        continue;
      }

      var og = en.publishedAt && String(en.publishedAt).trim();
      if (og && pubDateToMs(og) && !isWithinMaxAgeMs(og)) {
        continue;
      }
      var dateRaw = og && isWithinMaxAgeMs(og) ? og : it.pubDate;
      if (!isWithinMaxAgeMs(dateRaw)) {
        continue;
      }
      var iso = toISODate(dateRaw);
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
