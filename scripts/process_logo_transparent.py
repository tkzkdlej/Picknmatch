"""
images/logo.png — 투명 배경 정리
- α=0 인 픽셀의 RGB를 0으로 맞춤(일부 환경에서의 번짐 완화)
- 투명과 맞닿은 '밝은 회색·크림' 가장자리(구 흰 배경 안티앨리어싱)만 제거해
  네이비 글자 주변 흰 테두리처럼 보이는 부분을 줄임 (금/네이비/한글 흰 글자 본체는 보존)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def saturation_rgb(r: int, g: int, b: int) -> float:
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx <= 0:
        return 0.0
    return (mx - mn) / mx


def should_clear_fringe(
    r: int, g: int, b: int, has_transparent_neighbor: bool
) -> bool:
    if not has_transparent_neighbor:
        return False
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mxv, mnv = max(r, g, b), min(r, g, b)
    sat = saturation_rgb(r, g, b)
    if sat > 0.12 or (mxv - mnv) > 24:
        return False
    # 네이비 글자와 투명 사이 회색 안티앨리어싱(대략 L 170~212)
    if 170 <= lum <= 212 and sat <= 0.10:
        return True
    # 밝은 크림 번짐(영문 주변) — 순백 한글 가장자리(보통 L>245)는 건드리지 않음
    if 222 < lum < 252 and (r - b) > 12 and r > g + 2 and sat <= 0.14:
        return True
    return False


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    path = root / "images" / "logo.png"
    if not path.exists():
        print("missing", path, file=sys.stderr)
        return 1

    im = Image.open(path).convert("RGBA")
    a = np.array(im, dtype=np.uint8)
    h, w = a.shape[:2]

    a[a[:, :, 3] == 0, :3] = 0

    removed = 0
    for y in range(h):
        for x in range(w):
            if a[y, x, 3] < 128:
                continue
            r, g, b = int(a[y, x, 0]), int(a[y, x, 1]), int(a[y, x, 2])
            has_t = False
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if ny < 0 or ny >= h or nx < 0 or nx >= w or a[ny, nx, 3] < 128:
                    has_t = True
                    break
            if should_clear_fringe(r, g, b, has_t):
                a[y, x, 3] = 0
                a[y, x, :3] = 0
                removed += 1

    Image.fromarray(a, "RGBA").save(path, format="PNG", optimize=True)
    print(path, "OK, fringe pixels removed:", removed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
