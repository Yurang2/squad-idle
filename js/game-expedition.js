"use strict";

Game.registerExpedition(function (host) {
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function defaults(merc) {
    merc.skills = DATA.defaultSkills[merc.id].slice();
    merc.skillLevels = Object.fromEntries(DATA.skills.filter(function (s) { return s.owner === merc.id; }).map(function (s) { return [s.id, 1]; }));
  }
  function migrate(data) {
    var s = data.state;
    s.schemaVersion = data.schemaVersion = 3;
    s.difficulty = "normal"; s.chaosUnlockedStages = [0]; s.chaosClearedStages = [];
    s.normalStage = s.currentStage; s.chaosStage = 0;
    s.skillBooks = { warrior: 0, archer: 0, mage: 0 }; s.pendingReport = null;
    // DECISION: v2 mixed-stage statistics cannot reliably price the stage left running.
    s.stageStats = {}; s.statsKey = "normal:" + s.currentStage;
    s.stats = { goldPerSec: 0, killsPerSec: 0, elapsedMs: 0, samples: [] };
    s.mercenaries.forEach(defaults);
    s.battle.difficulty = "normal"; s.battle.resurrected = false;
    s.battle.units.forEach(function (u) {
      var m = s.mercenaries.find(function (merc) { return merc.id === u.id; });
      u.skills = m.skills.slice(); u.skillLevels = copy(m.skillLevels); u.effects = {}; u.skillCooldowns = {};
      u.invincibleOnHit = s.inventory.some(function (item) {
        return item.equippedBy === u.id && item.potentials.some(function (p) { return p.id === "invincibleOnHit"; });
      });
    });
  }
  function grantXP(amount) {
    host.state().mercenaries.forEach(function (m) {
      if (!m.unlocked) return;
      m.xp += amount;
      var before = m.level;
      while (m.xp >= DATA.xpToNext(m.level)) { m.xp -= DATA.xpToNext(m.level); m.level++; }
      if (before !== m.level) host.emit("levelUp", { id: m.id, level: m.level });
    });
  }
  function bookDrop() {
    if (Game.rng() >= DATA.skillBookChance) return;
    var owner = DATA.mercenaries[Math.floor(Game.rng() * DATA.mercenaries.length)].id;
    host.state().skillBooks[owner]++;
    host.emit("skillBook", { owner: owner, count: 1 });
  }
  function report(elapsedMs) {
    var s = host.state();
    // DECISION: A pending report freezes expedition time until harvest; reopening never rerolls it.
    if (s.pendingReport) { host.emit("offlineReport", copy(s.pendingReport)); return copy(s.pendingReport); }
    elapsedMs = Math.floor(Math.max(0, Math.min(Number.isFinite(elapsedMs) ? elapsedMs : 0, DATA.offline.maxMs)));
    var seconds = elapsedMs / 1000 * DATA.offline.efficiency;
    var stats = s.stats, eq = host.equipment(), band = eq.table(s.currentStage);
    var measured = stats.samples.length > 0 && stats.killsPerSec > 0;
    var killRate = measured ? stats.killsPerSec : DATA.offline.fallbackKillsPerSec;
    var goldRate = measured ? stats.goldPerSec : killRate * Math.round(DATA.goldPerKill(s.currentStage) *
      (s.difficulty === "chaos" ? DATA.chaos.gold : 1) * (1 + eq.bonus("goldPct")));
    var kills = Math.round(killRate * seconds * 1e8) / 1e8;
    var bossShare = DATA.stages[s.currentStage].boss ? 1 / DATA.stages[s.currentStage].waves.flat().length : 0;
    var pNormal = Math.min(1, band.chance * (1 + eq.bonus("dropPct")));
    var probability = pNormal * (1 - bossShare) + (band.bossChance || 0) * bossShare;
    var items = [], rolls = Math.min(DATA.offline.maxRolls, Math.ceil(kills));
    // DECISION: Above 500 kills compress into weighted trials (p × represented kills, capped at 1).
    // At most 500 equipment cards are generated; excess books remain compact class counts.
    for (var i = 0; i < rolls; i++) {
      if (Game.rng() >= Math.min(1, probability * kills / rolls)) continue;
      var boss = bossShare > 0 && Game.rng() < bossShare * band.bossChance / probability;
      items.push(Game.rollItem(s.currentStage, { forcedTier: boss ? band.guaranteedTier : undefined }));
    }
    DATA.mercenaries.forEach(function (m) {
      var expected = kills * DATA.skillBookChance / DATA.mercenaries.length;
      var count = Math.floor(expected) + (Game.rng() < expected % 1 ? 1 : 0);
      if (count) items.push({ kind: "skillBook", owner: m.id, count: count });
    });
    s.pendingReport = { elapsedMs: elapsedMs, gold: Math.floor(goldRate * seconds + 1e-8), kills: kills,
      xp: Math.floor(kills * DATA.balance.xpPerKill * (1 + bossShare * (DATA.balance.bossXpMultiplier - 1)) + 1e-8),
      items: items, stageIndex: s.currentStage, difficulty: s.difficulty };
    host.save();
    host.emit("offlineReport", copy(s.pendingReport));
    return copy(s.pendingReport);
  }
  function harvest() {
    var s = host.state(), reward = s.pendingReport;
    if (!reward) return false;
    // Clear before events and save only after the whole transaction, preventing duplicate harvest.
    s.pendingReport = null;
    s.gold += reward.gold; grantXP(reward.xp);
    reward.items.forEach(function (item) {
      if (item.kind === "skillBook") s.skillBooks[item.owner] += item.count;
      else host.equipment().receive(item, null);
    });
    host.beginStage(); host.changed();
    host.emit("harvest", copy(reward));
    return copy(reward);
  }
  function toggleSkill(owner, id) {
    var s = host.state(), m = s.mercenaries.find(function (merc) { return merc.id === owner; });
    if (s.pendingReport || !m || !m.unlocked || !DATA.skills.some(function (skill) { return skill.id === id && skill.owner === owner; })) return false;
    var index = m.skills.indexOf(id);
    if (index >= 0) m.skills.splice(index, 1);
    else if (m.skills.length < 3) m.skills.push(id);
    else return false;
    var unit = s.battle.units.find(function (u) { return u.id === owner; });
    if (unit) unit.skills = m.skills.slice();
    host.changed(); return true;
  }
  function levelSkill(id) {
    var skill = DATA.skills.find(function (def) { return def.id === id; }), s = host.state();
    if (!skill || s.pendingReport) return false;
    var m = s.mercenaries.find(function (merc) { return merc.id === skill.owner; });
    var level = m.skillLevels[id], cost = DATA.skillBookCost(level);
    if (!m.unlocked || level >= skill.maxLevel || s.skillBooks[m.id] < cost) return false;
    s.skillBooks[m.id] -= cost; m.skillLevels[id]++;
    var unit = s.battle.units.find(function (u) { return u.id === m.id; });
    if (unit) unit.skillLevels[id] = m.skillLevels[id];
    host.changed(); return true;
  }
  function setDifficulty(mode) {
    var s = host.state();
    if (s.pendingReport || !["normal", "chaos"].includes(mode) || (mode === "chaos" && !s.clearedStages.includes(29))) return false;
    if (s.difficulty === mode) return true;
    s[s.difficulty + "Stage"] = s.currentStage;
    s.difficulty = mode; s.currentStage = s[mode + "Stage"];
    host.beginStage(); host.changed(); return true;
  }
  function validate(s) {
    function natural(n) { return Number.isSafeInteger(n) && n >= 0; }
    function finite(n) { return Number.isFinite(n) && n >= 0 && n <= 1e12; }
    function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
    function stage(n) { return natural(n) && n < 30; }
    function stats(t) {
      return t && finite(t.goldPerSec) && finite(t.killsPerSec) && natural(t.elapsedMs) && Array.isArray(t.samples) &&
        t.samples.every(function (v) { return natural(v.at) && v.at <= t.elapsedMs && natural(v.gold); });
    }
    if (!["normal", "chaos"].includes(s.difficulty) || (s.difficulty === "chaos" && !s.clearedStages.includes(29)) ||
      !stage(s.normalStage) || !stage(s.chaosStage) || !Array.isArray(s.chaosUnlockedStages) || !s.chaosUnlockedStages.includes(0) ||
      !s.chaosUnlockedStages.every(stage) || !Array.isArray(s.chaosClearedStages) || !s.chaosClearedStages.every(stage) ||
      !s.unlockedStages.includes(s.normalStage) || !s.chaosUnlockedStages.includes(s.chaosStage) ||
      !/^(normal|chaos):([0-9]|[12][0-9])$/.test(s.statsKey) ||
      !s.stageStats || !Object.keys(s.stageStats).every(function (key) { return /^(normal|chaos):([0-9]|[12][0-9])$/.test(key) && stats(s.stageStats[key]); }) ||
      !s.skillBooks || !DATA.mercenaries.every(function (m) { return natural(s.skillBooks[m.id]); })) return false;
    function skills(owner, slots, levels) {
      var defs = DATA.skills.filter(function (d) { return d.owner === owner; });
      return Array.isArray(slots) && slots.length <= 3 && new Set(slots).size === slots.length &&
        slots.every(function (id) { return defs.some(function (d) { return d.id === id; }); }) && object(levels) &&
        Object.keys(levels).length === 4 && defs.every(function (d) { return natural(levels[d.id]) && levels[d.id] >= 1 && levels[d.id] <= d.maxLevel; });
    }
    if (!s.mercenaries.every(function (m) { return skills(m.id, m.skills, m.skillLevels); })) return false;
    var sim = s.battle;
    if (!sim || sim.difficulty !== s.difficulty || typeof sim.resurrected !== "boolean") return false;
    if (!sim.units.every(function (u) {
      // Bare Battle.start fixtures may omit skill configuration; production units always carry it.
      return (u.skills.every(function (id) { return id === null; }) || skills(u.id, u.skills, u.skillLevels)) && object(u.effects) && object(u.skillCooldowns) &&
        (u.invincibleOnHit === undefined || typeof u.invincibleOnHit === "boolean") &&
        Object.keys(u.skillCooldowns).every(function (id) { return DATA.skills.some(function (d) { return d.id === id && d.owner === u.id; }) && finite(u.skillCooldowns[id]) && u.skillCooldowns[id] <= 45; });
    })) return false;
    if (!sim.units.concat(sim.enemies).every(function (u) {
      return (u.effects === undefined || object(u.effects)) && Object.keys(u.effects || {}).every(function (id) {
        var e = u.effects[id];
        return ["taunt", "guard", "regen", "dodge", "shield", "invincible", "poison"].includes(id) && e && finite(e.remaining) && e.remaining <= 60 &&
          (["taunt", "invincible"].includes(id) ? e.power === undefined || finite(e.power) : finite(e.power)) &&
          (!["regen", "poison"].includes(id) || (Number.isFinite(e.pulse) && e.pulse > -0.000001 && e.pulse < 1)) &&
          (id !== "poison" || (DATA.mercenaries.some(function (m) { return m.id === e.source; }) && finite(e.power)));
      });
    })) return false;
    var r = s.pendingReport;
    if (r === null) return true;
    if (!r || !natural(r.elapsedMs) || r.elapsedMs < DATA.offline.thresholdMs || r.elapsedMs > DATA.offline.maxMs ||
      !natural(r.gold) || !finite(r.kills) || !natural(r.xp) || !stage(r.stageIndex) || r.stageIndex !== s.currentStage ||
      r.difficulty !== s.difficulty || !Array.isArray(r.items) || r.items.length > DATA.offline.maxRolls + 3) return false;
    var seen = new Set(s.inventory.map(function (i) { return i.uid; })), books = new Set();
    return r.items.every(function (item) {
      if (!item) return false;
      if (item.kind === "skillBook") {
        if (books.has(item.owner) || !DATA.mercenaries.some(function (m) { return m.id === item.owner; }) || !natural(item.count) || item.count < 1) return false;
        books.add(item.owner); return true;
      }
      if (seen.has(item.uid) || item.equippedBy !== null || item.locked) return false;
      seen.add(item.uid);
      var check = { inventory: [item], nextItemUid: s.nextItemUid, overflow: 0,
        mercenaries: s.mercenaries.map(function (m) { return { id: m.id, unlocked: m.unlocked, equipment: { weapon: null, hat: null, gloves: null, shoes: null } }; }) };
      return host.equipment().validate(check);
    });
  }
  return { migrate: migrate, validate: validate, report: report, bookDrop: bookDrop,
    api: { harvest: harvest, toggleSkill: toggleSkill, levelSkill: levelSkill, setDifficulty: setDifficulty,
      exportSave: function () { return Game.save(); },
      importSave: function (json) { if (typeof json !== "string" || !Game.load(json)) return false; host.save(); return true; } } };
});
