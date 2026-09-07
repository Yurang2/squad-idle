# Stage-1 monster species production

Created with the built-in image generation tool only. No generation APIs or package installation. Pillow performs alpha cleanup, one-pixel inward edge feathering, resizing, sheet composition, and validation.

Final files: `../../assets/monsters/<id>.png`. `species_sheet.png` is the labeled 6-column, 3-row region board. `species_96px.png` shows each silhouette at exactly 96px tall.

The approved fox and lake bat are byte-identical copies, not regenerated or reframed. Their original bottom margins are 152px and 95px; all 16 newly generated sprites have an 82px bottom margin.

Coverage uses alpha >= 250 because the approved assets contain almost-opaque alpha values around 253. The validation JSON also records strict alpha=255 coverage and all nonzero-alpha coverage. All sprites pass the 15-45% near-opaque coverage range.

Reference authority: `../../MONSTERS.md`, `../../STYLE.md`, the supplied final key visual, approved wild fox, and lake bat.

## Final prompts by species

### mistfox - 안개여우

Copied approved `fox_wild.png` unchanged. No prompt was submitted for this species during this run. Archived original prompt:

Use case: stylized-concept. Create one illustrated field-guide creature game asset in the EXACT rendering language and palette family of the FINAL key visual reference: Korean webtoon semi-realistic painting, fine delicate colored lines, softly painted detailed materials, pastel dawn lighting, ivory, powder blue, muted peach and pale lavender. Charming but biologically credible, NOT chibi, NOT a cute mascot. No thick black outlines, no saturated primary colors, no night setting. Full body side view facing LEFT, complete silhouette within square 1024x1024 PNG, approximately 8% padding. Isolate on true transparent alpha, no checkerboard drawing, no scenery, no ground plane, no labels, text or watermark. Subject: fox_wild.png — wild untamed variant of the reference's white companion fox, slightly larger, lean mature quadruped anatomy, standing alert in strict LEFT profile with nose and all paws pointing left. Ivory fur, peach ear interiors, subtle muted peach facial marks, amber eye, one large bushy tail extending to right with dusk-purple tips. Longer muzzle and realistic modest eye size, textured fur and slender articulated legs. No scarf, no collar, no pendant, no clothing, no equipment. Credible wild animal, quietly wary expression.

Archived alpha-re-export instruction: preserve the approved creature, left-facing pose, colors, rendering, and silhouette; replace only the background with real transparent alpha. No redesign, cropping, checkerboard, or ground shadow.

SHA-256: `cfdfdaa42d9227013815badf450f1c806bed62f726f7d5704f43ea828f840742`

### lakebat - 호수박쥐

Copied approved `lakebat.png` unchanged. No prompt was submitted for this species during this run. Archived original prompt:

Use case: stylized-concept. Create one illustrated field-guide creature game asset in the EXACT rendering language and palette family of the FINAL key visual reference: Korean webtoon semi-realistic painting, fine delicate colored lines, softly painted detailed materials, pastel dawn lighting, ivory, powder blue, muted peach and pale lavender. Charming but biologically credible, NOT chibi, NOT a cute mascot. No thick black outlines, no saturated primary colors, no night setting. Full body side view facing LEFT, complete silhouette within square 1024x1024 PNG, approximately 8% padding. Isolate on true transparent alpha, no checkerboard drawing, no scenery, no ground plane, no labels, text or watermark. Subject: lakebat.png — a mist-bat in flight, body and small anatomically credible bat head in LEFT side profile, muzzle pointing left. Two large pale lavender membranous wings lifted in a readable flying pose, complete wingtips visible, fine finger-bone supports and subtle veins, soft ivory-lavender short fur, peach ear interiors, small natural dark amber eye, tiny curled hindfeet and believable tail membrane. Ethereal mist-like soft wing coloration contained within silhouette, no fog background. Semi-realistic mammal anatomy, not a fox with wings, not a mascot, no grin or giant eyes. No props.

Archived alpha-re-export instruction: preserve the approved creature, left-facing pose, colors, rendering, and silhouette; replace only the background with real transparent alpha. No redesign, cropping, checkerboard, or ground shadow.

SHA-256: `19ccc82a1a01923c2736e9a5720e1401af24673e47451ff1b596beb9fa655aa9`

### dewslime - 이슬슬라임

