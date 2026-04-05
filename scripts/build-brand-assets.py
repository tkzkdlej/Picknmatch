"""
공식 가로형 로고 PNG에서 헤더용·파비콘 생성.
파비콘: 배경 투명 + 라이트 UI용(진한 로고) / 다크 UI용(밝은 로고).
원본: images/logo-source-official.png
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "logo-source-official.png"
SURFACE = (255, 255, 255, 255)


def normalize_paper_background(im: Image.Image) -> Image.Image:
    """헤더용: 질감 배경을 단색 흰색으로."""
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            avg = (r + g + b) / 3.0
            spread = max(abs(r - g), abs(g - b), abs(r - b))
            if avg > 210 and spread < 28 and r > 185 and g > 185 and b > 185:
                px[x, y] = SURFACE
            elif avg > 235 and spread < 18:
                px[x, y] = SURFACE
    return rgba


def make_background_transparent(im: Image.Image) -> Image.Image:
    """밝고 채도 낮은 픽셀을 투명 처리 (종이/흰 배경)."""
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            sat = mx - mn
            lum = (r + g + b) / 3.0
            if lum > 215 and sat < 45:
                px[x, y] = (r, g, b, 0)
            elif lum > 228 and sat < 60:
                px[x, y] = (r, g, b, 0)
            elif r > 248 and g > 248 and b > 248:
                px[x, y] = (r, g, b, 0)
    return rgba


def variant_for_dark_browser_chrome(im: Image.Image) -> Image.Image:
    """다크 탭 바에서 보이도록 같은 알파로 밝은 톤으로."""
    rgba = im.convert("RGBA")
    out = Image.new("RGBA", rgba.size)
    opx = out.load()
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                opx[x, y] = (0, 0, 0, 0)
                continue
            # 웜 화이트·샴페인 쪽으로 밝히기
            nr = min(255, int(r * 0.22 + 255 * 0.78))
            ng = min(255, int(g * 0.22 + 248 * 0.78))
            nb = min(255, int(b * 0.22 + 232 * 0.78))
            opx[x, y] = (nr, ng, nb, a)
    return out


def upscale_width(im: Image.Image, target_w: int) -> Image.Image:
    w, h = im.size
    if w >= target_w:
        return im
    ratio = target_w / w
    target_h = max(1, int(round(h * ratio)))
    return im.resize((target_w, target_h), Image.Resampling.LANCZOS)


def monogram_crop(im: Image.Image) -> Image.Image:
    """좌측 PM 심볼만 (파비콘용)."""
    w, h = im.size
    side = min(h, int(w * 0.34))
    return im.crop((0, 0, side, h))


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing {SOURCE}")

    base = Image.open(SOURCE).convert("RGBA")
    base_norm = normalize_paper_background(base.copy())

    images_dir = ROOT / "images"
    images_dir.mkdir(exist_ok=True)

    header_img = upscale_width(base_norm, target_w=900)
    header_img.save(images_dir / "logo-white.png", optimize=True, compress_level=9)

    icon_src = monogram_crop(base_norm)
    icon_large = icon_src.resize((512, 512), Image.Resampling.LANCZOS)
    icon_large = icon_large.filter(ImageFilter.UnsharpMask(radius=1.2, percent=130, threshold=3))

    icon_light = make_background_transparent(icon_large)
    icon_dark = variant_for_dark_browser_chrome(icon_light)

    def save_set(prefix: str, src: Image.Image) -> None:
        def save_sz(size: int, path: Path) -> None:
            out = src.resize((size, size), Image.Resampling.LANCZOS)
            out.save(path, optimize=True, compress_level=9)

        save_sz(32, ROOT / f"{prefix}-32x32.png")
        save_sz(16, ROOT / f"{prefix}-16x16.png")
        save_sz(48, ROOT / f"{prefix}.png")

    save_set("favicon-light", icon_light)
    save_set("favicon-dark", icon_dark)

    # 터치 아이콘: 투명 유지( iOS는 자체 배경 처리 )
    touch = icon_light.resize((180, 180), Image.Resampling.LANCZOS)
    touch.save(ROOT / "apple-touch-icon.png", optimize=True, compress_level=9)

    # 구버전/호환 파일명 (투명 라이트 = 기본)
    sizes = {"favicon-32x32.png": 32, "favicon-16x16.png": 16, "favicon.png": 48}
    for name, sz in sizes.items():
        icon_light.resize((sz, sz), Image.Resampling.LANCZOS).save(
            ROOT / name, optimize=True, compress_level=9
        )

    # 루트 favicon.ico — 구글 검색 등이 기본으로 요청 (48/32/16 다중 삽입)
    _fl48 = icon_light.resize((48, 48), Image.Resampling.LANCZOS)
    _fl32 = icon_light.resize((32, 32), Image.Resampling.LANCZOS)
    _fl16 = icon_light.resize((16, 16), Image.Resampling.LANCZOS)
    _fl48.save(
        ROOT / "favicon.ico",
        format="ICO",
        sizes=[(48, 48), (32, 32), (16, 16)],
        append_images=[_fl32, _fl16],
    )

    print("OK: transparent favicon-light / favicon-dark + logo-white.png + favicon.ico")


if __name__ == "__main__":
    main()
