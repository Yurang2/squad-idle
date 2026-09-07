"use strict";

module.exports = function ({ test, context, plain, setState, fixture, untilResult, assert }) {
  test("P3: report math, 24h cap, no advance before harvest, exact-once persistence", () => {
    const c = context();
    const state = c.Game.getState();
    state.stats = { elapsedMs: 10000, samples: [{ at: 10000, gold: 20 }], goldPerSec: 20, killsPerSec: 2 };
    setState(c, state);
    let emitted; c.Game.on("offlineReport", r => { emitted = r; });
    const report = c.Game.catchUp(3 * 3600000);
    assert.equal(report.gold, 20 * 10800 * .7);
    assert.ok(Math.abs(report.kills - 2 * 10800 * .7) < 1e-8);
    assert.equal(report.xp, report.kills * c.DATA.balance.xpPerKill);
    assert.deepEqual(plain(report), plain(emitted));
    assert.ok(report.items.filter(i => !i.kind).length <= 500);
    assert.equal(c.Game.getState().gold, 0);
    assert.equal(c.Game.getState().inventory.length, 0);
    const pending = plain(c.Game.getState()); c.Game.step();
    assert.deepEqual(plain(c.Game.getState()), pending);
    c.Game.save(); const json = c.storage.get("squad_v1");
    const d = context(); d.storage.set("squad_v1", json); d.Game.init();
    assert.deepEqual(plain(d.Game.getState().pendingReport), plain(report));
    assert.deepEqual(plain(d.Game.catchUp(86400000)), plain(report));
    assert.ok(d.Game.harvest()); assert.equal(d.Game.harvest(), false);
    assert.equal(d.Game.getState().pendingReport, null);
    assert.ok(d.Game.getState().gold >= report.gold);
    assert.ok(d.Game.getState().inventory.length <= 60);
    assert.ok(d.Game.getState().mercenaries[0].level > 1);
    assert.ok(d.Game.getState().skillBooks.warrior > 0);
    assert.equal(d.Game.load(), true); assert.equal(d.Game.getState().pendingReport, null);
    c.Game.reset();
    assert.equal(c.Game.catchUp(48 * 3600000).elapsedMs, 86400000);
  });
  test("P3: fallback rates, 60s boundary, stage-specific statistics and boss XP", () => {
    const c = context();
    assert.equal(c.Game.catchUp(59999), 599);
    c.Game.reset();
    const r = c.Game.catchUp(60000);
    assert.ok(Math.abs(r.kills - .1 * 60 * .7) < 1e-8);
    assert.equal(r.gold, Math.floor(.1 * c.DATA.goldPerKill(0) * 60 * .7));
    c.Game.harvest(); fixture(c, 9, 50);
    const s = c.Game.getState();
    s.stats = { goldPerSec: 10, killsPerSec: 1, elapsedMs: 1000, samples: [{ at: 1000, gold: 10 }] };
    s.statsKey = "normal:9"; setState(c, s);
    assert.equal(c.Game.catchUp(600000).xp, 1400);
    c.Game.harvest(); c.Game.selectStage(0);
    assert.equal(c.Game.getState().stats.killsPerSec, 0);
    c.Game.selectStage(9); assert.equal(c.Game.getState().stats.killsPerSec, 1);
  });
  test("P3: ready skills respect priority and independent cooldowns; book costs and slots", () => {
    const c = context();
    const s = c.Game.getState();
    const sim = c.Battle.start(20, [s.mercenaries[0]]);
    const fired = [];
    const emit = (name, e) => { if (name === "skill") fired.push([e.skillId, sim.ticks]); };
    for (let i = 0; i < 3; i++) c.Battle.tick(sim, emit);
    assert.deepEqual(fired.map(e => e[0]), ["taunt", "guard", "smash"]);
    sim.units[0].hp = sim.units[0].maxHp = 1e8;
    for (let i = 0; i < 61; i++) c.Battle.tick(sim, emit);
    assert.equal(fired.filter(e => e[0] === "smash")[1][1] - fired[2][1], 60);
    assert.equal(c.Game.toggleSkill("warrior", "regen"), false);
    assert.equal(c.Game.toggleSkill("warrior", "taunt"), true);
    assert.equal(c.Game.toggleSkill("warrior", "regen"), true);
    assert.deepEqual(plain(c.Game.getState().mercenaries[0].skills), ["guard", "smash", "regen"]);
    assert.equal(c.Game.toggleSkill("warrior", "meteor"), false);
    const state = c.Game.getState(); state.skillBooks.warrior = 50; setState(c, state);
    assert.equal(c.Game.levelSkill("smash"), true); assert.equal(c.Game.getState().skillBooks.warrior, 49);
    assert.equal(c.Game.levelSkill("smash"), true); assert.equal(c.Game.getState().skillBooks.warrior, 47);
    for (let n = 0; n < 7; n++) assert.equal(c.Game.levelSkill("smash"), true);
    assert.equal(c.Game.getState().mercenaries[0].skillLevels.smash, 10);
    assert.equal(c.Game.levelSkill("smash"), false);
  });
  function skillSim(c, owner, id) {
    const m = c.Game.getState().mercenaries.find(m => m.id === owner); m.skills = [id];
    const sim = c.Battle.start(0, [m]);
    sim.enemies.forEach(u => { u.hp = u.maxHp = 10000; u.cooldown = 999; });
    sim.units[0].cooldown = 999;
    return sim;
  }
  test("P3: all twelve effects, DoT/HoT duration, aggro, shields and invincibility", () => {
    const c = context(); c.Game.rng = () => .5;
    for (const [id, hits] of [["smash", 1], ["volley", 3], ["snipe", 1], ["meteor", 2]]) {
      const def = c.DATA.skills.find(s => s.id === id), sim = skillSim(c, def.owner, id), events = [];
      c.Battle.tick(sim, (n, e) => { if (n === "hit") events.push(e); });
      assert.equal(events.length, hits, id);
      if (id === "snipe") assert.equal(events[0].crit, true);
    }
    const poison = skillSim(c, "archer", "poison"); c.Battle.tick(poison);
    const hp = poison.enemies[0].hp;
    for (let i = 0; i < 60; i++) c.Battle.tick(poison);
    assert.equal(poison.enemies[0].hp, hp - 6 * Math.round(poison.units[0].atk * .45));
    assert.equal(poison.enemies[0].effects.poison, undefined);
    const regen = skillSim(c, "warrior", "regen"); regen.units[0].hp = 50;
    for (let i = 0; i < 51; i++) c.Battle.tick(regen);
    assert.ok(Math.abs(regen.units[0].hp - (50 + 170 * .04 * 5)) < 1e-8);
    const heal = skillSim(c, "mage", "heal"); heal.units[0].hp = 10; c.Battle.tick(heal);
    assert.equal(heal.units[0].hp, 10 + heal.units[0].maxHp * .25);
    for (const id of ["guard", "shield", "dodge"]) {
      const owner = c.DATA.skills.find(s => s.id === id).owner, sim = skillSim(c, owner, id);
      sim.enemies[0].cooldown = 0; c.Game.rng = () => .1;
      c.Battle.tick(sim);
      assert.ok(sim.units[0].effects[id]);
      if (id !== "guard") assert.equal(sim.units[0].hp, sim.units[0].maxHp);
      if (id === "guard") assert.ok(sim.units[0].hp >= sim.units[0].maxHp - 1);
    }
    const taunt = c.Battle.start(0, c.Game.getState().mercenaries);
    taunt.units.forEach(u => { u.skills = []; u.cooldown = 999; });
    taunt.units[2].effects.taunt = { remaining: 4 };
    taunt.enemies.forEach(u => { u.cooldown = 0; });
    const targeted = []; c.Battle.tick(taunt, (n, e) => { if (n === "hit") targeted.push(e.targetId); });
    assert.deepEqual(targeted, ["mage", "mage"]);
    const inv = skillSim(c, "warrior", "smash"); inv.units[0].skills = []; inv.units[0].invincibleOnHit = true;
    inv.enemies[0].cooldown = 0; c.Game.rng = () => .019;
    c.Battle.tick(inv); assert.equal(inv.units[0].hp, inv.units[0].maxHp);
    assert.ok(inv.units[0].effects.invincible);
    c.Game.rng = () => .02;
    for (let n = 0; n < 10; n++) c.Battle.tick(inv);
    assert.equal(inv.units[0].effects.invincible, undefined);
    inv.enemies[0].cooldown = 0; c.Battle.tick(inv); assert.ok(inv.units[0].hp < inv.units[0].maxHp);
  });
  test("P3: revive restores 30% HP exactly once per battle, including across save/load", () => {
    const c = context(); fixture(c, 20, 50);
    const state = c.Game.getState();
    state.battle.units.forEach(u => { u.skills = u.id === "mage" ? ["resurrect"] : []; u.cooldown = 999; });
    state.battle.units[0].hp = 0;
    state.battle.enemies.forEach(u => { u.cooldown = 999; });
    setState(c, state); c.Game.step();
    let sim = c.Game.getState().battle;
    assert.equal(sim.resurrected, true); assert.equal(sim.units[0].hp, sim.units[0].maxHp * .3);
    c.Game.save(); assert.equal(c.Game.load(), true);
    const again = c.Game.getState(); again.battle.units[0].hp = 0;
    again.battle.units[2].skillCooldowns.resurrect = 0; setState(c, again); c.Game.step();
    assert.equal(c.Game.getState().battle.units[0].hp, 0);
    c.Game.selectStage(20); assert.equal(c.Game.getState().battle.resurrected, false);
  });
  test("P3: chaos unlock, separate progress, HP/ATK/gold multipliers and triple first-clear coins", () => {
    const c = context(); assert.equal(c.Game.setDifficulty("chaos"), false);
    fixture(c, 29, 180); untilResult(c);
    assert.ok(c.Game.getState().clearedStages.includes(29));
    assert.equal(c.Game.setDifficulty("chaos"), true);
    const sim = c.Game.getState().battle;
    const normal = c.Battle.start(0, [{ id: "warrior", level: 1 }]);
    assert.equal(sim.enemies[0].hp, normal.enemies[0].hp * 8);
    assert.equal(sim.enemies[0].atk, normal.enemies[0].atk * 5);
    for (let stage = 0; stage < 30; stage++) {
      const a = c.Battle.start(stage, [{ id: "warrior", level: 1 }]);
      const b = c.Battle.start(stage, [{ id: "warrior", level: 1 }], null, "chaos");
      a.enemies.forEach((u, i) => {
        assert.equal(b.enemies[i].maxHp, u.maxHp * 8);
        assert.ok(Math.abs(b.enemies[i].atk - u.atk * 5) < 1e-8);
      });
    }
    const before = c.Game.getState(); untilResult(c);
    const after = c.Game.getState();
    assert.equal(after.gold - before.gold, 8 * c.DATA.goldPerKill(0) * 4);
    assert.equal(after.squadCoins - before.squadCoins, 30);
    assert.deepEqual(plain(after.chaosClearedStages), [0]);
    c.Game.setMode("repeat"); for (let i = 0; i < 15; i++) c.Game.step(); untilResult(c);
    assert.equal(c.Game.getState().squadCoins, after.squadCoins);
    for (let i = 0; i < 1000; i++) { const item = c.Game.rollItem(29); assert.ok(item.tier >= 5 && item.tier <= 8); }
    assert.equal(c.Game.setDifficulty("normal"), true); assert.equal(c.Game.getState().currentStage, 29);
    assert.equal(c.Game.setDifficulty("chaos"), true); assert.equal(c.Game.getState().currentStage, 0);
    c.Game.save(); assert.equal(c.Game.load(), true);
  });
  test("P3: v2→v3 and v1→v3 migrations; JSON import/export is atomic and round-trips", () => {
    for (const version of [1, 2]) {
      const c = context(); for (let i = 0; i < 20; i++) c.Game.step();
      const state = c.Game.getState(), hp = state.battle.units[0].hp;
      state.schemaVersion = version;
      for (const key of ["difficulty", "chaosUnlockedStages", "chaosClearedStages", "normalStage", "chaosStage", "skillBooks", "pendingReport", "stageStats", "statsKey"]) delete state[key];
      state.mercenaries.forEach(m => { delete m.skills; delete m.skillLevels; });
      state.battle.units.forEach(u => { delete u.effects; delete u.skillCooldowns; delete u.skillLevels; u.skills = [null, null, null]; });
      delete state.battle.difficulty; delete state.battle.resurrected;
      assert.equal(c.Game.importSave(JSON.stringify({ schemaVersion: version, savedAt: Date.now(), state })), true);
      assert.equal(c.Game.getState().schemaVersion, 3); assert.equal(c.Game.getState().battle.units[0].hp, hp);
      assert.deepEqual(plain(c.Game.getState().mercenaries[0].skills), ["taunt", "guard", "smash"]);
      const json = c.Game.exportSave(), d = context(); assert.equal(d.Game.importSave(json), true);
      assert.deepEqual(plain(c.Game.getState()), plain(d.Game.getState()));
      const before = plain(d.Game.getState());
      for (const corrupt of ["bad", "null", '{"schemaVersion":99}', json.replace('"taunt":1', '"taunt":99'), json.replace('"warrior":0', '"warrior":-1')]) {
        assert.equal(d.Game.importSave(corrupt), false); assert.deepEqual(plain(d.Game.getState()), before);
      }
    }
  });
  test("P3: 3% class books persist on kill; corrupt skill/effect/report imports stay atomic", () => {
    const c = context(); const initial = c.Game.getState();
    initial.battle.units[0].skills = []; initial.battle.enemies[0].hp = 1; setState(c, initial);
    c.Game.rng = () => .0299; c.Game.step();
    assert.equal(c.Game.getState().skillBooks.warrior, 1);
    assert.equal(JSON.parse(c.storage.get("squad_v1")).state.skillBooks.warrior, 1);
    c.Game.reset(); const other = c.Game.getState();
    other.battle.units[0].skills = []; other.battle.enemies[0].hp = 1; setState(c, other);
    c.Game.rng = () => .03; c.Game.step(); assert.equal(c.Game.getState().skillBooks.warrior, 0);
    c.Game.catchUp(10800000);
    const good = JSON.parse(c.Game.exportSave()), before = plain(c.Game.getState());
    assert.equal(c.Game.validateSave(JSON.stringify(good)), true);
    const mutations = [
      s => { delete s.battle.units[0].effects; },
      s => { s.battle.units[0].skillCooldowns.smash = -1; },
      s => { s.mercenaries[0].skills = ["meteor"]; },
      s => { s.pendingReport.items[0].tier = 99; },
      s => { s.pendingReport.items.push(s.pendingReport.items[0]); },
      s => { s.pendingReport.gold = -1; },
      s => { s.statsKey = "__proto__"; }
    ];
    for (const mutate of mutations) {
      const broken = plain(good); mutate(broken.state);
      assert.equal(c.Game.validateSave(JSON.stringify(broken)), false);
      assert.equal(c.Game.importSave(JSON.stringify(broken)), false);
      assert.deepEqual(plain(c.Game.getState()), before);
    }
  });
  test("P3: full normal run clears 3-10 in six simulated hours with equipment, fusion and skills", () => {
    require("./long-run")({ context, assert });
  });
};
