"""Build the English / Japanese / Korean sound-effect lettering.

Turns each word into one SVG path (glyph outlines from the font, each glyph tilted and
nudged a little so the word looks hand-lettered) and writes:

  sakuga-sfx-paths.intl.js   window.OA_SFX_SETS = { en: {...}, ja: {...}, ko: {...} }
  images/sfx/<lang>/<id>.svg  the same paths as standalone SVG files

Same format as sakuga-sfx-paths.js (the Chinese set): id: [width, height, SVG path].

Fonts are not in the repo. Download them into one folder and pass it with --fonts:
  Bangers-Regular.ttf       https://github.com/google/fonts/tree/main/ofl/bangers      (SIL OFL 1.1)
  NotoSansCJKjp-Black.otf   https://github.com/notofonts/noto-cjk/tree/main/Sans/OTF   (SIL OFL 1.1)
  NotoSansCJKkr-Black.otf   https://github.com/notofonts/noto-cjk/tree/main/Sans/OTF   (SIL OFL 1.1)

Usage: python scripts/build-sfx-intl.py --fonts <folder>
"""
import argparse
import json
import math
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent

# Same ids, same order as the Chinese set (sakuga-sfx-paths.js), so every effect keeps working.
WORDS = {
    'en': {'font': 'Bangers-Regular.ttf', 'track': 0.02, 'tilt': 5, 'words': {
        'dong': 'THUD!', 'peng': 'BANG!', 'shua': 'SWISH!', 'ding': 'DING!', 'pa': 'WHAP!', 'xiu': 'ZIP!',
        'hong': 'RUMBLE', 'ka': 'CLICK!', 'bo': 'POP!', 'cha': 'SNAP!', 'lulu': 'WHIRR!'}},
    'ja': {'font': 'NotoSansCJKjp-Black.otf', 'track': -0.03, 'tilt': 8, 'tight': True, 'words': {
        'dong': 'ドン！', 'peng': 'バン！', 'shua': 'シュッ', 'ding': 'チーン', 'pa': 'パシッ', 'xiu': 'ヒュッ',
        'hong': 'ゴゴゴ', 'ka': 'カチッ', 'bo': 'ポン！', 'cha': 'パチッ', 'lulu': 'クルクル'}},
    'ko': {'font': 'NotoSansCJKkr-Black.otf', 'track': -0.03, 'tilt': 8, 'tight': True, 'words': {
        'dong': '쿵!', 'peng': '쾅!', 'shua': '슉!', 'ding': '띵!', 'pa': '탁!', 'xiu': '휙~',
        'hong': '우르릉', 'ka': '딸깍!', 'bo': '뽕!', 'cha': '착!', 'lulu': '빙글~'}},
}

HEIGHT = 112      # target word height in path units (the Chinese set is 105–123; the 15-unit outline is tuned for it)
MARGIN = 6
# Per-glyph tilt (fraction of the language's max tilt) and vertical nudge (fraction of the em).
TILT = [-1.0, 0.7, -0.5, 0.85, -0.75, 0.55, -0.9]
NUDGE = [0.0, -0.05, 0.04, -0.03, 0.05, -0.04, 0.02]
PUNCT = set('!！~～')


def glyph_name(font, ch):
    name = font.getBestCmap().get(ord(ch))
    if name is None:
        raise SystemExit(f'{ch!r} is not in {font.reader.file.name}')
    return name


def build_word(font, glyphs, text, track, tilt, tight=False):
    """tight: pack glyphs by their ink bounds instead of their advance width (CJK full-width
    punctuation and small kana would otherwise leave big gaps)."""
    upm = font['head'].unitsPerEm
    hmtx = font['hmtx']
    placed, x = [], 0.0
    for i, ch in enumerate(text):
        name = glyph_name(font, ch)
        adv = hmtx[name][0]
        b = BoundsPen(glyphs)
        glyphs[name].draw(b)
        if b.bounds is None:          # space-like glyph
            x += adv + track * upm
            continue
        x0, y0, x1, y1 = b.bounds
        if tight:                     # left ink edge sits at the cursor
            x -= x0
            adv = x1
        cx, cy = x + (x0 + x1) / 2, (y0 + y1) / 2
        ang = math.radians(TILT[i % len(TILT)] * tilt * (0.5 if ch in PUNCT else 1))
        dy = NUDGE[i % len(NUDGE)] * upm
        c, s = math.cos(ang), math.sin(ang)
        # font units (y up) → place at x, rotate about the glyph centre, nudge, flip y
        # p' = R·(p + (x,0) - C) + C + (0,dy);  then y → -y
        tx = cx - c * cx + s * cy + c * x
        ty = cy - s * cx - c * cy + s * x + dy
        placed.append((name, (c, s, -s, c, tx, ty)))
        x += adv + track * upm

    def draw(pen):
        for name, (a, b_, c_, d, e, f) in placed:
            glyphs[name].draw(TransformPen(pen, (a, -b_, c_, -d, e, -f)))

    bp = BoundsPen(glyphs)
    draw(bp)
    bx0, by0, bx1, by1 = bp.bounds
    k = HEIGHT / (by1 - by0)
    sp = SVGPathPen(glyphs, ntos=lambda v: f'{round(v, 1):g}')
    draw(TransformPen(sp, (k, 0, 0, k, MARGIN - bx0 * k, MARGIN - by0 * k)))
    w = math.ceil((bx1 - bx0) * k + MARGIN * 2)
    h = math.ceil(HEIGHT + MARGIN * 2)
    return [w, h, sp.getCommands()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fonts', required=True, type=Path)
    args = ap.parse_args()

    sets = {}
    for lang, cfg in WORDS.items():
        font = TTFont(args.fonts / cfg['font'])
        glyphs = font.getGlyphSet()
        out = {}
        for sid, text in cfg['words'].items():
            out[sid] = build_word(font, glyphs, text, cfg['track'], cfg['tilt'], cfg.get('tight', False))
            w, h, d = out[sid]
            svg_dir = ROOT / 'images' / 'sfx' / lang
            svg_dir.mkdir(parents=True, exist_ok=True)
            (svg_dir / f'{sid}.svg').write_text(
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
                f'role="img" aria-label="{text}"><title>{text}</title><path d="{d}"/></svg>\n', encoding='utf-8')
        sets[lang] = out
        print(lang, {k: v[:2] for k, v in out.items()})

    js = ('/* 由 scripts/build-sfx-intl.py 產生，請勿手動修改。\n'
          '   英文：Bangers；日文：Noto Sans CJK JP Black；韓文：Noto Sans CJK KR Black（皆為 SIL OFL 1.1）。\n'
          '   格式與 sakuga-sfx-paths.js 相同：id: [寬, 高, SVG path] */\n'
          f'window.OA_SFX_SETS = {json.dumps(sets, ensure_ascii=False, separators=(",", ":"))};\n')
    (ROOT / 'sakuga-sfx-paths.intl.js').write_text(js, encoding='utf-8')


if __name__ == '__main__':
    main()
