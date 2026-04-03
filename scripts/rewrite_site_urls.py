"""
일회성: 카테고리 경로(about-us, client, position) 및 #top 제거 반영.
경로 끝 슬래시 없음(/main 형태)과 맞춤.
repo 루트에서: python scripts/rewrite_site_urls.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (pattern, repl) 순서 중요 — 긴 경로·요청 폼 먼저
REGEX_PAIRS: list[tuple[str, str]] = [
    (r"https://picknmatch\.co\.kr/request-reference/", "https://picknmatch.co.kr/client/request-reference"),
    (r"https://picknmatch\.co\.kr/request-career/", "https://picknmatch.co.kr/client/request-career"),
    (r"https://picknmatch\.co\.kr/request-recruitment/", "https://picknmatch.co.kr/client/request-recruitment"),
    (r"https://picknmatch\.co\.kr/request-headhunting/", "https://picknmatch.co.kr/client/request-headhunting"),
    (r"https://picknmatch\.co\.kr/achievement/", "https://picknmatch.co.kr/client/achievement"),
    (r"https://picknmatch\.co\.kr/recruitment/", "https://picknmatch.co.kr/client/recruitment"),
    (r"https://picknmatch\.co\.kr/headhunting/", "https://picknmatch.co.kr/client/headhunting"),
    (r"https://picknmatch\.co\.kr/reference/", "https://picknmatch.co.kr/client/reference"),
    (r"https://picknmatch\.co\.kr/strength/", "https://picknmatch.co.kr/client/strength"),
    (r"https://picknmatch\.co\.kr/career/", "https://picknmatch.co.kr/client/career"),
    (r"https://picknmatch\.co\.kr/introduce/", "https://picknmatch.co.kr/about-us/introduce"),
    (r"https://picknmatch\.co\.kr/location/", "https://picknmatch.co.kr/about-us/location"),
    (r"https://picknmatch\.co\.kr/members/", "https://picknmatch.co.kr/about-us/members"),
    (r"https://picknmatch\.co\.kr/greeting/", "https://picknmatch.co.kr/about-us/greeting"),
    (r"https://picknmatch\.co\.kr/resume/", "https://picknmatch.co.kr/position/resume"),
]

# /reference/, /career/ 등은 /client/ 안에 이미 있으면 중복 치환 방지
PATH_REGEX: list[tuple[str, str]] = [
    (r"(?<!client)/request-reference/", "/client/request-reference"),
    (r"(?<!client)/request-career/", "/client/request-career"),
    (r"(?<!client)/request-recruitment/", "/client/request-recruitment"),
    (r"(?<!client)/request-headhunting/", "/client/request-headhunting"),
    (r"(?<!client)/achievement/", "/client/achievement"),
    (r"(?<!client)/recruitment/", "/client/recruitment"),
    (r"(?<!client)/headhunting/", "/client/headhunting"),
    (r"(?<!client)/reference/", "/client/reference"),
    (r"(?<!client)/strength/", "/client/strength"),
    (r"(?<!client)/career/", "/client/career"),
    (r"(?<!about-us)/introduce/", "/about-us/introduce"),
    (r"(?<!about-us)/location/", "/about-us/location"),
    (r"(?<!about-us)/members/", "/about-us/members"),
    (r"(?<!about-us)/greeting/", "/about-us/greeting"),
    (r"(?<!position)/resume/", "/position/resume"),
]

# #top 제거 (카테고리 상단 링크)
HASH_FIX = [
    ("/about-us/greeting/#top", "/about-us/greeting"),
    ("/client/strength/#top", "/client/strength"),
    ("/position/#top", "/position"),
    ("/greeting/#top", "/about-us/greeting"),
    ("/strength/#top", "/client/strength"),
]

# 오타
TYPO = ("request-/headhunting/", "/client/request-headhunting")

EXT = {".html", ".xml", ".js", ".css", ".txt"}


def patch_text(text: str) -> str:
    for pat, repl in REGEX_PAIRS:
        text = re.sub(pat, repl, text)
    for pat, repl in PATH_REGEX:
        text = re.sub(pat, repl, text)
    for old, new in HASH_FIX:
        text = text.replace(old, new)
    text = text.replace(TYPO[0], TYPO[1])
    return text


def main() -> None:
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in EXT:
            continue
        if "rewrite_site_urls" in str(path):
            continue
        raw = path.read_text(encoding="utf-8")
        new = patch_text(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            print("patched", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
