You are implementing phase **P2** of the game in `GAME_DESIGN.md` (section 5 "장비" is the spec). Read `GAME_DESIGN.md`, `AGENTS.md`, and `CHANGELOG.md` first. P1 is done, reviewed, and verified in a real browser: keep its structure and public function names. Follow every rule in `AGENTS.md`.

## P2 scope — the "장비 드롭·합성 뽑기" hook. Implement ALL of it.

1. **Data** (`js/data.js`): finalize equipment tables already stubbed in P1: 4 slots, tiers 1–8 with base stat formula `base * 1.6^(tier-1)` per slot (weapon→atk, hat→hp, gloves→atk+crit-ish, shoes→def+hp; pick sensible bases), rarity table (rare 1 line ×1.0, epic 2 lines ×1.15, unique 3 lines ×1.35, legendary 3 lines ×1.6 with higher value ranges), potential option pool with per-rarity weights and value ranges, **drop tables per stage band** (1-1~1-9, 1-10 boss, 2-1~2-9, 2-10, 3-1~3-9, 3-10, chaos placeholder): tier weights, rarity weights, drop chance (normal 8%, boss 100%, boss guaranteed tier per doc), sell prices, fusion cost `100 * 2^(tier-1)`, `fuseUpgradeChance 0.15`, potential reroll cost 20 squad coins, inventory cap 60.
2. **Game logic** (`js/game.js`, split into `js/game-equipment.js` if game.js would exceed 600 lines; it may register onto the `Game` object but must stay DOM-free): 
   - item generation `Game.rollItem(stageIndex, {forcedTier})` using `Game.rng()`; each item has `uid, slot, tier, rarity, base, potentials[], locked:false, equippedBy:null`.
   - drops on `kill` events per drop table; boss kill guaranteed drop. Emit `itemDrop` event with the item.
   - inventory array in state (cap 60; when full, drops still happen but go to an `overflow` counter and an event `inventoryFull` fires, no silent loss on the current kill — auto-sell lowest tier rare items instead, note it in CHANGELOG).
   - equip/unequip per mercenary per slot; equipped items are excluded from fusion/sell; equipment stats feed `mercenaryStats()` and CP. Potential effects that matter in P2: atk%, hp%, def%, attackSpeed%, critChance, critDamage, gold%, dropRate%. `invincibleOnHit` can be stored but not applied until P3 (say so in CHANGELOG).
   - `Game.fuse(itemUids[3])`: same slot + same tier → tier+1, rarity = max(material rarities) with `fuseUpgradeChance` to bump one step (cap legendary), new potentials, costs gold, returns the new item and emits `fuseResult`.
   - `Game.autoFuse()`: repeatedly fuse all unlocked, unequipped groups of 3 (lowest tier first) while gold suffices; returns the list of produced items in order.
   - `Game.sell(uids)`, `Game.toggleLock(uid)`, `Game.rerollPotentials(uid)` (squad coins).
   - Save schema → `schemaVersion: 2` with a migration from v1 (add empty inventory/equipment). Existing v1 saves must load.
3. **UI** (`js/ui.js` + new `js/ui-equipment.js`; keep each file under 600 lines):
   - **Drop 연출 in the battle scene**: on `itemDrop`, an item card pops from the enemy position, bounces, and slides into the 장비 tab icon (which gets a badge count). Rarity colors: rare 파랑, epic 보라, unique 노랑, legendary 초록. Unique+ additionally flashes the scene border and calls `navigator.vibrate?.(30)`.
   - **장비 tab**: inventory grid (6 columns), each cell shows slot icon, tier number, rarity color border, lock icon. Filters: slot chips (전체/무기/모자/장갑/신발), sort (티어↓, 등급↓, 최근). Tap → detail panel: base stats, potential lines with values, buttons 장착(용병 선택 3버튼)/해제, 잠금, 판매, 잠재 재설정(코인 20, with before/after reveal). Show inventory count `n/60`.
   - **용병 tab**: the 4 equipment slots now show the equipped item (tier, rarity color) and tapping a slot opens the 장비 tab filtered to that slot with a "이 용병에게 장착" mode.
   - **합성 tab**: table by slot × tier of unlocked+unequipped counts; per row [합성 ×1] when ≥3; [자동 합성] button at top. Fusion result reveal: a card flips face-down → face-up with the new tier/rarity; auto-fuse reveals results one by one with ~250ms stagger, tap anywhere to skip to the end. If a rarity bump happened, play a stronger flash.
   - HUD: CP must visibly jump when equipping (animate number).
4. **Tests** (`test/run.js`, keep existing tests passing, add): rollItem respects drop-table tier bounds and boss guaranteed tier over 2,000 rolls; fusion requires same slot/tier ×3 and produces tier+1; rarity bump rate over 5,000 fusions is within 0.15±0.02; autoFuse leaves fewer than 3 of any unlocked tier group; equip changes CP and unequip restores it; sell/lock rules; v1→v2 save migration loads and round-trips; inventory cap behavior.
5. `CHANGELOG.md` — add a "0.2.0 · P2" section with DECISION: notes.

## Definition of done
- `node --check js/*.js` clean, `node test/run.js` exit 0 (all P1 tests still pass).
- In the browser: within 2 minutes of fresh play at least a few items have dropped with the pop animation, the 장비 grid shows them, equipping raises CP, fusing 3 tier-1 items yields a tier-2 item with the flip reveal, no console errors, no horizontal scroll at 375px width.
- Balance sanity: a player who equips what drops should get through 1-6~1-8 within ~15 minutes of play; tune drop chance / base stats if far off and note it.

Do not implement offline reports, skills, chaos shop, or JSON export (P3). Do not ask questions; decide and record.
