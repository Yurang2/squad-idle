"""Pillow audit; refresh validation JSON/text while preserving production provenance."""
import json
from PIL import Image
from finalize_m4a import ROOT, BASE, IDS, BOSSES, audit


def main():
    report_path = BASE/'m4a_validation.json'
    report = json.loads(report_path.read_text(encoding='utf-8'))
    lines = ['name                       size       mode  corners  magenta  opaque255%  bottom  result']
    failures = []
    for row in report['records']:
        size = 1280 if row['name'] in BOSSES else 1024
        row['raw_checks'] = audit(ROOT/row['raw'], size)
        c = audit(ROOT/row['target'], size)
        row['production_checks'] = c
        if c['exists']:
            c['padding_pass'] = c['bottom_padding_px'] == round(size*.08)
            c['pass'] = c['pass'] and c['padding_pass']
            lines.append(f'{row["name"]:26} {size}x{size}  {c["mode"]:4}  '
                         f'{str(c["transparent_corners"]):7}  {c["magenta_pixels"]:7}  '
                         f'{c["opaque_alpha255_pct"]:10.4f}  {c["bottom_padding_px"]:6}  '
                         f'{"PASS" if c["pass"] else "FAIL"}')
        else:
            lines.append(f'{row["name"]:26} MISSING')
        if not c['pass']:
            failures.append(row['name'])
    manifest = json.loads((ROOT/'assets/monsters/manifest.json').read_text())
    assert set(manifest) == set(IDS), 'Monster manifest species mismatch'
    for ident in IDS:
        assert set(manifest[ident]) == {'1', '2', '3'}
        for stage in (1, 2, 3):
            path = f'assets/monsters/{ident}{"" if stage == 1 else "_"+str(stage)}.png'
            assert manifest[ident][str(stage)] == path and (ROOT/path).is_file(), path
    bosses = json.loads((ROOT/'assets/bosses/manifest.json').read_text())
    assert bosses == {i: f'assets/bosses/{i}.png' for i in BOSSES}
    sheets = {}
    for name, size in [('evolution_sheet.png', (1440, 8110)), ('boss_sheet.png', (1920, 840))]:
        with Image.open(BASE/name) as im:
            im.verify()
        with Image.open(BASE/name) as im:
            assert im.size == size and im.mode == 'RGB', name
            sheets[name] = dict(size=list(im.size), mode=im.mode, verified=True)
    report.update(production_count=sum(r['production_checks']['exists'] for r in report['records']),
                  passed_count=39-len(failures), manifest_paths_verified=57,
                  sheets=sheets, failures=failures)
    report_path.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    lines.append(f'Finalized {report["production_count"]}/39; passed {report["passed_count"]}/39; 57 manifest paths and 2 sheets verified.')
    table = '\n'.join(lines)+'\n'
    (BASE/'m4a_validation.txt').write_text(table, encoding='utf-8')
    print(table)
    assert len(report['records']) == 39 and not failures, failures


if __name__ == '__main__':
    main()
