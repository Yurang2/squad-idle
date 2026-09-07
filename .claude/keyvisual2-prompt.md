Round 2 of the main-character key visual. The art director rejected everything except **`concepts/keyvisual/02_korean-webtoon.png`** (the base to build on) and `08_vinyl-toy-3d.png` (fallback). A copy of 02 is attached to this prompt as an image: look at it carefully first. Read `concepts/keyvisual/README.md` for the prompt that produced 02.

Generate **8 variations that keep 02's rendering language** — clean semi-realistic Korean webtoon linework, flat cel shading with sharp specular highlights, realistic proportions (head ≈ 1/6.5 height), polished and fashionable — while fixing its one weakness: it reads as a modern-day city character. Push it toward **fantasy adventure / monster tamer** without losing the webtoon polish. Use your built-in image generation tool (no APIs, no packages). Save as `concepts/keyvisual/round2/01_<slug>.png` … `08_<slug>.png`, portrait 1024×1536 (or closest), then `concepts/keyvisual/round2/contact_sheet.png` (4×2 grid with labels, Pillow is installed) and `round2/README.md` with final prompts.

## Constant across all 8
Young monster tamer, full body, three-quarter standing pose, looking at viewer, small companion monster beside them, no text/logo/watermark, same rendering language as 02.

## The 8 variations (each changes 2–3 axes; keep the rest close to 02)
1. `ranger-boy` — 02's boy, but outfit becomes layered fantasy ranger gear (leather straps, hooded cloak over modern-cut jacket), rune-net → glowing lantern-cage; forest-edge background at golden hour.
2. `ranger-girl` — female counterpart of #1, short practical hair, same gear language; companion is a fox-like monster.
3. `scholar` — bookish tamer with satchel, brass monocle-goggles, field notebook; palette ink-blue + parchment; companion is a slime perched on the satchel.
4. `nomad` — desert/steppe wanderer, scarf and long coat, bell-staff capture tool; warm ochre + teal palette; companion a lizard-like monster.
5. `night-market` — 02's modern edge kept: streetwear meets fantasy, neon lantern light, wet cobblestone; companion a bat-like monster. (Closest to the original 02.)
6. `noble` — elegant tamer in embroidered coat, silver rune-net, cooler palette (slate, silver, wine); companion a small dragon whelp.
7. `girl-lantern` — female tamer, long hair tied up, oversized cloak, big lantern-cage held forward casting light on her face; dusk blue palette; companion a fox.
8. `duo-poster` — 02's boy and #2's girl together as a duo poster composition, two companions; this tests whether the style survives a two-character key art.

Rules: every image must be clearly the same rendering style as 02 — reject and regenerate anything that drifts into chibi, painterly, or anime-moe. Verify each file exists and is > 50KB. Do not touch files outside `concepts/keyvisual/round2/`.
