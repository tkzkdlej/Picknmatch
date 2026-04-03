"""
내부 링크·picknmatch 절대 URL에서 경로 끝의 '/' 제거 (예: /main/ → /main).
repo 루트에서: python scripts/strip_trailing_slashes.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", ".cursor"}
EXT = {".html", ".xml", ".js", ".css", ".txt", ".json"}


def fix_root_path(path: str) -> str:
    if not path.startswith("/"):
        return path
    p = path.rstrip("/")
    return "/" if p == "" else p


def strip_picknmatch_url(url: str) -> str:
    if url.startswith("https://picknmatch.co.kr") and url.endswith("/"):
        return url[:-1]
    return url


def patch_text(text: str) -> str:
    # https://picknmatch.co.kr/.../  (끝 슬래시)
    def pm_sub(m: re.Match[str]) -> str:
        return strip_picknmatch_url(m.group(0))

    text = re.sub(r"https://picknmatch\.co\.kr[^\s\"'<>)]*", pm_sub, text)

    # href="/path/"  action="/path/"
    def hrefish(attr: str, m: re.Match[str]) -> str:
        q, path = m.group(1), m.group(2)
        return f'{attr}={q}{fix_root_path(path)}{q}'

    for attr in ("href", "action"):
        pat = attr + r"""=(["'])(/[^"']*)\1"""
        text = re.sub(pat, lambda m, a=attr: hrefish(a, m), text)

    # meta refresh: content="0;url=/path/"
    def meta_url(m: re.Match[str]) -> str:
        return m.group(1) + fix_root_path(m.group(2)) + m.group(3)

    text = re.sub(
        r'(url=)(/[^"\'\s;]+)(["\'])',
        meta_url,
        text,
    )

    # location.replace("/path/");
    def loc_rep(m: re.Match[str]) -> str:
        q, path = m.group(1), m.group(2)
        return f"location.replace({q}{fix_root_path(path)}{q})"

    text = re.sub(
        r"""location\.replace\((["'])(/[^"']*)\1\)""",
        loc_rep,
        text,
    )

    return text


def main() -> None:
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel.parts):
            continue
        if path.suffix.lower() not in EXT:
            continue
        if path.name == "strip_trailing_slashes.py":
            continue
        raw = path.read_text(encoding="utf-8")
        new = patch_text(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            print("updated:", rel)


if __name__ == "__main__":
    main()