Use case: stylized-concept. Create ONE production game creature sprite: dewslime (이슬슬라임). 1024x1024 PNG with genuine transparent background. Firm upright dewdrop, cohesive clear pear-shaped silhouette with a pointed tip leaning LEFT and stable rounded base. Two large clearly readable eyes integrated naturally in its translucent body, looking left, no smiling mascot mouth. Exactly one small warm point of light inside. No tentacles, jellyfish, dripping lobes or floating particles. Semi-realistic polished fantasy natural-history illustration matching the attached approved white fox and lavender lake bat and pastel dawn key visual: thin colored mauve outlines never black, two-step cel shadows and one soft highlight. Pearl white, pale lavender, faint peach. Full body facing LEFT, bottom of base at y=942 approximately, generous clear margins, subject occupies 15–45 percent of canvas. No ground, cast shadow, text, border, props, scenery, chibi, saturated primaries, neon, night lighting. Request real alpha transparency; if unavailable use perfectly flat #FF00FF background without any shadow.

### reedheron - 갈대왜가리

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
CORRECTION: Prior alpha attempt produced a rejected external halo. Use fallback perfectly flat solid #FF00FF chroma-key background across every background pixel, NO gradient, NO halo, NO vignette, NO shadows. Crisp colored silhouette edges. Square 1024x1024 composition, not portrait or landscape. Two-step cel shading, restrained soft pastel creature colors.
White and gray-lavender natural heron facing left, LONG legs but neck folded into a compact S against its chest, broad folded feathered wing body. Keep overall creature bounding box approximately square rather than extremely tall thin: long beak projects left, broad torso and tail right, two complete long legs below. Fill 20–30% of square pixels. No glow.

### pondturtle - 이끼거북

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
Region palette: pearl white, pale lavender, faint peach.
Subject pondturtle (이끼거북): Anatomically credible freshwater turtle walking left, low domed shell with small patches of soft sage moss and three tiny pale peach flowers rooted in shell. Four sturdy reptilian feet, small natural head, visible short tail.

### glowmoth - 새벽나방

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
Region palette: pearl white, pale lavender, faint peach.
Subject glowmoth (새벽나방): Anatomically credible moth flying toward LEFT, head and antennae clearly on left, six delicate legs, broad elegantly spread translucent lavender wings with subtle warm luminous vein patterns confined inside wings. Natural small eyes and furry insect thorax, no face.

### snowhare - 눈토끼

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale sky blue, silver white, light lilac.
Subject snowhare (눈토끼): Adult mountain hare, lean long-legged wild hare proportions, long upright ears with ONLY their tips pale lavender, silver white fur, natural small eyes. Crouched ready to bound toward left, complete large hind feet.

### ridgegoat - 능선염소

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale sky blue, silver white, light lilac.
Subject ridgegoat (능선염소): Adult mountain goat standing in left profile, muscular angular body, thick silver-white layered fur, long swept backward curved horns, distinct cloven hooves, lean wild goat face and small beard. Natural small eyes.

### frostowl - 서리올빼미

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale sky blue, silver white, light lilac.
Subject frostowl (서리올빼미): Adult owl standing in left three-quarter profile, beak and gaze toward LEFT, anatomically credible feathered bird with folded wings and two taloned feet. Facial feather disk forms a subtle symmetrical snowflake pattern, silver white and pale sky blue feather planes, natural owl eyes.

### icewolf - 서리늑대

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale sky blue, silver white, light lilac.
Subject icewolf (서리늑대): Adult wild wolf standing left in clear profile, long powerful legs, deep chest, long muzzle, short triangular ears, straight low bushy tail. Silver gray coat, pale blue natural eyes, subtle ice-blue shadows. Distinct wolf anatomy, no fox proportions.

### crystalbeetle - 수정풍뎅이

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale sky blue, silver white, light lilac.
Subject crystalbeetle (수정풍뎅이): Natural scarab beetle in elevated left three-quarter side view, head LEFT, six clearly jointed legs, small antennae, rounded paired elytra made of translucent pale blue and lilac faceted crystal. Anatomically grounded chitin underside, no glow, no jewelry.

### cloudram - 구름양

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale sky blue, silver white, light lilac.
Subject cloudram (구름양): Adult sheep ram in left profile, naturally small gentle face, rounded dense cloud-like silver-white wool in soft fleece clumps, compact curled ram horns close to head, four slim legs ending in cloven hooves. Distinguish from angular long-horned goat; no cartoon clouds.

### emberlizard - 노을도마뱀

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
Subject: emberlizard (노을도마뱀), a credible adult terrestrial lizard with a broad firm torso and four substantial splayed legs with readable toes, a natural small reptile head facing LEFT and small amber eye. NO dragon frills, no horns, no feathers. Long tapering tail curls closely around behind and beside body in a compact C instead of extending far away; occupy a compact roughly square silhouette with 22–30% opaque canvas coverage. Pale warm ivory and desaturated peach scales with dusty rose shadows. Exactly one THIN faint softly luminous peach-gold line on back only; no flames, no neon. Use perfectly FLAT #FF00FF background fallback, no halo, no gradients, no cast shadow. Two-step cel shading, thin colored outlines and restrained soft highlight. Full body, all feet and tail visible.

