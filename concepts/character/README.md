# Character reference

Reference: `../keyvisual/FINAL_key_visual.png` (final visual authority).

Generated using the built-in image generation tool only; no API calls or package installation. Pillow is used for the labeled review board.

## Export validation — NOT FINAL

The generator returned RGB 1254×1254 files with opaque white or painted checkerboard backgrounds, including after an explicit alpha correction. These are visual drafts and do **not** satisfy the requested transparent alpha or exact asset dimensions. Background removal and resizing await permission to use the existing Pillow installation for asset processing. Do not treat these as production-ready transparent sprites.

## Final generation prompts

### tamer_front.png

Use case: identity-preserve. Create tamer_front.png, a 1024x1024 genuinely transparent RGBA PNG game character cutout using the attached FINAL key visual as exact identity, clothing, prop and rendering reference. Same young adult tamer woman, same amber eyes and delicate face, tied-up black high ponytail, ivory and pale sky-blue long cloak with peach-gold fine ornament, ivory layered shirt, muted lavender trousers, brown leather straps and pouches, backpack, detailed gray-blue lace-up boots. Full body FRONT view relaxed stance, antique brass lantern-cage held down at her side. Preserve adult realistic long-limbed proportions, fine clean Korean webtoon semi-realistic linework and detailed soft painted materials. Pastel dawn illumination, ivory, powder blue, lavender, subdued peach highlights. Entire ponytail, cloak, lantern and boots inside frame; soles at 92% canvas height, approximately 8% bottom padding. Isolated character only: no fox, scenery, ground, text, labels, watermark or cast-shadow plane. Actual transparent alpha, no checkerboard drawing. No chibi, no oversized head, no thick black outlines, no saturated primary colors, no night scene. Output one image.

### tamer_side.png

Use case: identity-preserve. Create tamer_side.png, a 1024x1024 genuinely transparent RGBA PNG game character cutout using the attached FINAL key visual as exact identity, clothing, prop and rendering reference. Same young adult tamer woman, same amber eyes and delicate face, tied-up black high ponytail, ivory and pale sky-blue long cloak with peach-gold fine ornament, ivory layered shirt, muted lavender trousers, brown leather straps and pouches, backpack, detailed gray-blue lace-up boots. Full body strict SIDE PROFILE facing RIGHT, nose and toes pointing toward image right, natural walking stance with one boot forward and one behind, antique brass lantern-cage carried at her side. Show the same face in true profile, same backpack and outfit construction. Preserve adult realistic long-limbed proportions, fine clean Korean webtoon semi-realistic linework and detailed soft painted materials. Pastel dawn illumination, ivory, powder blue, lavender, subdued peach highlights. Entire ponytail, cloak, lantern and boots inside frame; soles at 92% canvas height, approximately 8% bottom padding. Isolated character only: no fox, scenery, ground, text, labels, watermark or cast-shadow plane. Actual transparent alpha, no checkerboard drawing. No chibi, no oversized head, no thick black outlines, no saturated primary colors, no night scene. Output one image.

### tamer_capture.png

Use case: identity-preserve. Create tamer_capture.png, a 1024x1024 genuinely transparent RGBA PNG game character cutout using the attached FINAL key visual as exact identity, clothing, prop and rendering reference. Same young adult tamer woman, same amber eyes and delicate face, tied-up black high ponytail, ivory and pale sky-blue long cloak with peach-gold fine ornament, ivory layered shirt, muted lavender trousers, brown leather straps and pouches, backpack, detailed gray-blue lace-up boots. Full body strict SIDE PROFILE facing RIGHT, capture action, nose pointing right, dynamic grounded stance with knees slightly bent, arm extended toward image RIGHT thrusting the antique brass lantern-cage forward at chest height, softly glowing cage, cloak and ponytail swept back toward LEFT. Preserve adult realistic long-limbed proportions, fine clean Korean webtoon semi-realistic linework and detailed soft painted materials. Pastel dawn illumination, ivory, powder blue, lavender, subdued peach highlights. Entire ponytail, cloak, lantern and boots inside frame; soles at 92% canvas height, approximately 8% bottom padding. Isolated character only: no fox, scenery, ground, text, labels, watermark or cast-shadow plane. Actual transparent alpha. If alpha cannot be encoded, use a perfectly uniform pure white background with no pattern, shadows or texture. No checkerboard drawing. No chibi, no oversized head, no thick black outlines, no saturated primary colors, no night scene. Output one image.

### fox_companion.png

Use case: stylized-concept, identity-preserve. Derive fox_companion.png from the white fox at the woman's feet in the FINAL key visual reference. One full-body white fox companion, strict side profile facing RIGHT, seated naturally with straight forelegs and folded hindlegs and fluffy tail visible. Same ivory fur, peach inner ears and subtle peach markings, amber eyes, slate-blue patterned neckerchief with small peach-gold diamond pendant. Charming but credible semi-realistic fox anatomy, fine fur strands, delicate colored webtoon outlines, soft painted shading exactly matching the reference's Korean webtoon semi-realistic finish and pastel dawn light. No chibi, no mascot proportions, no huge eyes, no thick black lines, no saturated colors, no night. Isolate on genuine transparent PNG alpha, no checkerboard pattern, no scenery, no ground shadows, no text. 768x768 square canvas, full ears and tail inside frame, paws at 92% height with 8% bottom padding. Only fox, no woman.

### Front export correction prompt

Correct this character cutout export. Keep the character artwork exactly unchanged. REMOVE the entire gray-and-white checkerboard pattern; it is an erroneous painted background. Deliver a true PNG with RGBA mode, alpha=0 on all background pixels, smooth partial alpha only at character edges. Set transparent background in the image output, not a drawn checkerboard. Output exactly 1024x1024, fitting complete character with 8% transparent bottom padding. No text. This is tamer_front.png.

