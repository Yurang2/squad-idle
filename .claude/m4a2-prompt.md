Continue the M4a art task. **Permission granted: use installed Pillow freely** for resizing, alpha cleanup, fringe removal, magenta keying, and sheet assembly. Do not ask further questions; decide and record.

Inputs: your 39 raw designs in `concepts/monsters/m4a_raw/` and `concepts/monsters/m4a_validation.json`. Finish the deliverables exactly as specified in `.claude/m4a-prompt.md`:
1. For raw files that already have real alpha: resize to 1024×1024 (bosses 1280×1280) with LANCZOS, keep facing LEFT, feet/base at bottom with ~8% padding (auto-crop to alpha bbox then pad), clean fringe (premultiply-aware; defringe 1px), save to `assets/monsters/<id>_2.png` / `<id>_3.png` / `assets/bosses/<name>.png`.
2. For the ~10 raw files with opaque backgrounds: regenerate each with your image tool using that raw file as the reference (same design), requesting transparent output; if still opaque, generate on flat `#FF00FF` and key it out with Pillow (1px feather). Then process as in step 1.
3. Write `assets/monsters/manifest.json` as `{ "<id>": {"1": "assets/monsters/<id>.png", "2": ..., "3": ...}, ... }` for all 18 and `assets/bosses/manifest.json` for the 3 bosses.
4. Build `concepts/monsters/evolution_sheet.png` (18 rows × 3 columns, labeled) and `concepts/monsters/boss_sheet.png` on the pastel board.
5. Verify with Pillow: 39 finalized files exist, RGBA, all four corners alpha 0, no magenta, opaque% 15–50; print a table. Update `m4a_validation.json`.
Write only inside `assets/monsters/`, `assets/bosses/`, `concepts/monsters/`.
