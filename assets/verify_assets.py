"""Verify all 31 specified PNG deliverables and local contact-sheet references."""
import json
from pathlib import Path
from PIL import Image

spec = json.loads(Path('assets/prompts.json').read_text(encoding='utf-8-sig'))
manifest = json.loads(Path('assets/manifest.json').read_text(encoding='utf-8'))
sheet = Path('assets/contact_sheet.html').read_text(encoding='utf-8')
assert len(spec) == len(manifest) == 31
records = []
for entry in spec:
    path = Path(entry['path'])
    assert manifest[entry['key']] == entry['path']
    assert path.is_file(), path
    assert path.stat().st_size > 10240, path
    with Image.open(path) as image:
        assert image.format == 'PNG', path
        image.load()
        expected = (1080, 760) if entry['size'] == 1080 else (entry['size'],) * 2
        assert image.size == expected, path
        alpha = image.convert('RGBA').getchannel('A')
        amin, amax = alpha.getextrema()
        if entry['key'].startswith('bg.'):
            assert amin == amax == 255, path
        else:
            assert amin == 0 and amax == 255, path
            assert all(alpha.getpixel(p) == 0 for p in [(0, 0), (0, image.height-1),
                       (image.width-1, 0), (image.width-1, image.height-1)]), path
        assert 'src="' + entry['path'][7:] + '"' in sheet, path
        records.append(dict(key=entry['key'], path=str(path).replace('\\', '/'),
                            dimensions=image.size, bytes=path.stat().st_size,
                            alphaRange=[amin, amax], passed=True))
assert len(list(Path('assets').rglob('*.png'))) == 31
report = dict(passed=True, total=31, missing=[], assets=records)
Path('assets/verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('PASS: 31/31 PNGs; exact dimensions; >10 KB each; 28 native-alpha sprites/icons; 3 opaque backgrounds; manifest and contact-sheet references valid.')
