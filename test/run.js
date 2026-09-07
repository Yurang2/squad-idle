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
  for (const file of ["data", "battle", "game"]) {
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
  c.storage.set("squad_v1", JSON.stringify({ schemaVersion: 1, savedAt: Date.now(), state }));
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
  c.storage.set("squad_v1", JSON.stringify({ schemaVersion: 1, savedAt: Date.now(), state }));
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
  assert.equal(JSON.parse(c.storage.get("squad_v1")).schemaVersion, 1);
});
test("all 30 stages and future equipment data are defined without P2/P3 logic", () => {
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
  assert.equal(c.Game.getState().inventory, undefined);
  assert.ok(c.Game.getState().battle.units.every(u => u.skills.length === 3 && u.skills.every(s => s === null)));
});
console.log("\n" + passed + " tests passed.");
