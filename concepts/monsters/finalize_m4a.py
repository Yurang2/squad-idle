"""M4a: authorized Pillow normalization, manifests, pastel boards and audit."""
import json
import math
import re
from collections import deque
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'concepts/monsters'
IDS = 'mistfox lakebat dewslime reedheron pondturtle glowmoth snowhare ridgegoat frostowl icewolf crystalbeetle cloudram emberlizard cliffhawk sandpangolin duskcat rockcrab windserpent'.split()
BOSSES = 'lake_heron_lord ridge_goat_king cliff_hawk_sovereign'.split()
LANCZOS = Image.Resampling.LANCZOS


def largest_support(alpha):
    """Discard detached background specks, retaining a generous subject envelope."""
    small = alpha.resize((256, 256), Image.Resampling.BOX)
    values = list(small.getdata())
    remaining = {i for i, a in enumerate(values) if a >= 48}
    groups = []
    while remaining:
        seed = remaining.pop()
        group, queue = [seed], deque([seed])
        while queue:
            p = queue.popleft()
            x, y = p % 256, p // 256
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if 0 <= x + dx < 256 and 0 <= y + dy < 256:
                        q = (y + dy) * 256 + x + dx
                        if q in remaining:
                            remaining.remove(q)
                            group.append(q)
                            queue.append(q)
        groups.append(group)
    main = max(groups, key=len)
    support = Image.new('L', (256, 256))
    pixels = [0] * 65536
    # DECISION: tiny disconnected pixel islands are generator noise, not anatomy.
    for group in groups:
        if len(group) >= max(12, len(main) * .002):
            for p in group:
                pixels[p] = 255
    support.putdata(pixels)
    return support.filter(ImageFilter.MaxFilter(5)).resize(alpha.size, Image.Resampling.NEAREST)


def remove_key(im):
    """Soft chroma distance matte; no package or external background-removal API."""
    pixels = []
    for r, g, b, a in im.getdata():
        strength = min(r, b) - g
        # Pastel violet is retained; the generated saturated magenta key is removed.
        key = max(0., min(1., (strength - 65) / 75))
        alpha = round(a * (1 - key))
        pixels.append((r, g, b, alpha))
    im.putdata(pixels)
    a = im.getchannel('A')
    # One-pixel feather, limited to the original matte, avoids outward colored halos.
    im.putalpha(ImageChops.darker(a, a.filter(ImageFilter.GaussianBlur(.5))))
    return im


