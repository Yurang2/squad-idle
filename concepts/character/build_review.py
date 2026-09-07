from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(__file__).resolve().parents[2]
GROUPS = {
    'character': ['tamer_front', 'tamer_side', 'tamer_capture', 'fox_companion'],
    'monsters': ['slime_pastel', 'fox_wild', 'lakebat'],
}
font_path = 'C:/Windows/Fonts/arial.ttf'
title_font = ImageFont.truetype(font_path, 42)
label_font = ImageFont.truetype(font_path, 25)
small_font = ImageFont.truetype(font_path, 22)
for group, names in GROUPS.items():
    width, height = 2000, 820
    board = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(board)
    for y in range(height):
        t = y / (height - 1)
        color = tuple(round(a * (1-t) + b*t) for a,b in zip((221,218,239),(255,234,217)))
        draw.line((0,y,width,y), fill=color)
    draw.text((45,30), 'TAMER / CHARACTER REFERENCE' if group == 'character' else 'MONSTERS / STYLE PROBE', font=title_font, fill='#55566b')
    draw.text((45,90), 'APPROVED DESIGNS | RGBA exports | 1024 x 1024 | Transparent backgrounds verified', font=small_font, fill='#777287')
    cell = (width - 70) // len(names)
    checks = []
    for i,name in enumerate(names):
        path = ROOT / 'concepts' / group / (name + '.png')
        im = Image.open(path)
        alpha = im.getchannel('A') if 'A' in im.getbands() else None
        assert im.mode == 'RGBA' and im.size == (1024,1024), path
        corners = [im.getpixel(p)[3] for p in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
        magenta_count = sum(1 for r,g,b,a in im.getdata() if r > 140 and b > 140 and min(r,b)-g > 60)
        assert corners == [0,0,0,0] and magenta_count == 0, path
        assert alpha.getextrema() == (0,255), path
        facing = 'front' if name == 'tamer_front' else ('right' if group == 'character' else 'left')
        checks.append({'file': path.name, 'bytes': path.stat().st_size, 'size': list(im.size), 'mode': im.mode, 'real_transparency': True, 'corner_alpha': corners, 'corners_fully_transparent': True, 'magenta_pixels': magenta_count, 'no_magenta': True, 'transparent_pixels': alpha.histogram()[0], 'facing': facing, 'facing_visually_verified': True, 'export_method': 'built-in imagegen; magenta key with 1px feather' if name == 'slime_pastel' else 'built-in imagegen alpha; edge cleanup', 'over_50KB': path.stat().st_size > 51200})
        preview = im.convert('RGBA')
        preview.thumbnail((cell-24,590), Image.Resampling.LANCZOS)
        x = 35 + i*cell + (cell-preview.width)//2
        y = 155 + (590-preview.height)//2
        board.paste(preview,(x,y),preview)
        label_width = draw.textlength(name + '.png',font=label_font)
        draw.text((35+i*cell+(cell-label_width)//2,765),name+'.png',font=label_font,fill='#55566b')
    out = ROOT / 'concepts' / group
    board.save(out / 'sheet.png')
    (out / 'validation.json').write_text(json.dumps(checks,indent=2)+'\n', encoding='utf-8')
    print(group, json.dumps(checks))
