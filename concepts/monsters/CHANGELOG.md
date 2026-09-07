# 2026-09-07 — Alpha re-export

- Replaced all three approved monster PNG paths using built-in imagegen reference edits, finalized at 1024×1024 RGBA.
- Rebuilt the pastel `sheet.png` and updated `validation.json`; all corners have alpha 0 and magenta checks pass.
- Prompt set: preserve each approved creature, left-facing pose, colors, rendering, and silhouette; replace only the background with real transparent alpha. No redesign, cropping, checkerboard, or ground shadow.
- Slime transparency was ignored on the first attempt. Regenerated against flat pure #FF00FF without spill, then keyed magenta with Pillow and a 1px feather. Fox and lakebat retain generated alpha with boundary residue cleanup.