def normalize(source, size, keyed=False):
    im = Image.open(source).convert('RGBA')
    if keyed:
        im = remove_key(im)
    elif im.getchannel('A').getextrema()[0] == 255:
        raise ValueError(f'Opaque source requires regeneration/keying: {source}')
    pixels = []
    for r, g, b, a in im.getdata():
        if (r > 180 and b > 180 and g < 100) or a <= 16:
            a = 0
        # DECISION: raw opaque interiors cluster at 251-253. Snap only >=250.
        elif a >= 250:
            a = 255
        pixels.append((r, g, b, a) if a else (0, 0, 0, 0))
    im.putdata(pixels)
    alpha = im.getchannel('A')
    alpha = ImageChops.multiply(alpha, largest_support(alpha))
    im.putalpha(alpha)
    bbox = alpha.getbbox()
    im = im.crop(bbox)
    a = im.getchannel('A')
    opaque = a.histogram()[255]
    scale = min(size * .84 / im.width, size * .84 / im.height)
    if opaque * scale * scale < size * size * .18:
        scale = min(math.sqrt(size * size * .18 / max(1, opaque)),
                    size * .94 / im.width, size * .90 / im.height)
    if opaque * scale * scale > size * size * .46:
        scale = math.sqrt(size * size * .46 / opaque)
    # Explicit premultiplication prevents hidden transparent RGB from bleeding in.
    im = im.convert('RGBa').resize((round(im.width * scale), round(im.height * scale)), LANCZOS).convert('RGBA')
    alpha = im.getchannel('A')
    # Exactly one output pixel of inward defringe, with a soft subpixel contour.
    alpha = ImageChops.darker(alpha, alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.35)))
    im.putalpha(alpha)
    pixels = []
    for r, g, b, a in im.getdata():
        if a < 8 or (r > 180 and b > 180 and g < 100):
            pixels.append((0, 0, 0, 0))
        else:
            pixels.append((r, g, b, 255 if a >= 250 else a))
    im.putdata(pixels)
    im = im.crop(im.getchannel('A').getbbox())
    out = Image.new('RGBA', (size, size))
    out.alpha_composite(im, ((size - im.width) // 2, size - round(size * .08) - im.height))
    return out, {'source_bbox': list(bbox), 'scale': scale, 'keyed': keyed,
                 'bottom_padding_px': round(size * .08), 'facing': 'left',
                 'resize': 'premultiplied RGBa LANCZOS', 'defringe_output_px': 1}


def audit(path, size):
    if not path.exists():
        return {'exists': False, 'pass': False}
    with Image.open(path) as im:
        rgba = im.convert('RGBA')
        a = rgba.getchannel('A')
        h = a.histogram()
        total = im.width * im.height
        corners = [a.crop(b).getextrema()[1] == 0 for b in
                   [(0, 0, 16, 16), (im.width-16, 0, im.width, 16),
                    (0, im.height-16, 16, im.height),
                    (im.width-16, im.height-16, im.width, im.height)]]
        magenta = sum(r > 180 and b > 180 and g < 100 and alpha > 0
                      for r, g, b, alpha in rgba.getdata())
        opaque = h[255] / total * 100
        box = a.getbbox()
        result = dict(exists=True, size=list(im.size), mode=im.mode,
                      size_pass=im.size == (size, size), transparent_corners=all(corners),
                      magenta_pixels=magenta, opaque_alpha255_pct=round(opaque, 4),
                      alpha128_plus_pct=round(sum(h[128:]) / total * 100, 4),
                      opaque_15_to_50_pass=15 <= opaque <= 50,
                      alpha_bbox=list(box) if box else None,
                      bottom_padding_px=im.height-box[3] if box else None)
        result['pass'] = (im.mode == 'RGBA' and result['size_pass'] and all(corners)
                          and magenta == 0 and result['opaque_15_to_50_pass'])
        return result


def boards():
    fontpath = 'C:/Windows/Fonts/malgun.ttf'
    fonts = {s: ImageFont.truetype(fontpath, s) for s in (20, 24, 30, 44)}
    names = dict((i, n.strip()) for i, n in re.findall(
        r'^\| ([a-z]+) \| ([^|]+) \|', (ROOT/'MONSTERS.md').read_text(encoding='utf-8'), re.M))
    width, cell, header = 1440, 440, 160
    board = Image.new('RGB', (width, header + 18 * cell + 30), '#FEF4E7')
    d = ImageDraw.Draw(board)
    d.text((40, 20), '진화 도감 · M4a', font=fonts[44], fill='#7B6C6D')
    for col, label in enumerate(('1단계 · 기본', '2단계 · 성장', '3단계 · 장엄')):
        d.text((240 + col*480, 112), label, anchor='mm', font=fonts[30], fill='#7B6C6D')
    colors = ['#F2E8EC', '#E5ECF2', '#F7E5DC']
    regions = ['안개 호수', '서리 능선', '노을 절벽']
    for row, ident in enumerate(IDS):
        y = header + row * cell
        d.rectangle((20, y+5, width-20, y+cell-5), fill=colors[row//6])
        d.text((40, y+15), f'{row+1:02}  {names.get(ident, ident)} / {ident} · {regions[row//6]}',
               font=fonts[24], fill='#7B6C6D')
        for col, stage in enumerate((1, 2, 3)):
            suffix = '' if stage == 1 else f'_{stage}'
            path = ROOT/f'assets/monsters/{ident}{suffix}.png'
            im = Image.open(path).convert('RGBA').resize((385, 385), LANCZOS)
            board.paste(im, (col*480+48, y+47), im)
    board.save(BASE/'evolution_sheet.png')
    boss = Image.new('RGB', (1920, 840), '#FEF4E7')
    d = ImageDraw.Draw(boss)
    d.text((36, 22), '지역의 군주 · M4a', font=fonts[44], fill='#7B6C6D')
    titles = ['호수의 거대 왜가리', '능선의 산양 왕', '절벽의 노을 매 군주']
    for col, ident in enumerate(BOSSES):
        x = col*640
        d.rounded_rectangle((x+15, 110, x+625, 815), radius=22, fill=colors[col])
        im = Image.open(ROOT/f'assets/bosses/{ident}.png').resize((600, 600), LANCZOS)
        boss.paste(im, (x+20, 130), im)
        d.text((x+320, 734), titles[col], anchor='mt', font=fonts[30], fill='#7B6C6D')
        d.text((x+320, 781), ident, anchor='mt', font=fonts[20], fill='#7B6C6D')
    boss.save(BASE/'boss_sheet.png')


def main():
    old = json.loads((BASE/'m4a_validation.json').read_text(encoding='utf-8'))
    records = old['records']
    for row in records:
        name = row['name']
        size = 1280 if name in BOSSES else 1024
        raw = ROOT/row['raw']
        source, keyed = raw, False
        key_path = BASE/f'm4a_regenerated/{name}_key.png'
        transparent = BASE/f'm4a_regenerated/{name}_transparent.png'
        if Image.open(raw).mode == 'RGB':
            if key_path.exists():
                source, keyed = key_path, True
            elif transparent.exists() and Image.open(transparent).convert('RGBA').getchannel('A').getextrema()[0] < 255:
                source = transparent
            else:
                print(f'PENDING {name}', flush=True)
                continue
        out, processing = normalize(source, size, keyed)
        target = ROOT/row['target']
        target.parent.mkdir(parents=True, exist_ok=True)
        out.save(target)
        row['processing'] = dict(source=source.relative_to(ROOT).as_posix(), **processing)
        print(f'FINALIZED {name}', flush=True)
    lines = ['name                       size       mode  corners  magenta  opaque255%  bottom  result']
    for row in records:
        c = audit(ROOT/row['target'], 1280 if row['name'] in BOSSES else 1024)
        row['production_checks'] = c
        if not c['exists']:
            lines.append(f'{row["name"]:26} MISSING')
        else:
            lines.append(f'{row["name"]:26} {c["size"][0]}x{c["size"][1]}  {c["mode"]:4}  '
                         f'{str(c["transparent_corners"]):7}  {c["magenta_pixels"]:7}  '
                         f'{c["opaque_alpha255_pct"]:10.4f}  {c["bottom_padding_px"]:6}  '
                         f'{"PASS" if c["pass"] else "FAIL"}')
    count = sum(r['production_checks']['exists'] for r in records)
    passed = sum(r['production_checks']['pass'] for r in records)
    report = dict(generator='built-in image_gen', expected=39, raw_count=39,
                  production_count=count, passed_count=passed,
                  opaque_definition='alpha == 255; full canvas denominator',
                  records=records)
    (BASE/'m4a_validation.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    lines.append(f'Finalized {count}/39; passed {passed}/39.')
    table = '\n'.join(lines)+'\n'
    (BASE/'m4a_validation.txt').write_text(table, encoding='utf-8')
    print(table)
    if passed == 39:
        monster_manifest = {i: {str(s): f'assets/monsters/{i}{"" if s == 1 else "_"+str(s)}.png'
                                for s in (1, 2, 3)} for i in IDS}
        boss_manifest = {i: f'assets/bosses/{i}.png' for i in BOSSES}
        for path, data in [('assets/monsters/manifest.json', monster_manifest), ('assets/bosses/manifest.json', boss_manifest)]:
            (ROOT/path).write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')
        boards()


if __name__ == '__main__':
    main()
