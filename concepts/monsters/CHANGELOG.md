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
