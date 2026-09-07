"use strict";
Game.registerValidation(function (host) {
  function natural(n) { return Number.isSafeInteger(n) && n >= 0 && n <= 1e12; }
  function finite(n) { return Number.isFinite(n) && n >= 0 && n <= 1e12; }
  function stage(n) { return Number.isInteger(n) && n >= 0 && n < DATA.stages.length; }
  function unique(a) { return new Set(a).size === a.length; }
  function stats(s) {
    return s && finite(s.goldPerSec) && finite(s.killsPerSec) && natural(s.elapsedMs) && Array.isArray(s.samples) &&
      s.samples.length <= 5000 && s.samples.every(function (v) { return v && natural(v.at) && v.at <= s.elapsedMs && natural(v.gold); });
  }
  function effects(es) {
    return es && typeof es === "object" && !Array.isArray(es) && Object.keys(es).every(function (id) {
      var e = es[id];
      return ["cheer", "shield", "poison"].includes(id) && e && finite(e.remaining) && e.remaining <= 5 && finite(e.power) &&
        (id !== "poison" || (finite(e.pulse) && e.pulse < 1.000001 && typeof e.source === "string"));
    });
  }
  function accessory(a) {
    if (!a || !/^accessory-[1-9]\d*$/.test(a.uid) || !Number.isSafeInteger(Number(a.uid.slice(10))) ||
      !DATA.rarityOrder.includes(a.rarity) || typeof a.locked !== "boolean" || !Array.isArray(a.potentials)) return false;
    var rank = DATA.rarityOrder.indexOf(a.rarity);
    return a.potentials.length === DATA.accessory.lines[rank] && a.potentials.every(function (p) {
      var def = DATA.accessoryPool.find(function (d) { return d.id === p.id; });
      return def && finite(p.value) && p.value >= def.ranges[rank][0] && p.value <= def.ranges[rank][1];
    });
  }
  function validate(s) {
    if (!s || s.schemaVersion !== 6 || !natural(s.gold) || !natural(s.coins) || !s.materials || !Object.keys(DATA.camp.materials).every(function(k){return natural(s.materials[k]);}) ||
      !natural(s.nextAccessoryUid) || s.nextAccessoryUid < 1 || !Array.isArray(s.accessories) || s.accessories.length > DATA.accessory.cap ||
      !s.accessories.every(accessory) || !natural(s.tamerXP) || !natural(s.rngSeed) || s.rngSeed > 4294967295 ||
      !stage(s.currentStage) || !["repeat", "challenge"].includes(s.mode) || !natural(s.nextMonsterUid) || s.nextMonsterUid < 3 ||
      !natural(s.transitionTicks) || s.transitionTicks > DATA.resultTicks) return false;
    if (!Array.isArray(s.unlockedStages) || !unique(s.unlockedStages) || !s.unlockedStages.includes(0) ||
      !s.unlockedStages.includes(s.currentStage) || !s.unlockedStages.every(stage) || !Array.isArray(s.clearedStages) ||
      !unique(s.clearedStages) || !s.clearedStages.every(function (i) { return stage(i) && s.unlockedStages.includes(i); })) return false;
    if (!s.camp || !s.camp.levels || !s.camp.production || Object.keys(s.camp.levels).length !== 6 ||
      !Object.keys(DATA.camp.facilities).every(function(id){var l=s.camp.levels[id];return Number.isInteger(l) && l>=1 && l<=5 && l<=s.camp.levels.campfire;}) ||
      !DATA.camp.resources.every(function(k){return Number.isSafeInteger(s.camp.production[k]) && s.camp.production[k]>=0;}))return false;
    var caps=host.camp().effects(s);
    if (!Array.isArray(s.roster) || !s.roster.length || s.roster.length > caps.rosterCap || !s.roster.every(host.monsters().validateMonster) ||
      !unique(s.roster.map(function (m) { return m.uid; }))) return false;
    if (!Object.keys(DATA.camp.facilities).every(function(id){return s.roster.filter(function(m){return m.camp===id;}).length<=host.camp().slots(id,s);}))return false;
    var party = s.roster.filter(function (m) { return m.party !== null; }), slots = Game.partySlots(Game.getRank(s.tamerXP),s);
    if (!party.length || party.length > slots || !unique(party.map(function (m) { return m.party; })) ||
      party.some(function (m) { return m.party >= slots; })) return false;
    if (!s.dex || Object.keys(s.dex).length !== 18 || !Object.keys(DATA.species).every(function (id) {
      var e = s.dex[id]; return e && typeof e.seen === "boolean" && typeof e.caught === "boolean" && (!e.caught || e.seen);
    }) || !s.roster.every(function (m) { return s.dex[m.speciesId].caught; })) return false;
    var all = s.roster.slice(), report = s.pendingReport;
    var items = s.accessories.slice(), equipped = s.roster.filter(function (m) { return m.accessory !== null; }).map(function (m) { return m.accessory; });
    if (!unique(equipped) || !equipped.every(function (uid) { return items.some(function (a) { return a.uid === uid; }); })) return false;
    if (report !== null) {
      if (!report || !natural(report.elapsedMs) || report.elapsedMs > caps.offlineMaxMs || !natural(report.gold) || !natural(report.xp) ||
        !report.materials || !Object.keys(DATA.camp.materials).every(function(k){return natural(report.materials[k]);}) ||
        !report.campOutput || !DATA.camp.resources.every(function(k){return natural(report.campOutput[k]);}) ||
        !Array.isArray(report.accessories) || report.accessories.length > 1000000 ||
        !report.accessories.every(function (a) { return accessory(a) && !a.locked; }) ||
        report.stageIndex !== s.currentStage || !Array.isArray(report.monsters) || report.monsters.length + all.length > caps.rosterCap ||
        !report.monsters.every(function (m) { return host.monsters().validateMonster(m) && m.party === null && m.camp === null && m.accessory === null && !m.locked; })) return false;
      all = all.concat(report.monsters);
      items = items.concat(report.accessories);
    }
    if (!unique(items.map(function (a) { return a.uid; })) || items.some(function (a) { return Number(a.uid.slice(10)) >= s.nextAccessoryUid; })) return false;
    if (!unique(all.map(function (m) { return m.uid; })) || all.some(function (m) { return Number(m.uid.slice(8)) >= s.nextMonsterUid; })) return false;
    if (!stats(s.stats) || s.statsKey !== s.currentStage || !s.stageStats || Array.isArray(s.stageStats) ||
      !Object.keys(s.stageStats).every(function (key) { return stage(Number(key)) && stats(s.stageStats[key]); })) return false;
    var sim = s.battle;
    if (!sim || sim.stageIndex !== s.currentStage || !natural(sim.ticks) || sim.ticks > 600 || !natural(sim.waveIndex) || sim.waveIndex > 2 ||
      !["fighting", "clear", "fail"].includes(sim.status)) return false;
    var t = sim.tamer;
    if (!t || !finite(t.captureCooldown) || t.captureCooldown > DATA.capture.cooldown || ![1, 1.5].includes(t.captureBoost) || !t.cooldowns ||
      !DATA.tamerSkills.every(function (skill) { return finite(t.cooldowns[skill.id]) && t.cooldowns[skill.id] <= skill.cooldown; })) return false;
    function unit(u, side, index) {
      if (!u || !Object.hasOwn(DATA.species, u.speciesId) || u.side !== side || u.role !== DATA.species[u.speciesId].role ||
        !natural(u.position) || !finite(u.hp) || !finite(u.maxHp) || u.maxHp <= 0 || u.hp > u.maxHp || !finite(u.atk) ||
        !finite(u.def) || !finite(u.attackSpeed) || u.attackSpeed <= 0 || !finite(u.critChance) || u.critChance > 1 ||
        !finite(u.critDamage) || !Number.isFinite(u.cooldown) || u.cooldown < -60 || u.cooldown > 10 ||
        !finite(u.skillCooldown) || u.skillCooldown > DATA.species[u.speciesId].skill.cooldown || !effects(u.effects)) return false;
      if (side === "party") return u.position < slots && s.roster.some(function (m) { return m.uid === u.id && m.speciesId === u.speciesId && m.camp === null; });
      return u.position === index && u.id === "enemy-" + sim.waveIndex + "-" + index &&
        u.speciesId === DATA.stages[sim.stageIndex].waves[sim.waveIndex][index] && typeof u.captured === "boolean" &&
        u.boss === (DATA.stages[sim.stageIndex].boss && sim.waveIndex === 2) && (!u.captured || (!u.boss && u.hp === 0));
    }
    var validUnits = Array.isArray(sim.units) && sim.units.length >= 1 && sim.units.length <= slots &&
      unique(sim.units.map(function (u) { return u.id; })) && unique(sim.units.map(function (u) { return u.position; })) &&
      sim.units.every(function (u, i) { return unit(u, "party", i); }) && Array.isArray(sim.enemies) &&
      sim.enemies.length === DATA.stages[s.currentStage].waves[sim.waveIndex].length &&
      sim.enemies.every(function (u, i) { return unit(u, "enemy", i) && s.dex[u.speciesId].seen; });
    if (!validUnits) return false;
    if (sim.status === "clear") return sim.waveIndex === 2 && sim.enemies.every(function (u) { return u.hp === 0; }) &&
      s.clearedStages.includes(s.currentStage) && (s.currentStage === 29 || s.unlockedStages.includes(s.currentStage + 1));
    if (sim.status === "fail") return sim.ticks === 600 || sim.units.every(function (u) { return u.hp === 0; });
    return sim.ticks < 600 && sim.units.some(function (u) { return u.hp > 0; }) && sim.enemies.some(function (u) { return u.hp > 0; });
  }
  return validate;
});
