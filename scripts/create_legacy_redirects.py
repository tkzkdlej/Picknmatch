"""구 URL(평면 경로) → 새 카테고리 경로로 리다이렉트 HTML 생성. 정적 호스팅용."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REDIRECTS: list[tuple[str, str]] = [
    ("greeting", "/about-us/greeting"),
    ("introduce", "/about-us/introduce"),
    ("members", "/about-us/members"),
    ("location", "/about-us/location"),
    ("strength", "/client/strength"),
    ("headhunting", "/client/headhunting"),
    ("reference", "/client/reference"),
    ("recruitment", "/client/recruitment"),
    ("career", "/client/career"),
    ("achievement", "/client/achievement"),
    ("request-headhunting", "/client/request-headhunting"),
    ("request-recruitment", "/client/request-recruitment"),
    ("request-career", "/client/request-career"),
    ("request-reference", "/client/request-reference"),
    ("resume", "/position/resume"),
]

TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="robots" content="noindex" />
  <title>이동 중…</title>
  <link rel="canonical" href="https://picknmatch.co.kr{target}" />
  <meta http-equiv="refresh" content="0;url={target}" />
  <script>location.replace("{target}");</script>
</head>
<body>
  <p><a href="{target}">새 주소로 이동합니다</a></p>
</body>
</html>
"""


def main() -> None:
    for folder, target in REDIRECTS:
        d = ROOT / folder
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(TEMPLATE.format(target=target), encoding="utf-8")
        print(folder, "->", target)


if __name__ == "__main__":
    main()
