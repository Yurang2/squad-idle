"""Finalize built-in generated facilities; draw the deliberately sparse ground strip.

No image APIs. Pillow only resizes, validates alpha, and applies the authorized
magenta fallback to pen. Source files stay in Codex's generated_images folder.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / '.codex/generated_images/01a07c8c-fc93-7510-ab9c-8c3e2a643f36'
OUT = ROOT / 'assets/camp'
FILES = {
    'campfire': '2ceaaeef-1629-469a-8095-04a1e9e065b0',
    'pen': '8de5d3ae-ded2-4466-aa4e-d6be9d73bb98',
    'workshop': '75c9bc31-81c3-43c4-82dc-f4226a0f2267',
    'altar': 'e7fb10db-6389-4e8d-9172-94b01754bd50',
    'storehouse': '986eef4d-a4a4-4cdf-bc9d-dad2f4091c52',
    'garden': 'cfa86305-664d-4017-9d6f-ff14fc724002',
}


def facilities():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, uid in FILES.items():
        im = Image.open(SOURCE / ('exec-' + uid + '.png')).convert('RGBA')
        if name == 'pen':
            pixels = []
            for r, g, b, a in im.getdata():
                spill = min(r, b) - g
                if spill > 60 and r > 160 and b > 160:
                    a = max(0, round(255 * (1 - min(1, (spill - 60) / 70))))
                    # Despill antialias edges before downsampling the key.
                    r = min(r, g + 25)
                    b = min(b, g + 25)
                pixels.append((r, g, b, a))
            im.putdata(pixels)
        im = im.resize((688, 688), Image.Resampling.LANCZOS)
        padded = Image.new('RGBA', (768, 768), (0, 0, 0, 0))
        padded.paste(im, (40, 40))
        im = padded
        im.save(OUT / (name + '.png'), optimize=True)


def ground():
    # DECISION: User restricts image generation to six facilities. Three sparse
    # procedural layers implement STYLE section 4 without generating a seventh.
    im = Image.new('RGB', (2048, 640))
    draw = ImageDraw.Draw(im)
    top, bottom = (254, 244, 231), (251, 232, 223)
    for y in range(640):
        t = min(1, y / 280)
        draw.line((0, y, 2048, y), fill=tuple(round(a+(b-a)*t) for a, b in zip(top, bottom)))
    hills = [(x, int(165 + 13*math.sin(x/145) + 9*math.sin(x/77))) for x in range(0, 2049, 4)]
    draw.polygon(hills + [(2048, 227), (0, 227)], fill='#E6D8DF')
    bank = [(x, int(273 + 16*math.sin(x/270))) for x in range(0, 2049, 4)]
    draw.polygon(bank + [(2048, 640), (0, 640)], fill='#F7EEE5')
    meadow = [(x, int(380 + 27*math.sin(x/340))) for x in range(0, 2049, 4)]
    draw.polygon(meadow + [(2048, 640), (0, 640)], fill='#EDE5DE')
    im.save(OUT / 'ground.png', optimize=True)


def verify():
    for name in FILES:
        im = Image.open(OUT / (name + '.png'))
        assert im.mode == 'RGBA' and im.size == (768, 768), name
        for x, y in [(0, 0), (752, 0), (0, 752), (752, 752)]:
            assert im.getchannel('A').crop((x, y, x+16, y+16)).getextrema() == (0, 0), name
        assert im.getchannel('A').getextrema() == (0, 255), name
        print('PASS RGBA / 768 square / transparent corners:', name)
    im = Image.open(OUT / 'ground.png')
    assert im.mode == 'RGB' and im.size == (2048, 640)
    print('PASS opaque RGB / 2048x640 / three sparse layers: ground')


if __name__ == '__main__':
    import sys
    if '--verify' not in sys.argv:
        facilities()
        ground()
    verify()
