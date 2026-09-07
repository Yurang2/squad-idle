You are the art generator for this game. Read `ASSET_SPEC.md` fully. Your job: **generate every image listed there with your built-in image generation tool** (the ChatGPT image_gen tool available to you; do NOT call any HTTP API with keys, do NOT install packages) and save each PNG at the exact path under `assets/` given in the spec.

Rules:
- Style consistency is the top priority. Prepend the common style keywords from the spec to every prompt, and add "same art style as a single game's character set". Chibi proportions: head ≈ 45% of height.
- Mercenaries face RIGHT; monsters face LEFT. Full body visible, feet at the bottom, centered, ~10% padding. Transparent background is required for merc/mon/icon. If the tool cannot output transparency, generate on a flat pure magenta `#FF00FF` background and then remove that color to alpha with a small Node script (no packages: write a minimal PNG decoder/encoder using zlib) — or, simpler, use `python` with Pillow only if it is already installed; check first. Record which path you used.
- Backgrounds are opaque 1080×760 landscape; keep the lower 45% as a fairly flat ground area where sprites will stand.
- Icons: single object, centered, front view, glossy.
- After generating, verify every file exists and has the expected size (>10KB), and write `assets/manifest.json` mapping logical keys to paths, e.g. `{"merc.warrior.idle":"assets/merc/warrior_idle.png", ...}` for all 28 files. Also create `assets/contact_sheet.html` that shows every asset in a grid with its key, on a checkerboard background, so a human can review consistency at a glance.
- Do not modify any file outside `assets/` and `CHANGELOG.md` (append an "Art assets" section noting how they were made and any files you could not generate).

If your image tool has a per-run limit, generate as many as you can in priority order: 3 mercenary idle → 4 region-1 monsters → forest bg → icons → remaining mercs attack → region 2/3 monsters and bgs. List anything missing at the end so a follow-up run can finish it.
