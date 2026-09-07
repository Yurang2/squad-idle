"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const files = ["data", "data-monsters", "battle", "game", "game-monsters", "game-expedition", "game-save"];
function runtime() {
  const storage = new Map(), timers = new Map(); let nextTimer = 1;
  const c = vm.createContext({ console, Date, setInterval: (f, ms) => { const id = nextTimer++; timers.set(id, { f, ms }); return id; },
    clearInterval: id => timers.delete(id), localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) } });
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, "js", f + ".js"), "utf8"), c, { filename: f + ".js" }));
  return { ...c, storage, timers };
}
const plain = v => JSON.parse(JSON.stringify(v));
let passed = 0;
function test(name, fn) { fn(); console.log("PASS " + name); passed++; }
function ticks(g, n) { for (let i = 0; i < n; i++) g.step(); }
function edit(g, fn) { const d = JSON.parse(g.save()); fn(d.state); assert.equal(g.load(JSON.stringify(d)), true); }
function add(g, id, rarity = "rare") {
  const m = g.rollMonster(id, rarity);
  edit(g, s => { s.roster.push(m); s.dex[id] = { seen: true, caught: true }; });
  return m;
}
const { DATA, Game, Battle } = runtime();
test("18 exact species and manifest paths exist, one skill per species, no equipment/mercenaries", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/monsters/manifest.json"), "utf8"));
  assert.equal(Object.keys(DATA.species).length, 18);
  assert.deepEqual(Object.keys(DATA.species).sort(), Object.keys(manifest).sort());
  for (const s of Object.values(DATA.species)) {
    assert.equal(s.art, manifest[s.id]); assert.ok(fs.statSync(path.join(root, s.art)).size > 10000);
    assert.ok(s.baseStats.hp > 0 && s.growth > 0 && s.catchRate > 0 && s.catchRate <= 1 && s.campJob);
    assert.ok(["hit", "heal", "shield", "dot"].includes(s.skill.effect.type));
  }
  Object.values(DATA.assets).forEach(f => assert.ok(fs.existsSync(path.join(root, f))));
  assert.equal(DATA.mercenaries, undefined); assert.equal(DATA.equipmentSlots, undefined);
});
test("30 regional stages, three waves and uncapturable placeholder boss species", () => {
  assert.equal(DATA.stages.length, 30);
  DATA.stages.forEach((s, i) => {
    assert.equal(s.timeLimit, 60); assert.equal(s.waves.length, 3);
    s.waves.flat().forEach(id => assert.equal(DATA.species[id].region, DATA.regions[s.region].id));
    assert.equal(s.boss, i % 10 === 9);
  });
});
test("fresh dewslime/mistfox party clears 1-1 and captures within 180 seconds across 30 seeds", () => {
  let longest = 0;
  for (let seed = 1; seed <= 30; seed++) {
    Game.reset(seed); let captureAt = 0, tick = 0;
    const off = Game.on("capture", () => { if (!captureAt) captureAt = tick; });
    while ((!Game.getState().clearedStages.includes(0) || !captureAt) && tick < 1800) { tick++; Game.step(); }
    assert.ok(Game.getState().clearedStages.includes(0)); assert.ok(captureAt > 0 && captureAt <= 1800);
    longest = Math.max(longest, captureAt); off();
  }
  console.log("  Longest first capture: " + longest / 10 + "s");
});
test("capture math, strict 30% boundary, boost/rank and 100% clamp", () => {
  assert.ok(Math.abs(Battle.captureProbability("mistfox", .2, 3, 1) - .88 * .8 * 1.06) < 1e-12);
  assert.equal(Battle.captureProbability("mistfox", .2, 3, 1.5), 1);
  for (const hp of [0, -.1, .3, .7, NaN]) assert.equal(Battle.captureProbability("mistfox", hp, 1), 0);
});
test("capture success removes target, grants one reward, creates exact monster instance", () => {
  Game.reset(); let captured;
  const off = Game.on("capture", e => { captured = e; }); Game.step(); off();
  assert.ok(captured); const s = Game.getState(), enemy = s.battle.enemies.find(e => e.id === captured.id);
  assert.equal(enemy.hp, 0); assert.equal(enemy.captured, true); assert.equal(s.roster.length, 3);
  assert.deepEqual(Object.keys(captured.monster).sort(), ["uid", "speciesId", "rarity", "level", "xp", "traits", "enhance", "evo", "party", "camp"].sort());
  assert.equal(s.gold, DATA.goldPerKill(0)); assert.equal(s.tamerXP, DATA.balance.xpPerKill);
  assert.equal(s.battle.tamer.captureCooldown, 8);
});
test("capture failure consumes boost and respects eight-second cooldown", () => {
  Game.reset(); const sim = Battle.start(0, Game.getState().roster);
  sim.enemies[0].hp = sim.enemies[0].maxHp * .2;
  sim.tamer.cooldowns.captureBoost = 18; sim.tamer.captureBoost = 1.5;
  const old = Game.rng; Game.rng = () => .999999;
  // Use lower-rate lakebat so even the boost remains below one at 29% HP.
  sim.enemies[0].speciesId = "lakebat"; sim.enemies[0].hp = sim.enemies[0].maxHp * .299;
  let failures = 0, attempts = 0;
  Battle.tick(sim, e => { if (e === "captureFail") failures++; if (e === "captureAttempt") attempts++; });
  Game.rng = old; assert.equal(failures, 1); assert.equal(attempts, 1); assert.equal(sim.tamer.captureBoost, 1);
  assert.equal(sim.tamer.captureCooldown, 8);
  Battle.tick(sim, e => { if (e === "captureAttempt") attempts++; }); assert.equal(attempts, 1);
});
test("roster cap stops capture without deleting existing monsters, offline obeys same cap", () => {
  Game.reset(); while (Game.getState().roster.length < 20) add(Game, "mistfox");
  const ids = Game.getState().roster.map(m => m.uid); let attempts = 0;
  const off = Game.on("captureAttempt", () => attempts++); ticks(Game, 1800); off();
  assert.equal(attempts, 0); assert.deepEqual(Game.getState().roster.map(m => m.uid), ids);
  assert.equal(Game.canCapture(), false); const r = Game.catchUp(3600000); assert.equal(r.monsters.length, 0);
  Game.harvest(); assert.equal(Game.getState().roster.length, 20);
});
test("party slots unlock at ranks 3/6/10, slots unique, final member protected", () => {
  Game.reset(); assert.deepEqual([1, 2, 3, 5, 6, 9, 10, 20].map(r => Game.partySlots(r)), [2, 2, 3, 3, 4, 4, 5, 5]);
  const m = add(Game, "lakebat"); assert.equal(Game.toggleParty(m.uid), false);
  edit(Game, s => { s.tamerXP = DATA.rankXP[2]; }); assert.equal(Game.getRank(), 3); assert.equal(Game.toggleParty(m.uid), true);
  assert.equal(Game.getState().roster.find(u => u.uid === m.uid).party, 2);
  assert.equal(Game.toggleParty("monster-1"), true); assert.equal(Game.toggleParty("monster-2"), true);
  assert.equal(Game.toggleParty(m.uid), false); assert.equal(Game.toggleParty("missing"), false);
});
test("formation changes wait until next attempt, no healing or capture cooldown reset", () => {
  Game.reset(); ticks(Game, 12); const before = Game.getState().battle;
  Game.toggleParty("monster-2"); assert.deepEqual(Game.getState().battle, before);
  Game.selectStage(0); const after = Game.getState().battle;
  assert.equal(after.units.length, 1); assert.equal(after.tamer.captureCooldown, before.tamer.captureCooldown);
});
test("tank role takes enemy targeting priority independent of roster slot", () => {
  Game.reset(); const sim = Battle.start(0, Game.getState().roster.slice().reverse());
  sim.units.forEach(u => { u.cooldown = 10; u.skillCooldown = 10; });
  sim.enemies.forEach(u => { u.cooldown = 0; });
  const targets = []; Battle.tick(sim, (e, p) => { if (e === "hit" && p.side === "enemy") targets.push(p.targetId); });
  assert.ok(targets.length); assert.ok(targets.every(id => id === "monster-1"));
});
test("tamer cheer lasts five seconds, heal restores 20%, boost applies to next capture", () => {
  Game.reset(); const sim = Battle.start(0, Game.getState().roster);
  sim.units.forEach(u => { u.hp = u.maxHp * .5; u.cooldown = 10; u.skillCooldown = 10; });
  sim.enemies.forEach(u => { u.cooldown = 10; u.skillCooldown = 10; });
  sim.tamer.cooldowns = { cheer: 0, heal: 0, captureBoost: 0 };
  Battle.tick(sim); assert.equal(sim.tamer.captureBoost, 1.5);
  sim.units.forEach(u => { assert.ok(Math.abs(u.hp / u.maxHp - .7) < 1e-9); assert.ok(u.effects.cheer.remaining > 4.8); });
  for (let i = 0; i < 50; i++) { sim.enemies.forEach(u => { u.hp = u.maxHp; }); Battle.tick(sim); }
  assert.ok(sim.units.every(u => !u.effects.cheer));
});
test("monster skills heal, shield, hit and DOT; boss cannot be captured", () => {
  for (const id of ["lakebat", "dewslime", "mistfox", "glowmoth"]) {
    Game.reset(); const m = Game.rollMonster(id); m.party = 0;
    const sim = Battle.start(0, [m]); sim.units[0].skillCooldown = 0; sim.units[0].hp *= .5;
    sim.tamer.cooldowns = { cheer: 15, heal: 12, captureBoost: 18 }; sim.tamer.captureCooldown = 8;
    const events = []; Battle.tick(sim, (e, p) => events.push([e, p]));
    assert.ok(events.some(([e, p]) => e === "skill" && p.id === m.uid));
    if (id === "lakebat") assert.ok(sim.units[0].hp > sim.units[0].maxHp * .5);
    if (id === "dewslime") assert.ok(sim.units[0].effects.shield.power > 0);
    if (id === "glowmoth") assert.ok(sim.enemies.some(u => u.effects.poison));
    if (id === "mistfox") assert.ok(events.some(([e]) => e === "hit"));
  }
  Game.reset(); const sim = Battle.start(9, Game.getState().roster); sim.enemies.forEach(u => { u.boss = true; u.hp *= .2; });
  let attempts = 0; Battle.tick(sim, e => { if (e === "captureAttempt") attempts++; }); assert.equal(attempts, 0);
});
test("60-second timeout, three waves, repeat and challenge progression", () => {
  Game.reset(); const sim = Battle.start(0, Game.getState().roster); sim.ticks = 599;
  sim.units.concat(sim.enemies).forEach(u => { u.cooldown = 10; u.skillCooldown = 10; });
  Battle.tick(sim); assert.equal(sim.status, "fail"); assert.equal(sim.ticks, 600);
  Game.setMode("repeat"); ticks(Game, 600); assert.equal(Game.getState().currentStage, 0);
  Game.setMode("challenge"); ticks(Game, 600); assert.ok(Game.getState().currentStage > 0);
});
test("rarity/potential helper supplies 0–3 valid traits and stat multipliers", () => {
  Game.reset(); const base = Game.monsterStats("monster-2");
  DATA.rarityOrder.forEach((r, i) => {
    const m = Game.rollMonster("mistfox", r); assert.equal(m.traits.length, i);
    const stats = Game.monsterStats(m); assert.ok(stats.hp >= base.hp * DATA.rarities[r].multiplier - 1);
  });
});
test("save/load/export/import preserves roster, HP, cooldowns, XP, dex and RNG", () => {
  Game.reset(123); ticks(Game, 99); const before = Game.getState(), json = Game.exportSave();
  assert.equal(JSON.parse(json).schemaVersion, 4); assert.ok(Game.validateSave(json));
  ticks(Game, 400); assert.equal(Game.load(json), true); assert.deepEqual(Game.getState(), before);
  assert.equal(Game.importSave(json), true); assert.deepEqual(Game.getState(), before);
  const draws = Array.from({ length: 8 }, () => Game.rng()); Game.load(json);
  assert.deepEqual(Array.from({ length: 8 }, () => Game.rng()), draws);
});
test("v3 and malformed imports rejected atomically, fresh init replaces old schema", () => {
  Game.reset(); const json = Game.save(), before = Game.getState();
  const badEdits = [s => { s.roster[0].party = 4; }, s => { s.roster[1].uid = s.roster[0].uid; },
    s => { s.battle.units[0].hp = -1; }, s => { s.battle.tamer.captureBoost = 99; }, s => { s.dex = {}; },
    s => { s.roster[0].speciesId = "__proto__"; }, s => { s.roster[0].enhance = 1; },
    s => { s.pendingReport = { elapsedMs: 1, gold: 10, xp: 1, monsters: [s.roster[0]], stageIndex: 0 }; }];
  badEdits.forEach(fn => { const d = JSON.parse(json); fn(d.state); assert.equal(Game.load(JSON.stringify(d)), false); assert.deepEqual(Game.getState(), before); });
  assert.equal(Game.load('{"schemaVersion":3,"state":{}}'), false);
  const c = runtime(); c.storage.set("squad_v1", '{"schemaVersion":3,"state":{}}'); c.Game.init();
  assert.equal(c.Game.getState().roster.length, 2); assert.equal(JSON.parse(c.storage.get("squad_v1")).schemaVersion, 4);
});
test("offline rewards use 70% gold/XP, eight-hour cap, 50% capture probability, one-time harvest", () => {
  Game.reset(); const before = Game.getState(); const report = Game.catchUp(3600000);
  assert.equal(report.gold, 1260); assert.equal(report.xp, 756); assert.ok(report.monsters.length > 0 && report.monsters.length <= 18);
  assert.equal(Game.getState().gold, before.gold); assert.equal(Game.getState().roster.length, 2);
  const pending = Game.save(), frozen = Game.getState(); ticks(Game, 100); assert.deepEqual(Game.getState(), frozen);
  assert.deepEqual(Game.catchUp(3600000), report); assert.equal(Game.load(pending), true);
  assert.deepEqual(Game.harvest(), report); const after = Game.getState(); assert.equal(Game.harvest(), false); assert.deepEqual(Game.getState(), after);
  assert.equal(after.gold, report.gold); assert.equal(after.roster.length, report.monsters.length + 2);
  Game.reset(); assert.equal(Game.catchUp(99 * 3600000).elapsedMs, 8 * 3600000);
  // At 20% HP, .6 passes online rates but exceeds all region-1 half-probabilities.
  Game.reset(); const old = Game.rng; Game.rng = () => .6;
  assert.equal(Game.catchUp(60000).monsters.length, 0); Game.rng = old;
});
test("short offline catch-up uses half capture probability, correct threshold and bounded ticks", () => {
  Game.reset(); const old = Game.rng; Game.rng = () => .6;
  assert.equal(Game.catchUp(100), 1); assert.equal(Game.getState().roster.length, 2); Game.rng = old;
  assert.equal(Game.captureMultiplier(), 1); assert.equal(Game.catchUp(NaN), 0);
  Game.reset(); assert.equal(Game.catchUp(59999), 599); assert.equal(Game.getState().pendingReport, null);
  assert.ok(Game.catchUp(60000).monsters);
});
test("dex tracks seen vs caught and supplies silhouettes only for unseen entries", () => {
  Game.reset(); let dex = Game.getDex(); assert.equal(dex.length, 18);
  assert.ok(dex.find(e => e.speciesId === "dewslime").caught);
  assert.equal(dex.find(e => e.speciesId === "lakebat").seen, true); assert.equal(dex.find(e => e.speciesId === "lakebat").caught, false);
  assert.equal(dex.find(e => e.speciesId === "icewolf").silhouette, true); assert.equal(dex.find(e => e.speciesId === "icewolf").name, "미발견");
  Game.step(); dex = Game.getDex(); assert.ok(dex.find(e => e.speciesId === "mistfox").caught);
  dex.forEach(e => assert.equal(e.silhouette, !e.seen));
});
test("10Hz timer and idempotent pause/resume, four namespaces and DOM-free logic", () => {
  const c = runtime(); c.Game.resume(); c.Game.resume(); assert.equal(c.timers.size, 2);
  assert.ok([...c.timers.values()].some(t => t.ms === 100)); c.Game.pause(); c.Game.pause(); assert.equal(c.timers.size, 0);
  files.forEach(f => { const text = fs.readFileSync(path.join(root, "js", f + ".js"), "utf8"); assert.ok(!/Math\.random\(|\bdocument\b|\bwindow\b/.test(text), f); });
  const all = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith('.js'));
  all.forEach(f => assert.ok(fs.readFileSync(path.join(root, "js", f), "utf8").split('\n').length <= 600, f));
});
console.log("\n" + passed + " PASS");
