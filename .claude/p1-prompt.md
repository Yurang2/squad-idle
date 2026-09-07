You are implementing phase **P1** of the game described in `GAME_DESIGN.md`. Read `GAME_DESIGN.md` and `AGENTS.md` fully first and follow every rule in `AGENTS.md`.

## P1 scope (implement ALL of this, nothing from P2/P3)

1. `js/data.js` — `DATA` object: mercenaries (warrior/archer/mage with unlock stage, base stats, growth), 3 regions × 10 stages (names, monster palettes, wave definitions, boss on stage 10, time limit 60s), monster types, `enemyScale(stageIndex)`, gold per kill formula, first-clear squad-coin rewards, mercenary XP curve, CP weights. Include the equipment tier/rarity tables and potential option pool as data now (P2 will use them) but do NOT implement drops/inventory logic.
2. `js/battle.js` — `Battle`: 10Hz tick simulation of one stage: waves, enemies target the front-most alive mercenary (warrior first), mercenaries use basic attacks only in P1 (skills are P3) but leave `skills` hooks in the unit model. Damage numbers, crit, defense formula, death, wave advance, boss, 60s timer, win/fail. Emits events: `wave`, `hit`, `kill`, `unitDeath`, `stageClear`, `stageFail`. Pure logic, no DOM.
3. `js/game.js` — `Game`: state (gold, squadCoins, mercenaries with level/xp, unlocked stages, current stage, mode `repeat|challenge`, stats for goldPerSec/killsPerSec rolling window), `rng()` seeded, `save()/load()` with `schemaVersion: 1` under key `squad_v1`, autosave every 3s and after actions, `catchUp(elapsedMs)` (in P1 just runs the sim fast-forward up to 60s of ticks and ignores the rest; P3 will replace with offline report), stage selection API, repeat/challenge toggle, mercenary XP/level-up from kills, CP calculation, unlock archer at 1-6 clear and mage at 2-6 clear.
4. `js/ui.js` (+ `js/ui-sheets.js` if needed) — `UI`: the layout in section 9 of the design doc. Top HUD (CP, gold, coins, region/stage, timer). Battle scene as inline SVG: three mercenary sprites on the left (simple vector figures built from a few shapes, distinct silhouettes and colors per class), enemies on the right, HP bars, floating damage numbers, a short lunge/flash animation on attack, a fade-out on death. Stage selector arrows + repeat/challenge toggle. Bottom tabs: 용병 / 장비 / 합성 / 스킬 / 설정 — 용병 tab fully working (cards, level, stats, 4 empty equipment slots); 장비/합성/스킬 tabs show a placeholder "준비 중" sheet; 설정 tab has 초기화 (with confirm) and shows version + schemaVersion.
5. `index.html`, `style.css` — mobile portrait, dark fantasy palette, tap targets ≥ 44px, no horizontal scroll, `user-scalable=no`.
6. `test/run.js` — pure node tests: (a) a fresh squad clears stage 1-1 within 60s of simulated time, (b) stage 3-10 is NOT clearable by a fresh level-1 squad (proves scaling), (c) save→load round trip yields deep-equal state, (d) `rng()` with the same seed gives the same sequence. Run with `node test/run.js`; must print PASS for each and exit 0.
7. `CHANGELOG.md` — what you built, decisions marked DECISION:.

## Definition of done
- `node --check` passes for every file in `js/`.
- `node test/run.js` exits 0.
- Opening `index.html` through a static server shows the squad auto-fighting stage 1-1 immediately, clearing it, and advancing (in challenge mode) with no console errors.
- Balance: with the design doc's initial numbers a fresh squad should clear roughly stages 1-1 to 1-5 without any upgrades, then start failing; tune `DATA` constants (not formulas' shape) if needed and note it in CHANGELOG.

Do not ask questions; make reasonable decisions and record them. Do not create package.json or any build tooling.
