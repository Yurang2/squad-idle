# 2026-09-07 — Alpha re-export

- Replaced all four approved character PNG paths using built-in imagegen reference edits, finalized at 1024×1024 RGBA.
- Added `reexport_alpha.py` to finalize the seven generated images; updated `build_review.py` with alpha, corner, size, and magenta assertions.
- Rebuilt the pastel `sheet.png` and updated `validation.json`.
- Prompt set: preserve the corresponding approved design, pose, colors, rendering, and facing; replace only the background with real transparent alpha. Side/capture and companion face right; front retains its original view. No redesign, cropping, checkerboard, or ground shadow.
- Cleaned saturated boundary residue while retaining generated alpha. Changes are confined to the two requested concept folders.
