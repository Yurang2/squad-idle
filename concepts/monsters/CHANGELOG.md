# 2026-09-07 — Alpha re-export

- Replaced all three approved monster PNG paths using built-in imagegen reference edits, finalized at 1024×1024 RGBA.
- Rebuilt the pastel `sheet.png` and updated `validation.json`; all corners have alpha 0 and magenta checks pass.
- Prompt set: preserve each approved creature, left-facing pose, colors, rendering, and silhouette; replace only the background with real transparent alpha. No redesign, cropping, checkerboard, or ground shadow.
- Slime transparency was ignored on the first attempt. Regenerated against flat pure #FF00FF without spill, then keyed magenta with Pillow and a 1px feather. Fox and lakebat retain generated alpha with boundary residue cleanup.

# 2026-09-07 - Stage-1 species production

- Added 18 production PNGs and manifest under assets/monsters; copied approved fox and lakebat unchanged.
- Generated 16 species using built-in imagegen; redesigned dewslime, corrected halo failures, and replaced the initial emberlizard.
- Added species_sheet.png, species_96px.png, SPECIES_README.md, species_validation.json, production_records.json, and selected production_sources.
- Added finalize_species.py: clean_sprite() normalizes alpha/size/base; main() assembles sheets and validates RGBA, corners, chroma and coverage.
- DECISION: preserve approved alpha and padding; report near-opaque alpha >= 250 plus strict alpha=255 separately. All new sprites use 82px bottom padding.

# 2026-09-08 - M4a evolution and boss production

- Delivered 36 evolution sprites (1024×1024), 3 bosses (1280×1280), nested 18-species manifest, 3-boss manifest, labeled 18×3 evolution sheet and boss sheet.
- Added `finalize_m4a.py`: `largest_support()`, `remove_key()`, `normalize()`, `audit()`, `boards()`, `main()`; updated `verify_m4a.py` to preserve provenance and verify manifests/sheets.
- Regenerated the 10 opaque raw designs with built-in imagegen using each raw as reference; 9 real-alpha results, 1 magenta fallback (`lakebat_2`). Recorded prompts/sources under `m4a_regeneration_prompts.json` and retained outputs in `m4a_regenerated/`.
- DECISION: normalize alpha≥250 to 255, remove chroma/noise, premultiplied LANCZOS resizing, 1px defringe, preserve aspect/LEFT orientation and 82px/102px bottom padding. Pillow use explicitly authorized.
- Pillow audit: 39/39 PASS, strict opaque coverage 16.1057–34.8496%, RGBA, correct dimensions, transparent corners, zero magenta; 57 manifest paths and two boards valid. See `m4a_validation.json`/`.txt`.
- JavaScript syntax checks passed. Existing test suite has one obsolete manifest-string assertion at `test/run.js:31`; with only that comparison adapted in memory to stage `1`, all 43 tests pass. On-disk test is outside permitted write scope and remains unchanged.
