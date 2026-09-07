"""Normalize built-in image_gen outputs using preinstalled Pillow; no network."""
import json
import sys
from pathlib import Path
from PIL import Image

source, destination, size = sys.argv[1], Path(sys.argv[2]), int(sys.argv[3])
im = Image.open(source).convert('RGBA')
method = 'native alpha preserved'
if '/bg/' in destination.as_posix():
    im = im.convert('RGB').resize((1080, 760), Image.Resampling.LANCZOS)
    method = 'opaque RGB'
else:
    if im.getextrema()[3][0] == 255:
        pixels = list(im.getdata())
        magenta = sum(r > 220 and g < 45 and b > 220 for r, g, b, a in pixels)
        if magenta < len(pixels) * .05:
            raise RuntimeError('Opaque non-magenta background; regeneration required')
        im.putdata([(r, g, b, 0 if r > 220 and g < 45 and b > 220 else a)
                    for r, g, b, a in pixels])
        method = 'magenta removed to alpha with preinstalled Pillow'
    bbox = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(bbox)
    icon = '/icon/' in destination.as_posix()
    im.thumbnail((round(size * .8), round(size * (.8 if icon else .85))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size))
    y = (size - im.height) // 2 if icon else round(size * .95) - im.height
    canvas.alpha_composite(im, ((size - im.width) // 2, y))
    im = canvas
destination.parent.mkdir(parents=True, exist_ok=True)
im.save(destination, optimize=True)
record = dict(path=destination.as_posix(), source=source, dimensions=im.size,
              bytes=destination.stat().st_size, transparency=method)
with open('assets/generation_log.jsonl', 'a', encoding='utf-8') as log:
    log.write(json.dumps(record) + '\n')
print(json.dumps(record))
