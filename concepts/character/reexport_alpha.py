"""Finalize built-in imagegen exports; writes only the two concept folders."""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path('C:/Users/dklee/.codex/generated_images/01a07c2e-2b8b-7ad0-941b-1629c91f923a')
EXPORTS = {
    'character/tamer_front': 'bcf41713-43b8-43ad-b294-c590f35d85f1',
    'character/tamer_side': 'b4841785-4a8b-4a1f-9469-d7b2f771e13b',
    'character/tamer_capture': '8f10ccdc-d436-41a6-98af-c0e279177941',
    'character/fox_companion': '47d72f72-204b-4b03-88df-e5d7f344a2e8',
    'monsters/slime_pastel': 'c58124f4-673e-4da0-995f-80a5002c079a',
    'monsters/fox_wild': '8d29621b-a480-4f96-81ce-9f00482cc345',
    'monsters/lakebat': '31366a46-6908-4ef5-80f9-b5f4d5c372e1',
}

def magenta(rgb):
    r, g, b = (rgb[:, :, i].astype(int) for i in range(3))
    return (r > 140) & (b > 140) & (np.minimum(r, b) - g > 60)

for name, source_id in EXPORTS.items():
    im = Image.open(SOURCE / ('exec-' + source_id + '.png')).convert('RGBA')
    pixels = np.array(im)
    rgb = pixels[:, :, :3]
    alpha = pixels[:, :, 3].copy()
    if name.endswith('slime_pastel'):
        # DECISION: requested chroma-key fallback, with a one-pixel inward feather.
        keyed = magenta(rgb)
        alpha[keyed] = 0
        mask = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3))
        alpha = np.minimum(alpha, np.array(mask.filter(ImageFilter.GaussianBlur(1))))
    else:
        # Remove saturated export fringe only within the existing alpha boundary.
        inner = np.array(Image.fromarray(alpha).filter(ImageFilter.MinFilter(9)))
        hi = rgb.max(axis=2).astype(int)
        lo = rgb.min(axis=2).astype(int)
        fringe = (inner < 250) & ((hi - lo) > 150)
        alpha[fringe | magenta(rgb)] = 0
        mask = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3))
        alpha = np.minimum(alpha, np.array(mask.filter(ImageFilter.GaussianBlur(0.4))))
    pixels[:, :, 3] = alpha
    pixels[alpha == 0] = 0
    im = Image.fromarray(pixels).resize((1024, 1024), Image.Resampling.LANCZOS)
    pixels = np.array(im)
    pixels[magenta(pixels[:, :, :3])] = 0
    pixels[pixels[:, :, 3] < 3] = 0
    Image.fromarray(pixels).save(ROOT / 'concepts' / (name + '.png'))
    print('Saved', name, 'RGBA 1024x1024')
