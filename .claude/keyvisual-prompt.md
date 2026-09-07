You are the concept artist. Generate **8 key-visual candidates for the main character** of a mobile monster-taming idle game, using your built-in image generation tool (no HTTP APIs, no packages). Save them as `concepts/keyvisual/01_<slug>.png` … `08_<slug>.png` (portrait 1024×1536 or the closest portrait size your tool supports), then build `concepts/keyvisual/contact_sheet.png` (a 4×2 grid with the number and style name under each, use Python Pillow which is installed) and `concepts/keyvisual/README.md` listing each file, the exact final prompt used, and one sentence on how the rest of the game's assets would follow that style.

## Character brief (same for all 8, so the comparison is about STYLE and MOOD)
- A young monster tamer (age ~16–20; gender may vary per candidate), the player's avatar. Carries a capture tool (a lantern-cage, a rune net, or a bell — choose per style) and a travel pack. A small companion monster (a slime or fox-like creature) is beside them.
- Pose: full body, standing three-quarter view, confident but friendly, looking at the viewer. Simple background or subtle environment hint that fits the mood.
- No text, no logos, no watermark. Single character + companion only.

## The 8 styles — deliberately distinct, and explicitly NOT generic chibi/mobile-gacha
1. `ghibli-watercolor` — soft watercolor, hand-painted textures, natural earthy palette, Studio Ghibli / Ni no Kuni warmth.
2. `korean-webtoon` — clean semi-realistic webtoon lines, fashionable modern-fantasy outfit, flat cel shading with sharp highlights.
3. `claymation` — stop-motion clay figure look, fingerprints in the clay, felt and fabric textures, miniature-set lighting.
4. `pixel-hd` — HD pixel art (Octopath Traveler / Sea of Stars quality), 3–4 px outlines, rich dithering, night-market lighting.
5. `paper-cutout` — layered paper cut-out diorama, visible paper edges and drop shadows, limited flat colors, storybook feel.
6. `ink-etching` — muted ink and etching with one accent color, gothic-whimsical (Hollow Knight / Tim Burton), elegant not cute.
7. `risograph` — 3-color risograph/silkscreen print, halftone grain, slight misregistration, bold poster composition.
8. `vinyl-toy-3d` — glossy designer vinyl toy 3D render, soft studio lighting, rounded stylization but NOT chibi proportions (head ≈ 1/5 height).

Rules: generate all 8; if a generation fails, retry once with a simplified prompt. Verify each file exists and is > 50KB. Do not touch any file outside `concepts/`. Write nothing else.
