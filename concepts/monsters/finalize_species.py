"""Pillow-only sprite normalization, board assembly and production verification."""
import hashlib
import json
import re
import shutil
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CONCEPTS = ROOT / 'concepts/monsters'
ASSETS = ROOT / 'assets/monsters'

def clean_sprite(source):
    im = Image.open(source).convert('RGBA')
    # Remove saturated chroma-key spill; retained creature colors are pastel.
    pixels = []
    for r, g, b, a in im.getdata():
        if (max(r, g, b) - min(r, g, b) > 190 and min(r, g, b) < 65) or (r > 180 and b > 180 and g < 100):
            a = 0
        pixels.append((r, g, b, a) if a else (0, 0, 0, 0))
    im.putdata(pixels)
    alpha = im.getchannel('A')
    # One source-pixel inward feather suppresses keyed edge specks.
    alpha = ImageChops.darker(alpha, alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.5)))
    im.putalpha(alpha)
    box = alpha.point(lambda a: 255 if a > 16 else 0).getbbox()
    im = im.crop(box)
    scale = min(880 / im.width, 850 / im.height)
    opaque = sum(a >= 250 for a in im.getchannel('A').getdata())
    if opaque * scale * scale < 0.17 * 1024 * 1024:
        scale = min((0.17 * 1024 * 1024 / opaque) ** 0.5, 960 / im.width, 900 / im.height)
    if opaque * scale * scale > 0.43 * 1024 * 1024:
        scale = (0.43 * 1024 * 1024 / opaque) ** 0.5
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', (1024, 1024))
    out.alpha_composite(im, ((1024-im.width)//2, 942-im.height))
    out.putdata([(0,0,0,0) if a < 4 or (r > 180 and b > 180 and g < 100) else (r,g,b,a) for r,g,b,a in out.getdata()])
    return out

def main():
    records = json.loads((CONCEPTS / 'production_records.json').read_text(encoding='utf-8-sig'))
    rows = re.findall(r'^\| ([a-z]+) \| ([^|]+) \|', (ROOT / 'MONSTERS.md').read_text(encoding='utf-8'), re.M)
    rows = [(i, n.strip()) for i, n in rows if i != 'id']
    by_id = {r['id']: r for r in records}
    for ident, name in rows:
        if ident in ('mistfox', 'lakebat'):
            src = CONCEPTS / ('fox_wild.png' if ident == 'mistfox' else 'lakebat.png')
            shutil.copyfile(src, ASSETS / (ident+'.png'))
        elif ident in by_id:
            clean_sprite(by_id[ident]['source']).save(ASSETS / (ident+'.png'))
    available = [(i,n) for i,n in rows if (ASSETS/(i+'.png')).exists()]
    fontpath = 'C:/Windows/Fonts/malgun.ttf'
    font = ImageFont.truetype(fontpath, 23)
    small = ImageFont.truetype(fontpath, 19)
    title = ImageFont.truetype(fontpath, 34)
    board = Image.new('RGB', (2040, 1350), '#FEF4E7')
    d = ImageDraw.Draw(board)
    d.text((40, 22), 'STAGE 1 · 파스텔 새벽 도감', font=title, fill='#7B6C6D')
    regions = ['안개 호수 · LAKE', '서리 능선 · RIDGE', '노을 절벽 · CLIFF']
    backgrounds = ['#F2E8EC', '#E5ECF2', '#F7E5DC']
    mini = Image.new('RGB', (1440, 500), '#FBE8DF')
    md = ImageDraw.Draw(mini)
    for k, (ident, name) in enumerate(rows):
        row, col = divmod(k, 6)
        x, y = col * 340, 85 + row * 415
        if col == 0:
            d.rectangle((0,y,2040,y+409), fill=backgrounds[row])
            d.text((24,y+7), regions[row], font=small, fill='#7B6C6D')
        path = ASSETS/(ident+'.png')
        if not path.exists():
            continue
        im = Image.open(path)
        thumb = im.resize((320,320), Image.Resampling.LANCZOS)
        board.paste(thumb, (x+10,y+38), thumb)
        d.text((x+170,y+358), ident, anchor='mt', font=font, fill='#7B6C6D')
        d.text((x+170,y+386), name, anchor='mt', font=small, fill='#7B6C6D')
        crop = im.crop(im.getchannel('A').getbbox())
        crop = crop.resize((round(crop.width*96/crop.height),96),Image.Resampling.LANCZOS)
        mx,my = col*240,row*165
        mini.paste(crop,(mx+(240-crop.width)//2,my+5),crop)
        md.text((mx+120,my+111),ident,anchor='mt',font=small,fill='#7B6C6D')
    board.save(CONCEPTS/'species_sheet.png')
    mini.save(CONCEPTS/'species_96px.png')
    report = []
    print('Opaque coverage uses alpha >= 250; strict alpha=255 coverage is saved separately.')
    print('id                 opaque%  occupied%  bottom px  RGBA  corners  magenta')
    for ident, name in available:
        im = Image.open(ASSETS/(ident+'.png'))
        pixels=list(im.getdata())
        opaque=sum(p[3]>=250 for p in pixels)/len(pixels)*100
        strict=sum(p[3]==255 for p in pixels)/len(pixels)*100
        occupied=sum(p[3]>0 for p in pixels)/len(pixels)*100
        magenta=sum(r>180 and b>180 and g<100 and a>0 for r,g,b,a in pixels)
        corners=all(im.getpixel(p)[3]==0 for p in [(0,0),(1023,0),(0,1023),(1023,1023)])
        bottom=1024-im.getchannel('A').getbbox()[3]
        assert im.mode=='RGBA' and im.size==(1024,1024) and corners and magenta==0, ident
        assert 15 <= opaque <= 45, (ident, opaque)
        print(f'{ident:18} {opaque:7.2f} {occupied:10.2f} {bottom:10}  yes   yes      {magenta}')
        report.append(dict(id=ident,opaque_alpha_threshold=250,opaque_percent=round(opaque,2),strict_alpha255_percent=round(strict,2),occupied_percent=round(occupied,2),bottom_padding_px=bottom,magenta_pixels=magenta,transparent_corners=corners))
    (CONCEPTS/'species_validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if len(available)==18:
        (ASSETS/'manifest.json').write_text(json.dumps({i:f'assets/monsters/{i}.png' for i,n in rows},indent=2)+'\n',encoding='utf-8')
    print(f'Verified {len(available)}/18 sprites.')

if __name__ == '__main__':
    main()
