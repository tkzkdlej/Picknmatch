"""
logo.png 흰·근백색 배경을 알파로 제거 (금색·남색 등 채도 있는 픽셀은 보호).
재실행: python scripts/logo_white_to_alpha.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "images" / "logo.png"


def main() -> int:
    if not LOGO.is_file():
        print("missing:", LOGO, file=sys.stderr)
        return 1

    img = Image.open(LOGO).convert("RGBA")
    a = np.asarray(img, dtype=np.float64)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]

    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    # 금색·글자 등 색이 있는 영역은 건드리지 않음
    protect = chroma > 26

    dr = 255 - r
    dg = 255 - g
    db = 255 - b
    dist_white = np.sqrt(dr * dr + dg * dg + db * db)

    # 흰색에 가까울수록 0 → 완전 투명; 멀수록 1
    fade = np.clip(dist_white / 32.0, 0.0, 1.0)
    fade = np.where(protect, 1.0, fade)

    new_al = np.clip(al * fade, 0, 255).astype(np.uint8)
    out = np.stack([r, g, b, new_al], axis=-1).astype(np.uint8)

    Image.fromarray(out, "RGBA").save(LOGO, optimize=True)
    print("wrote", LOGO)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