### cliffhawk - 절벽매

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale peach, muted apricot orange, dusty rose, warm ivory. Clearly warmer than the lavender and silver creatures.
Subject cliffhawk (절벽매): Natural adult hawk in left-facing flight with two broad swept raised feathered wings, hooked beak pointing left, sharp natural eyes, tucked talons, complete fanned tail. Warm ivory peach feathers and muted rose wing tips. No glow.

### sandpangolin - 모래천산갑

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
CORRECTION: Prior alpha attempt produced a rejected external halo. Use fallback perfectly flat solid #FF00FF chroma-key background across every background pixel, NO gradient, NO halo, NO vignette, NO shadows. Crisp colored silhouette edges. Square 1024x1024 composition, not portrait or landscape. Two-step cel shading, restrained soft pastel creature colors.
Natural pangolin walking LEFT, long small tapered snout and tiny eye, arched body armored in overlapping peach-toned scales, long thick tapering scaled tail curving right, four short clawed feet. Credible anatomy, no glow.
Soft pale peach and dusty rose, warm cream palette. No glow. Minimal fantasy embellishments; only small crystals on pincers for crab.

### duskcat - 노을살쾡이

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale peach, muted apricot orange, dusty rose, warm ivory. Clearly warmer than the lavender and silver creatures.
Subject duskcat (노을살쾡이): Adult wildcat standing left in profile, lean feline body, four long legs, softly striped dusty peach and rose beige fur, short tufted ears with muted orange patches behind both ears, natural amber eyes, substantial feline tail curling gently at tip. No accessories, no glow.

### rockcrab - 바위게

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
CORRECTION: Prior alpha attempt produced a rejected external halo. Use fallback perfectly flat solid #FF00FF chroma-key background across every background pixel, NO gradient, NO halo, NO vignette, NO shadows. Crisp colored silhouette edges. Square 1024x1024 composition, not portrait or landscape. Two-step cel shading, restrained soft pastel creature colors.
Anatomically grounded rock crab in elevated left-facing three-quarter view, front eyes and two pincers oriented LEFT, low broad peach stone-textured shell, eight jointed walking legs, two larger pincers with tiny pale rose crystal growths. Clear crab silhouette, no face or glow.
Soft pale peach and dusty rose, warm cream palette. No glow. Minimal fantasy embellishments; only small crystals on pincers for crab.

### windserpent - 바람뱀

Use case: stylized-concept. ONE production fantasy bestiary creature sprite, 1024x1024 PNG with REAL ALPHA TRANSPARENT background. Match approved reference white wild fox and pale lavender lake bat and pastel-dawn key visual: semi-realistic credible animal anatomy, elegant detailed thin colored mauve/taupe outlines NEVER black, 2-step cel shading and one soft highlight, delicate restrained texture, charming through natural anatomy rather than cute caricature. Full body facing LEFT, all appendages visible, subject centered horizontally, feet or lowest body point around 92% canvas height (8% bottom padding), subject should occupy 15–45% of canvas pixels. No cast shadow, ground, scenery, text, labels, border, extra creatures, props, chibi, mascot faces, oversize eyes, saturated primaries, neon, night lighting. Only include inner glow when expressly stated in subject. Request true transparent output; if unsupported, use perfectly flat #FF00FF background for extraction.
NO external halo or bloom. Clean crisp isolated silhouette.
Region palette: pale peach, muted apricot orange, dusty rose, warm ivory. Clearly warmer than the lavender and silver creatures.
Subject windserpent (바람뱀): Slender long snake with feather-like mane along upper neck, natural small head looking LEFT, no limbs, long graceful sinuous body in one open S-shaped grounded coil, tapering tail visible. Fine pale peach scales, dusty rose and cream feather mane. No wings, no glow.

## Production decisions

- Dewslime replaces the rejected jellyfish-like design with one firm dewdrop body, two readable eyes and a single inner light.
- Rejected external-halo versions of reedheron, sandpangolin and rockcrab were regenerated.
- Emberlizard was regenerated with a compact coiled tail and credible lizard anatomy to improve coverage and remove dragon-like frills.
- Generated chroma spill is cleared before resampling and checked again afterward; generated alpha is retained.
- Framing adapts to silhouette density without stretching anatomy. All final creatures were inspected on the pastel sheet and at 96px body height.
- Rebuild with `python -W ignore concepts/monsters/finalize_species.py` from the repository root. Final selected generator sources are retained in `production_sources/`.
