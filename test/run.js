"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function context() {
  const storage = new Map();
  const intervals = new Map();
  let timerId = 0;
  const sandbox = vm.createContext({
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setInterval: (fn, ms) => { intervals.set(++timerId, { fn, ms }); return timerId; },
    clearInterval: id => intervals.delete(id)
  });
  for (const file of ["data", "battle", "game", "game-equipment"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/" + file + ".js"), "utf8"), sandbox, { filename: file + ".js" });
  }
  return { ...sandbox, storage, intervals };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function simulate(c, stage, squad = [{ id: "warrior", level: 1 }], emit) {
  const sim = c.Battle.start(stage, squad, emit);
  while (sim.status === "fighting") c.Battle.tick(sim, emit);
  return sim;
}
function untilResult(c) {
  for (let i = 0; i < 601 && c.Game.getState().battle.status === "fighting"; i++) c.Game.step();
  return c.Game.getState();
}
function fixture(c, stage, level = 1) {
  c.Game.reset();
  const state = c.Game.getState();
  state.currentStage = stage;
  state.unlockedStages = Array.from({ length: stage + 1 }, (_, i) => i);
  state.clearedStages = Array.from({ length: stage }, (_, i) => i);
  state.mercenaries.forEach((merc, i) => {
    merc.level = level;
    merc.unlocked = i === 0 || c.DATA.mercenaries[i].unlockStage < stage;
  });
  state.battle = c.Battle.start(stage, state.mercenaries.filter(m => m.unlocked));
  c.storage.set("squad_v1", JSON.stringify({ schemaVersion: c.DATA.schemaVersion, savedAt: Date.now(), state }));
  assert.equal(c.Game.load(), true);
}
let passed = 0;
function test(name, fn) {
  try { fn(); console.log("PASS " + name); passed++; }
  catch (error) { console.error("FAIL " + name); console.error(error); process.exitCode = 1; }
}

test("(a) fresh squad clears stage 1-1 within 60 seconds", () => {
  const c = context();
  const sim = simulate(c, 0);
  assert.equal(sim.status, "clear");
  assert.ok(sim.ticks <= 600);
  console.log("     Stage 1-1: " + sim.ticks / 10 + "s");
});
test("(b) stage 3-10 defeats a fresh level-1 squad, even with all classes", () => {
  const c = context();
  assert.equal(simulate(c, 29).status, "fail");
  assert.equal(simulate(c, 29, c.DATA.mercenaries.map(m => ({ id: m.id, level: 1 }))).status, "fail");
});
test("(c) save/load preserves the entire state and ongoing battle", () => {
  const c = context();
  for (let i = 0; i < 211; i++) c.Game.step();
  c.Game.setMode("repeat");
  const before = plain(c.Game.getState());
  c.Game.save();
  const stored = c.storage.get("squad_v1");
  c.Game.step();
  assert.equal(c.Game.load(), true);
  assert.deepEqual(plain(c.Game.getState()), before);
  const other = context();
  other.storage.set("squad_v1", stored);
  assert.equal(other.Game.load(), true);
  for (let i = 0; i < 70; i++) { c.Game.step(); other.Game.step(); }
  assert.deepEqual(plain(c.Game.getState()), plain(other.Game.getState()));
});
test("(d) equal RNG seeds produce equal sequences (including seed zero)", () => {
  const c = context();
  for (const seed of [0, 42, 4294967295]) {
    c.Game.reset(seed);
    const first = Array.from({ length: 100 }, () => c.Game.rng());
    c.Game.reset(seed);
    assert.deepEqual(Array.from({ length: 100 }, () => c.Game.rng()), first);
    assert.ok(first.every(n => n >= 0 && n < 1));
  }
});
test("balance: unupgraded level-1 warrior clears 1-1 through 1-5 and fails 1-6", () => {
  const c = context();
  for (let stage = 0; stage < 6; stage++) {
    c.Game.reset();
    const sim = simulate(c, stage);
    assert.equal(sim.status, stage < 5 ? "clear" : "fail", "stage " + (stage + 1));
  }
});
test("natural challenge progression first fails at 1-6, then gains XP on retry", () => {
  const c = context();
  let failure;
  c.Game.on("stageFail", e => { failure = e; });
  for (let i = 0; i < 2400 && !failure; i++) c.Game.step();
  assert.equal(failure.stageIndex, 5);
  assert.deepEqual(plain(c.Game.getState().clearedStages), [0, 1, 2, 3, 4]);
  const xp = c.Game.getState().mercenaries[0].xp;
  for (let i = 0; i < 100; i++) c.Game.step();
  assert.notEqual(c.Game.getState().mercenaries[0].xp, xp);
});
test("repeat keeps stage; first-clear coins cannot be farmed; challenge advances", () => {
  const c = context();
  c.Game.setMode("repeat");
  untilResult(c);
  assert.equal(c.Game.getState().squadCoins, 10);
  assert.deepEqual(plain(c.Game.getState().unlockedStages), [0, 1]);
  for (let i = 0; i < c.DATA.resultTicks; i++) c.Game.step();
  assert.equal(c.Game.getState().currentStage, 0);
  untilResult(c);
  assert.equal(c.Game.getState().squadCoins, 10);
  c.Game.setMode("challenge");
  for (let i = 0; i < c.DATA.resultTicks; i++) c.Game.step();
  assert.equal(c.Game.getState().currentStage, 1);
});
test("archer unlocks only on 1-6 clear; mage only on 2-6 clear", () => {
  const c = context();
  fixture(c, 5, 50);
  assert.equal(c.Game.getState().mercenaries[1].unlocked, false);
  untilResult(c);
  assert.equal(c.Game.getState().mercenaries[1].unlocked, true);
  assert.equal(c.Game.getState().mercenaries[2].unlocked, false);
  fixture(c, 15, 100);
  untilResult(c);
  assert.equal(c.Game.getState().mercenaries[2].unlocked, true);
});
test("wave, hit, kill, death, clear and fail events; boss is the last wave", () => {
  const c = context();
  const events = [];
  simulate(c, 9, [{ id: "warrior", level: 150 }], (name, data) => events.push({ name, data }));
  assert.deepEqual(events.filter(e => e.name === "wave").map(e => e.data.wave), [1, 2, 3]);
  assert.equal(events.filter(e => e.name === "kill").length, 6);
  assert.equal(events.filter(e => e.name === "unitDeath").length, 6);
  assert.ok(events.some(e => e.name === "kill" && e.data.type === "boss"));
  assert.equal(events.at(-1).name, "stageClear");
  const fails = [];
  simulate(c, 29, undefined, (name, data) => { if (name === "stageFail") fails.push(data); });
  assert.equal(fails.length, 1);
});
test("frontline priority survives reversed squad order and switches after death", () => {
  const c = context();
  const sim = c.Battle.start(0, [{ id: "mage", level: 1 }, { id: "archer", level: 1 }, { id: "warrior", level: 1 }]);
  sim.units.forEach(u => { u.cooldown = 999; });
  sim.units[0].hp = 1;
  sim.enemies.forEach(u => { u.cooldown = 0; });
  const targets = [];
  c.Battle.tick(sim, (name, event) => { if (name === "hit" && event.side === "enemy") targets.push(event.targetId); });
  assert.deepEqual(targets, ["warrior", "archer"]);
});
test("defense, forced critical damage, dead units and exact 60s timeout", () => {
  const c = context();
  const sim = c.Battle.start(0, [{ id: "warrior", level: 1 }]);
  sim.units[0].critChance = 1;
  sim.units[0].atk = 10;
  sim.units[0].critDamage = 2;
  sim.enemies[0].def = 20;
  let hit;
  c.Battle.tick(sim, (name, event) => { if (name === "hit") hit = event; });
  assert.equal(hit.amount, 10);
  assert.equal(hit.crit, true);
  sim.units.concat(sim.enemies).forEach(u => { u.cooldown = 999; });
  let reason;
  while (sim.status === "fighting") c.Battle.tick(sim, (name, e) => { if (name === "stageFail") reason = e.reason; });
  assert.equal(sim.ticks, 600);
  assert.equal(reason, "timeout");
  c.Battle.tick(sim, () => assert.fail("Finished battle emitted again"));
});
test("failure restores squad HP and retries the same stage without currency penalty", () => {
  const c = context();
  fixture(c, 29);
  const before = c.Game.getState().gold;
  assert.equal(untilResult(c).battle.status, "fail");
  for (let i = 0; i < c.DATA.resultTicks; i++) c.Game.step();
  const state = c.Game.getState();
  assert.equal(state.currentStage, 29);
  assert.equal(state.battle.status, "fighting");
  assert.ok(state.battle.units.every(u => u.hp === u.maxHp));
  assert.ok(state.gold >= before);
});
test("catchUp is deterministic, capped at 600 ticks and ignores the remainder", () => {
  const a = context(); const b = context();
  assert.equal(a.Game.catchUp(86400000), 600);
  for (let i = 0; i < 600; i++) b.Game.step();
  assert.deepEqual(plain(a.Game.getState()), plain(b.Game.getState()));
  assert.equal(a.Game.catchUp(-1), 0);
  assert.equal(a.Game.catchUp(NaN), 0);
  assert.equal(a.Game.catchUp(99), 0);
});
test("XP raises level and CP; the rolling five-minute window expires kills", () => {
  const c = context();
  const cp = c.Game.getCP();
  for (let i = 0; i < 1800; i++) c.Game.step();
  assert.ok(c.Game.getState().mercenaries[0].level > 1);
  assert.ok(c.Game.getCP() > cp);
  assert.ok(c.Game.getState().stats.goldPerSec > 0);
  fixture(c, 29);
  const state = c.Game.getState();
  state.stats = { elapsedMs: 300000, samples: [{ at: 0, gold: 5 }], goldPerSec: 1, killsPerSec: 1 };
  c.storage.set("squad_v1", JSON.stringify({ schemaVersion: c.DATA.schemaVersion, savedAt: Date.now(), state }));
  assert.equal(c.Game.load(), true);
  c.Game.step();
  assert.equal(c.Game.getState().stats.goldPerSec, 0);
  assert.equal(c.Game.getState().stats.killsPerSec, 0);
});
test("locked stages and invalid modes are rejected; corrupted saves preserve live state", () => {
  const c = context();
  assert.equal(c.Game.selectStage(1), false);
  assert.equal(c.Game.selectStage(-1), false);
  assert.equal(c.Game.setMode("chaos"), false);
  const before = plain(c.Game.getState());
  for (const value of ["{", "null", '{"schemaVersion":2}', '{"schemaVersion":1,"state":{}}']) {
    c.storage.set("squad_v1", value);
    assert.equal(c.Game.load(), false);
    assert.deepEqual(plain(c.Game.getState()), before);
  }
  const corrupt = plain(before);
  corrupt.battle.enemies[0].position = 99;
  c.storage.set("squad_v1", JSON.stringify({ schemaVersion: 1, savedAt: Date.now(), state: corrupt }));
  assert.equal(c.Game.load(), false);
  assert.deepEqual(plain(c.Game.getState()), before);
});
test("runtime installs only 100ms combat and 3s autosave timers; pause clears both", () => {
  const c = context();
  c.Game.resume(); c.Game.resume();
  assert.deepEqual([...c.intervals.values()].map(t => t.ms), [100, 3000]);
  c.Game.pause();
  assert.equal(c.intervals.size, 0);
  assert.equal(JSON.parse(c.storage.get("squad_v1")).schemaVersion, 2);
});
test("all 30 stages and equipment data are defined; P3 skills stay empty", () => {
  const c = context();
  assert.equal(c.DATA.stages.length, 30);
  assert.equal(c.DATA.equipmentTiers.length, 8);
  c.DATA.stages.forEach((stage, i) => {
    assert.equal(stage.index, i);
    assert.equal(stage.timeLimit, 60);
    assert.equal(stage.boss, i % 10 === 9);
    assert.equal(stage.waves.length, 3);
    stage.waves.forEach((wave, n) => assert.ok(stage.boss && n === 2 ? wave.length === 1 : wave.length >= 2 && wave.length <= 4));
  });
  assert.equal(c.Game.getState().inventory.length, 0);
  assert.ok(c.Game.getState().battle.units.every(u => u.skills.length === 3 && u.skills.every(s => s === null)));
});
function setState(c, state) {
  c.storage.set("squad_v1", JSON.stringify({ schemaVersion: 2, savedAt: Date.now(), state }));
  assert.equal(c.Game.load(), true);
}
function itemsOf(c, count, slot = "weapon", tier = 1, rarity = "rare") {
  const items = [];
  while (items.length < count) {
    const item = c.Game.rollItem(0, { forcedTier: tier });
    if (item.slot === slot && item.rarity === rarity) items.push(item);
  }
  return items;
}
function stock(c, items, gold = 1000000, coins = 100) {
  const state = c.Game.getState();
  state.inventory = items;
  state.gold = gold; state.squadCoins = coins;
  state.mercenaries.forEach(m => { m.equipment = { weapon: null, hat: null, gloves: null, shoes: null }; });
  setState(c, state);
}
test("P2: 2,000 rolls per stage band respect tier bounds, boss tiers, rarity lines and ranges", () => {
  const c = context();
  for (const band of c.DATA.dropTables) {
    for (let n = 0; n < 2000; n++) {
      const item = c.Game.rollItem(n % 2 ? band.min : band.max);
      assert.ok(band.tierWeights[item.tier] > 0);
      if (band.guaranteedTier) assert.equal(item.tier, band.guaranteedTier);
      assert.equal(item.potentials.length, c.DATA.equipmentRarities[item.rarity].lines);
      const rank = c.DATA.rarityOrder.indexOf(item.rarity);
      for (const p of item.potentials) {
        const option = c.DATA.potentialPool.find(o => o.id === p.id);
        assert.ok(option.weights[rank] > 0 && p.value >= option.ranges[rank][0] && p.value <= option.ranges[rank][1]);
      }
    }
  }
  for (let tier = 1; tier <= 8; tier++) assert.equal(c.Game.rollItem(0, { forcedTier: tier }).tier, tier);
  assert.equal(c.Game.rollItem(-1), null);
  assert.equal(c.Game.rollItem(30), null);
  assert.equal(c.Game.rollItem(0, { forcedTier: 9 }), null);
});
test("P2: every real boss kill drops its guaranteed tier, and fresh play drops in two minutes", () => {
  const c = context();
  for (const stage of [9, 19, 29]) {
    fixture(c, stage, 150);
    const drops = [];
    const off = c.Game.on("itemDrop", item => drops.push(item));
    untilResult(c); off();
    assert.ok(drops.some(i => i.enemyId === "enemy-2-0" && i.tier === Math.floor(stage / 10) + 2));
  }
  c.Game.reset();
  for (let n = 0; n < 1200; n++) c.Game.step();
  console.log("     Fresh 120s drops: " + c.Game.getState().inventory.length);
  assert.ok(c.Game.getState().inventory.length >= 3);
});
test("P2: fusion validates three distinct matching unlocked unequipped materials and gold", () => {
  const c = context();
  const items = itemsOf(c, 3).concat(itemsOf(c, 1, "hat"), itemsOf(c, 1, "weapon", 2));
  stock(c, items, 99);
  const uids = items.slice(0, 3).map(i => i.uid);
  assert.equal(c.Game.fuse(uids), null);
  stock(c, items);
  const before = plain(c.Game.getState());
  for (const bad of [[], uids.slice(0, 2), [uids[0], uids[0], uids[1]], [uids[0], uids[1], "missing"],
    [uids[0], uids[1], items[3].uid], [uids[0], uids[1], items[4].uid]]) assert.equal(c.Game.fuse(bad), null);
  assert.deepEqual(plain(c.Game.getState()), before);
  c.Game.toggleLock(uids[0]); assert.equal(c.Game.fuse(uids), null); c.Game.toggleLock(uids[0]);
  c.Game.equip(uids[0], "warrior"); assert.equal(c.Game.fuse(uids), null); c.Game.unequip("warrior", "weapon");
  const result = c.Game.fuse(uids);
  assert.equal(result.tier, 2); assert.equal(result.slot, "weapon");
  assert.equal(c.Game.getState().gold, 999900);
  assert.ok(!c.Game.getState().inventory.some(i => uids.includes(i.uid)));
  stock(c, itemsOf(c, 3, "weapon", 8));
  assert.equal(c.Game.fuse(c.Game.getState().inventory.map(i => i.uid)), null);
});
test("P2: rarity bumps at 0.15 ± 0.02 over 5,000 actual fusions; highest rarity is retained", () => {
  const c = context();
  let bumps = 0;
  for (let n = 0; n < 5000; n++) {
    const items = itemsOf(c, 3);
    stock(c, items);
    const item = c.Game.fuse(items.map(i => i.uid));
    if (item.rarity === "epic") bumps++;
    else assert.equal(item.rarity, "rare");
  }
  console.log("     Fusion bump rate: " + bumps / 5000);
  assert.ok(Math.abs(bumps / 5000 - 0.15) <= 0.02);
  const mixed = itemsOf(c, 2).concat(itemsOf(c, 1, "weapon", 1, "legendary"));
  stock(c, mixed);
  assert.equal(c.Game.fuse(mixed.map(i => i.uid)).rarity, "legendary");
});
test("P2: autoFuse cascades lowest tier first, respects protection, gold and tier 8", () => {
  const c = context();
  const items = itemsOf(c, 27).concat(itemsOf(c, 6, "hat"), itemsOf(c, 3, "shoes", 8));
  items[27].locked = true;
  stock(c, items);
  c.Game.equip(items[28].uid, "warrior");
  const results = c.Game.autoFuse();
  assert.equal(results.at(-1).tier, 4);
  assert.ok(results.slice(0, 10).every(i => i.tier === 2));
  const state = c.Game.getState();
  assert.equal(state.inventory.find(i => i.uid === items[27].uid).locked, true);
  assert.equal(state.inventory.find(i => i.uid === items[28].uid).equippedBy, "warrior");
  for (const slot of c.DATA.equipmentSlots) for (let t = 1; t < 8; t++) {
    assert.ok(state.inventory.filter(i => i.slot === slot.id && i.tier === t && !i.locked && !i.equippedBy).length < 3);
  }
  c.Game.unequip("warrior", "hat");
  stock(c, itemsOf(c, 9), 100);
  assert.equal(c.Game.autoFuse().length, 1);
  assert.equal(c.Game.getState().gold, 0);
});
test("P2: equip raises CP immediately, preserves HP ratio and unequip restores CP", () => {
  const c = context();
  const items = itemsOf(c, 1).concat(itemsOf(c, 1, "hat"));
  stock(c, items);
  for (let i = 0; i < 20; i++) c.Game.step();
  const cp = c.Game.getCP(), unit = c.Game.getState().battle.units[0];
  assert.equal(c.Game.equip(items[0].uid, "archer"), false);
  c.Game.equip(items[0].uid, "warrior"); c.Game.equip(items[1].uid, "warrior");
  assert.ok(c.Game.getCP() > cp);
  const after = c.Game.getState().battle.units[0];
  assert.ok(after.atk > unit.atk && after.maxHp > unit.maxHp);
  assert.ok(Math.abs(after.hp / after.maxHp - unit.hp / unit.maxHp) < 1e-12);
  c.Game.unequip("warrior", "weapon"); c.Game.unequip("warrior", "hat");
  assert.equal(c.Game.getCP(), cp);
  assert.equal(c.Game.getState().inventory[0].equippedBy, null);
});
test("P2: sell is atomic, lock protects materials, reroll charges 20 and works while locked/equipped", () => {
  const c = context();
  const items = itemsOf(c, 3);
  stock(c, items, 0, 20);
  c.Game.toggleLock(items[0].uid);
  assert.equal(c.Game.sell([items[0].uid, items[1].uid]), false);
  c.Game.equip(items[1].uid, "warrior");
  assert.equal(c.Game.sell([items[1].uid]), false);
  assert.equal(c.Game.sell([items[2].uid, items[2].uid]), false);
  assert.equal(c.Game.sell(["missing"]), false);
  assert.equal(c.Game.sell([items[2].uid]), c.DATA.sellPrice(1, "rare"));
  c.Game.equip(items[0].uid, "warrior");
  let event; c.Game.on("potentialReroll", e => { event = e; });
  const rolled = c.Game.rerollPotentials(items[0].uid);
  assert.equal(rolled.locked, true); assert.equal(rolled.equippedBy, "warrior");
  assert.equal(event.before.length, event.after.length);
  assert.equal(c.Game.getState().squadCoins, 0);
  assert.equal(c.Game.rerollPotentials(items[0].uid), null);
});
test("P2: schema v1 migration and populated v2 round-trip; bad equipment saves rejected", () => {
  const c = context();
  const legacy = c.Game.getState();
  legacy.schemaVersion = 1;
  delete legacy.inventory; delete legacy.overflow; delete legacy.nextItemUid;
  legacy.mercenaries.forEach(m => { delete m.equipment; });
  c.storage.set("squad_v1", JSON.stringify({ schemaVersion: 1, savedAt: Date.now(), state: legacy }));
  assert.equal(c.Game.load(), true);
  assert.equal(c.Game.getState().schemaVersion, 2);
  assert.deepEqual(plain(c.Game.getState().inventory), []);
  const item = itemsOf(c, 1)[0]; stock(c, [item]); c.Game.equip(item.uid, "warrior");
  c.Game.save(); const before = plain(c.Game.getState());
  assert.equal(c.Game.load(), true); assert.deepEqual(plain(c.Game.getState()), before);
  for (const corrupt of [s => { s.inventory.push(s.inventory[0]); }, s => { s.inventory[0].base.atk = 999; },
    s => { s.mercenaries[0].equipment.weapon = null; }, s => { s.inventory[0].potentials[0].value = 500; }]) {
    const state = plain(before); corrupt(state);
    c.storage.set("squad_v1", JSON.stringify({ schemaVersion: 2, savedAt: Date.now(), state }));
    assert.equal(c.Game.load(), false); assert.deepEqual(plain(c.Game.getState()), before);
  }
});
test("P2: inventory cap sells lowest eligible rare; fully protected bag monetizes incoming drop", () => {
  const c = context();
  fixture(c, 9, 150);
  const items = itemsOf(c, 60, "weapon", 3);
  items[0].locked = true;
  stock(c, items);
  c.Game.equip(items[1].uid, "warrior");
  const events = [], drops = [];
  c.Game.on("inventoryFull", e => events.push(e)); c.Game.on("itemDrop", e => drops.push(e));
  untilResult(c);
  assert.ok(events.length >= 1); assert.equal(events.length, drops.length);
  assert.equal(c.Game.getState().inventory.length, 60);
  assert.ok(events.every(e => e.sold.tier === 2 && !e.kept || e.sold.tier === 3 && e.kept));
  assert.ok(c.Game.getState().inventory.some(i => i.uid === items[0].uid));
  assert.ok(c.Game.getState().inventory.some(i => i.uid === items[1].uid));
  fixture(c, 9, 150);
  const protectedItems = itemsOf(c, 60); protectedItems.forEach(i => { i.locked = true; }); stock(c, protectedItems);
  events.length = 0; drops.length = 0; untilResult(c);
  assert.ok(events.length >= 1 && events.every(e => !e.kept && e.gold > 0));
  assert.equal(c.Game.getState().overflow, events.length);
  assert.equal(c.Game.getState().inventory.length, 60);
});
test("P2: all combat potentials apply, gold/drop bonuses work and invincibility stays inert", () => {
  const c = context();
  const items = c.DATA.equipmentSlots.map(s => itemsOf(c, 1, s.id, 1, "legendary")[0]);
  items[0].potentials = [{ id: "atkPct", value: .2 }, { id: "hpPct", value: .25 }, { id: "defPct", value: .25 }];
  items[1].potentials = [{ id: "attackSpeedPct", value: .15 }, { id: "critChance", value: .12 }, { id: "critDamage", value: .4 }];
  items[2].potentials = [{ id: "goldPct", value: .3 }, { id: "dropPct", value: .12 }, { id: "invincibleOnHit", value: .06 }];
  items[3].potentials = [{ id: "atkPct", value: .2 }, { id: "hpPct", value: .25 }, { id: "defPct", value: .25 }];
  stock(c, items, 0);
  items.forEach(i => c.Game.equip(i.uid, "warrior"));
  const base = c.DATA.mercenaryStats("warrior", 1), stats = c.Game.mercenaryStats("warrior");
  for (const key of ["atk", "hp", "def", "attackSpeed", "critChance", "critDamage"]) {
    const flat = base[key] + items.reduce((sum, i) => sum + (i.base[key] || 0), 0);
    const expected = ({ atk: flat * 1.4, hp: flat * 1.5, def: flat * 1.5, attackSpeed: flat * 1.15,
      critChance: flat + .12, critDamage: flat + .4 })[key];
    assert.ok(Math.abs(stats[key] - expected) < 1e-10, key);
  }
  assert.equal(stats.invincibleOnHit, undefined);
  const save = JSON.parse(c.Game.save());
  save.state.battle.enemies[0].hp = 1;
  setState(c, save.state);
  c.Game.rng = () => .085; // Above 8%, below the equipped 8.96% drop threshold.
  c.Game.step();
  assert.equal(c.Game.getState().gold, 7);
  assert.equal(c.Game.getState().inventory.length, 5);
  const plainGame = context();
  const plainState = plainGame.Game.getState(); plainState.battle.enemies[0].hp = 1; setState(plainGame, plainState);
  plainGame.Game.rng = () => .085;
  plainGame.Game.step();
  assert.equal(plainGame.Game.getState().inventory.length, 0);
  assert.equal(plainGame.Game.getState().gold, 5);
});
test("P2: transferring gear clears old owner, and changing gear never revives a downed ally", () => {
  const c = context(); fixture(c, 6, 1);
  const item = itemsOf(c, 1, "hat")[0]; stock(c, [item]);
  const before = c.Game.getCP(); c.Game.equip(item.uid, "warrior"); c.Game.equip(item.uid, "archer");
  let state = c.Game.getState();
  assert.equal(state.mercenaries[0].equipment.hat, null);
  assert.equal(state.mercenaries[1].equipment.hat, item.uid);
  assert.equal(state.inventory[0].equippedBy, "archer");
  c.Game.unequip("archer", "hat"); assert.equal(c.Game.getCP(), before);
  state = c.Game.getState(); state.battle.units[0].hp = 0; setState(c, state);
  c.Game.equip(item.uid, "warrior");
  assert.equal(c.Game.getState().battle.units[0].hp, 0);
  c.Game.unequip("warrior", "hat");
  assert.equal(c.Game.getState().battle.units[0].hp, 0);
});
console.log("\n" + passed + " tests passed.");
