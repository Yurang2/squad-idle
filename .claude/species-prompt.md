Production run: the 18 stage-1 monster species. Read `MONSTERS.md` (the list), `STYLE.md` (the look), and study the attached reference images (the final key visual, the approved wild fox, and the approved lake bat — these two creatures are the quality and style bar). Use your built-in image generation tool (no APIs, no packages). Write only inside `assets/monsters/` and `concepts/monsters/`.

## Deliverables
- `assets/monsters/<id>.png` for all 18 ids in MONSTERS.md — 1024×1024 **RGBA with real transparency** (request transparent output; fallback: flat `#FF00FF` background → magenta-to-alpha with Pillow, 1px feather). Full body, facing **LEFT**, feet/base at the bottom with ~8% padding, no cast shadow, no text.
- `mistfox` and `lakebat`: copy the approved files from `concepts/monsters/fox_wild.png` and `lakebat.png` (do not regenerate).
- `dewslime`: REDESIGN per the note in MONSTERS.md — a firm dewdrop shape with a clear silhouette, two large readable eyes, one point of inner light. The old jellyfish-like blob is rejected.
- `concepts/monsters/species_sheet.png`: 6×3 grid on the pastel board, one row per region, labeled with id and Korean name.
- `assets/monsters/manifest.json`: `{ "<id>": "assets/monsters/<id>.png", ... }` for all 18.
- `concepts/monsters/SPECIES_README.md`: final prompt per species.

## Style bar (reject and regenerate anything that misses it)
Semi-realistic creature anatomy, charming but credible, soft pastel-dawn palette per region (see MONSTERS.md), thin colored outlines (never black), 2-step cel shading plus one soft highlight, gentle inner glow only where the species note says so. No chibi, no mascot faces, no saturated primaries, no night lighting. Each species must read as a distinct silhouette at 96px tall — check by downscaling with Pillow and looking.

Verify at the end with Pillow: all 18 files exist, RGBA, transparent corners, no magenta, and print a table of opaque-pixel percentage (should be 15–45%).
