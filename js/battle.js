"use strict";
var Battle = (function () {
  function spawnWave(sim, emit) {
    var stage = DATA.stages[sim.stageIndex], scale = DATA.enemyScale(sim.stageIndex);
    sim.enemies = stage.waves[sim.waveIndex].map(function (id, index) {
      var species = DATA.species[id], base = species.baseStats, boss = stage.boss && sim.waveIndex === 2;
      var hp = Math.round(scale.hp * base.hp / 150 * (boss ? 7 : 1));
      return { id: "enemy-" + sim.waveIndex + "-" + index, side: "enemy", speciesId: id,
        name: boss ? stage.bossName : species.name, boss: boss, role: species.role, position: index,
        hp: hp, maxHp: hp, atk: scale.atk * base.atk / 12 * (boss ? 2.5 : 1), def: scale.def * base.def / 8,
        attackSpeed: base.attackSpeed * 0.7, critChance: 0, critDamage: 1.5, cooldown: 1,
        skillCooldown: 4, effects: {}, captured: false };
    });
    emit("wave", { wave: sim.waveIndex + 1, total: stage.waves.length, stageIndex: sim.stageIndex });
  }
  function start(stageIndex, squad, emit, tamer) {
    var sim = { stageIndex: stageIndex, ticks: 0, waveIndex: 0, status: "fighting", enemies: [],
      // DECISION: Tamer cooldowns persist across stages and party changes.
      tamer: tamer || { captureCooldown: 0, captureBoost: 1, cooldowns: Object.fromEntries(DATA.tamerSkills.map(function (s) { return [s.id, s.initial]; })) },
      units: squad.map(function (m) {
        var stats = m.stats || Game.monsterStats(m);
        return Object.assign({}, stats, { id: m.uid, speciesId: m.speciesId, side: "party", role: DATA.species[m.speciesId].role,
          position: m.party, maxHp: stats.hp, cooldown: 0, skillCooldown: 3, effects: {} });
      }).sort(function (a, b) { return (a.role === "tank" ? 0 : 1) - (b.role === "tank" ? 0 : 1) || a.position - b.position; }) };
    spawnWave(sim, emit || function () {}); return sim;
  }
  function finish(sim, status, reason, emit) {
    sim.status = status;
    emit(status === "clear" ? "stageClear" : "stageFail", { stageIndex: sim.stageIndex, elapsed: sim.ticks / 10, reason: reason });
  }
  function targetOf(units) {
    return units.find(function (u) { return u.hp > 0 && u.role === "tank"; }) || units.find(function (u) { return u.hp > 0; });
  }
  function damage(attacker, target, amount, crit, emit) {
    if (target.hp <= 0) return;
    if (target.effects.shield) {
      var absorbed = Math.min(amount, target.effects.shield.power); target.effects.shield.power -= absorbed; amount -= absorbed;
    }
    var dealt = Math.min(target.hp, amount); target.hp = Math.max(0, target.hp - amount);
    emit("hit", { attackerId: attacker.id, targetId: target.id, side: attacker.side, amount: dealt, crit: crit, hp: target.hp });
    if (target.hp === 0) {
      if (target.side === "enemy") emit("kill", { id: target.id, speciesId: target.speciesId, boss: target.boss });
      emit("unitDeath", { id: target.id, side: target.side });
    }
  }
  function attack(attacker, target, emit, power) {
    var crit = Game.rng() < attacker.critChance;
    // DECISION: Reuse ATK × 20 / (20 + DEF), minimum one damage.
    var amount = Math.max(1, Math.round(attacker.atk * (power || 1) * (attacker.effects.cheer ? 1 + attacker.effects.cheer.power : 1) *
      DATA.balance.defenseConstant / (DATA.balance.defenseConstant + target.def) * (crit ? attacker.critDamage : 1)));
    damage(attacker, target, amount, crit, emit);
  }
  function heal(unit, amount, emit) {
    if (unit.hp <= 0) return;
    unit.hp = Math.min(unit.maxHp, unit.hp + amount); emit("heal", { id: unit.id, hp: unit.hp });
  }
  function useSkill(sim, unit, emit) {
    if (unit.skillCooldown > 0.000001) return false;
    var allies = unit.side === "party" ? sim.units : sim.enemies;
    var target = targetOf(unit.side === "party" ? sim.enemies : sim.units);
    if (!target) return false;
    var skill = DATA.species[unit.speciesId].skill, e = skill.effect;
    if (e.type === "heal" && !allies.some(function (u) { return u.hp > 0 && u.hp < u.maxHp; })) return false;
    unit.skillCooldown = skill.cooldown; emit("skill", { id: unit.id, name: skill.name });
    if (e.type === "heal") allies.forEach(function (u) { heal(u, u.maxHp * e.power, emit); });
    else if (e.type === "shield") unit.effects.shield = { remaining: e.duration, power: unit.maxHp * e.power };
    else if (e.type === "dot") {
      attack(unit, target, emit);
      target.effects.poison = { remaining: e.duration, power: unit.atk * e.power, pulse: 0, source: unit.id };
    } else attack(unit, target, emit, e.power);
    return true;
  }
  function advanceEffects(sim, unit, dt, emit) {
    unit.skillCooldown = Math.max(0, unit.skillCooldown - dt);
    Object.keys(unit.effects).forEach(function (id) {
      var effect = unit.effects[id]; effect.remaining -= dt;
      if (id === "poison") {
        effect.pulse += dt;
        if (effect.pulse >= 0.999999) {
          effect.pulse -= 1;
          var source = sim.units.concat(sim.enemies).find(function (u) { return u.id === effect.source; });
          if (source) damage(source, unit, Math.max(1, Math.round(effect.power)), false, emit);
        }
      }
      if (effect.remaining <= 0.000001) delete unit.effects[id];
    });
  }
  function captureProbability(speciesId, hpFraction, rank, multiplier) {
    var species = DATA.species[speciesId];
    if (!species || !Number.isFinite(hpFraction) || hpFraction <= 0 || hpFraction >= DATA.capture.threshold) return 0;
    return Math.min(1, species.catchRate * (1 - hpFraction) * DATA.rankBonus(rank) * (multiplier === undefined ? 1 : multiplier));
  }
  function attemptCapture(sim, emit) {
    if (sim.tamer.captureCooldown > 0.000001 || !Game.canCapture()) return;
    var enemy = sim.enemies.find(function (u) { return !u.boss && u.hp > 0 && u.hp / u.maxHp < DATA.capture.threshold; });
    if (!enemy) return;
    var p = captureProbability(enemy.speciesId, enemy.hp / enemy.maxHp, Game.getRank(), sim.tamer.captureBoost) * Game.captureMultiplier();
    sim.tamer.captureCooldown = DATA.capture.cooldown; sim.tamer.captureBoost = 1;
    emit("captureAttempt", { id: enemy.id, probability: p });
    if (Game.rng() < p) {
      var monster = Game.rollMonster(enemy.speciesId); enemy.hp = 0; enemy.captured = true;
      emit("capture", { id: enemy.id, monster: monster });
    } else emit("captureFail", { id: enemy.id, speciesId: enemy.speciesId });
  }
  function tamerSkills(sim, dt, emit) {
    var tamer = sim.tamer; tamer.captureCooldown = Math.max(0, tamer.captureCooldown - dt);
    DATA.tamerSkills.forEach(function (skill) {
      tamer.cooldowns[skill.id] = Math.max(0, tamer.cooldowns[skill.id] - dt);
      if (tamer.cooldowns[skill.id] > 0.000001) return;
      if (skill.id === "heal" && !sim.units.some(function (u) { return u.hp > 0 && u.hp < u.maxHp; })) return;
      if (skill.id === "captureBoost" && tamer.captureBoost > 1) return;
      tamer.cooldowns[skill.id] = skill.cooldown;
      if (skill.id === "cheer") sim.units.forEach(function (u) { u.effects.cheer = { remaining: skill.duration, power: skill.power }; });
      if (skill.id === "heal") sim.units.forEach(function (u) { heal(u, u.maxHp * skill.power, emit); });
      if (skill.id === "captureBoost") tamer.captureBoost = skill.power;
      emit("skill", { id: "tamer", name: skill.name });
    });
  }
  function tick(sim, emit) {
    if (sim.status !== "fighting") return;
    emit = emit || function () {}; sim.ticks++; var dt = DATA.tickMs / 1000;
    tamerSkills(sim, dt, emit); attemptCapture(sim, emit);
    // DECISION: Party acts first on ties; capture checks after each hit preserve short eligible windows.
    sim.units.concat(sim.enemies).forEach(function (unit) {
      advanceEffects(sim, unit, dt, emit); attemptCapture(sim, emit);
      if (unit.hp <= 0) return;
      unit.cooldown -= dt;
      var target = targetOf(unit.side === "enemy" ? sim.units : sim.enemies);
      if (!useSkill(sim, unit, emit) && target && unit.cooldown <= 0.000001) { attack(unit, target, emit); unit.cooldown += 1 / unit.attackSpeed; }
      attemptCapture(sim, emit);
    });
    if (!sim.units.some(function (u) { return u.hp > 0; })) finish(sim, "fail", "defeat", emit);
    else if (!sim.enemies.some(function (u) { return u.hp > 0; })) {
      if (sim.waveIndex === 2) finish(sim, "clear", "victory", emit);
      else if (sim.ticks >= 600) finish(sim, "fail", "timeout", emit);
      else { sim.waveIndex++; spawnWave(sim, emit); }
    } else if (sim.ticks >= 600) finish(sim, "fail", "timeout", emit);
  }
  return { start: start, tick: tick, captureProbability: captureProbability };
})();
