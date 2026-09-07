You are doing the **ART/UI restyle pass** for this game. Read `STYLE.md` (the new visual spec — it fully replaces the current dark look), `ASSET_SPEC.md`, `assets/manifest.json`, `AGENTS.md`, and `CHANGELOG.md`. Keep all game logic, public function names, and tests intact. Follow every rule in `AGENTS.md`.

## Scope — implement ALL of it

1. **`style.css` rewrite** to STYLE.md: sky gradient background, cream panels with 3px dark-brown outlines, rounded 18px, hard bottom shadows, orange gradient primary buttons, tab bar with the active tab popping up, ribbon titles on sheets, rarity color variables, Jua/Gothic A1 font with system fallback (load via Google Fonts `<link>` — must degrade gracefully offline). Everything readable at 375px width, tap targets ≥ 44px, no horizontal scroll. Remove every dark-fantasy color.
2. **Sprites → images**: `DATA.assets` from `assets/manifest.json` (inline the mapping into `js/data.js`; do not fetch JSON at runtime). In the battle scene use SVG `<image href>` (or absolutely-positioned `<img>` — pick one and keep it simple) for mercenaries (idle/attack swap 120ms on attack), monsters (region-specific per ASSET_SPEC), and the region background. Keep the existing vector figures as a fallback when an asset is missing from the manifest or fails to load (`onerror`). Sprite base sizes: merc 96px tall, monster 96px, boss 140px; feet on the ground line; 2s breathing idle; white flash on hit via CSS filter; fade on death.
3. **Icons**: HUD gold/coin chips, equipment slot icons in the inventory grid and mercenary cards, skill book — use `icon/*.png`.
4. **Drop / fusion / level-up animations** per STYLE.md "모션" (pop with rotation and rarity glow, card flip, rainbow edge flash for unique+, LEVEL UP label, count-up numbers). Keep them short and non-blocking.
5. **Tab bar & sheets** restyled; make the 장비 tab badge (drop count) a red circle with white number.
6. Take care of the `index.html` head: theme-color `#8FD3FF`, favicon from `icon/weapon.png` if present.
7. **Tests**: `node test/run.js` must still pass unchanged. Add one test that `DATA.assets` contains all 28 manifest keys and that every path exists on disk.
8. `CHANGELOG.md`: "0.x · Restyle" section with DECISION: notes.

## Definition of done
- `node --check js/*.js` clean; `node test/run.js` exit 0.
- Browser at 375px: bright look per STYLE.md, image sprites visible and animating, background image per region, no console errors (a missing-asset fallback must not log errors either), no horizontal scroll.
