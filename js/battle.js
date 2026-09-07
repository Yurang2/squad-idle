"use strict";

var Battle = (function () {
  function spawnWave(sim, emit) {
    var stage = DATA.stages[sim.stageIndex];
    var scale = DATA.enemyScale(sim.stageIndex);
    if (sim.difficulty === "chaos") scale.atk *= DATA.chaos.atk;
    sim.enemies = stage.waves[sim.waveIndex].map(function (type, index) {
      var base = DATA.monsterTypes[type];
      var hp = Math.round(scale.hp * base.hp) * (sim.difficulty === "chaos" ? DATA.chaos.hp : 1);
      return { id: "enemy-" + sim.waveIndex + "-" + index, side: "enemy", type: type,
        name: type === "boss" ? stage.bossName : base.name, position: index,
        hp: hp, maxHp: hp, atk: scale.atk * base.atk, def: scale.def * base.def,
        attackSpeed: base.attackSpeed, critChance: 0, critDamage: 1.5,
        cooldown: 1 / base.attackSpeed, skills: [] };
    });
    emit("wave", { wave: sim.waveIndex + 1, total: stage.waves.length, stageIndex: sim.stageIndex });
  }

  function start(stageIndex, squad, emit, difficulty) {
    var sim = { stageIndex: stageIndex, difficulty: difficulty || "normal", resurrected: false,
      ticks: 0, waveIndex: 0, status: "fighting", enemies: [],
      units: squad.map(function (merc) {
        var stats = merc.stats || DATA.mercenaryStats(merc.id, merc.level);
        return Object.assign({ id: merc.id, side: "mercenary", type: merc.id,
          position: DATA.mercenaries.find(function (m) { return m.id === merc.id; }).position,
          maxHp: stats.hp, cooldown: 0, effects: {}, skillCooldowns: {},
          skillLevels: merc.skillLevels || {}, skills: (merc.skills || [null, null, null]).slice() }, stats);
      }).sort(function (a, b) { return a.position - b.position; }) };
    spawnWave(sim, emit || function () {});
    return sim;
  }

  function finish(sim, status, reason, emit) {
    sim.status = status;
    emit(status === "clear" ? "stageClear" : "stageFail", {
      stageIndex: sim.stageIndex, elapsed: sim.ticks * DATA.tickMs / 1000, reason: reason
    });
  }

  function damage(attacker, target, amount, crit, emit) {
    if (target.hp <= 0) return;
    var effects = target.effects || {};
    if (target.side === "mercenary") {
      if (effects.invincible || (effects.dodge && Game.rng() < effects.dodge.power)) amount = 0;
      else if (target.invincibleOnHit && Game.rng() < DATA.invincibleChance) {
        effects.invincible = { remaining: DATA.invincibleDuration };
        emit("skill", { id: target.id, name: "무적", skillId: "invincibleOnHit" });
        amount = 0;
      }
      if (effects.shield && amount > 0) {
        var absorbed = Math.min(amount, effects.shield.power);
        effects.shield.power -= absorbed; amount -= absorbed;
      }
    }
    var dealt = Math.min(target.hp, amount);
    target.hp = Math.max(0, target.hp - amount);
    emit("hit", { attackerId: attacker.id, targetId: target.id, side: attacker.side,
      amount: amount, damage: dealt, crit: crit, hp: target.hp });
    if (target.hp === 0) {
      if (target.side === "enemy") emit("kill", { id: target.id, type: target.type });
      emit("unitDeath", { id: target.id, side: target.side });
    }
  }
  function attack(attacker, target, emit, power, guaranteedCrit) {
    var crit = guaranteedCrit || Game.rng() < attacker.critChance;
    var defense = target.def * (1 + (target.effects && target.effects.guard ? target.effects.guard.power : 0));
    // DECISION: damage = ATK × 20 / (20 + DEF), rounded, minimum 1; crit multiplies before rounding.
    var amount = Math.max(1, Math.round(attacker.atk * (power === undefined ? 1 : power) * DATA.balance.defenseConstant /
      (DATA.balance.defenseConstant + defense) * (crit ? attacker.critDamage : 1)));
    damage(attacker, target, amount, !!crit, emit);
  }
  function heal(unit, amount, emit) {
    if (unit.hp <= 0) return;
    unit.hp = Math.min(unit.maxHp, unit.hp + amount);
    emit("heal", { id: unit.id, hp: unit.hp });
  }
  function useSkill(sim, unit, emit) {
    var target = sim.enemies.find(function (u) { return u.hp > 0; });
    if (!target) return false;
    var skill = unit.skills.map(function (id) { return DATA.skills.find(function (s) { return s.id === id; }); }).find(function (s) {
      if (!s || (unit.skillCooldowns[s.id] || 0) > 0.000001) return false;
      if (s.effect.type === "resurrect") return !sim.resurrected && sim.units.some(function (u) { return u.hp === 0; });
      if (s.effect.type === "heal") return sim.units.some(function (u) { return u.hp > 0 && u.hp < u.maxHp; });
      if (s.effect.type === "regen") return unit.hp < unit.maxHp;
      return true;
    });
    if (!skill) return false;
    var e = skill.effect, scale = 1 + ((unit.skillLevels[skill.id] || 1) - 1) * skill.levelScale;
    var power = (e.power || 0) * scale;
    unit.skillCooldowns[skill.id] = skill.cooldown;
    emit("skill", { id: unit.id, skillId: skill.id, name: skill.name });
    if (["taunt", "guard", "regen", "dodge", "shield"].includes(e.type)) {
      unit.effects[e.type] = { remaining: e.duration * (e.type === "taunt" ? scale : 1),
        power: e.type === "shield" || e.type === "regen" ? power * unit.maxHp : power, pulse: 0 };
    } else if (e.type === "heal") sim.units.forEach(function (u) { heal(u, u.maxHp * power, emit); });
    else if (e.type === "resurrect") {
      var ally = sim.units.find(function (u) { return u.hp === 0; });
      // DECISION: Exactly 30% HP at every level; level improves revival readiness, not HP.
      ally.hp = ally.maxHp * e.power; ally.effects = {}; sim.resurrected = true;
      unit.skillCooldowns[skill.id] = skill.cooldown / scale;
      emit("resurrect", { id: ally.id, hp: ally.hp });
    } else if (e.type === "aoe") sim.enemies.filter(function (u) { return u.hp > 0; }).forEach(function (u) { attack(unit, u, emit, power); });
    else if (e.type === "dot") {
      attack(unit, target, emit);
      target.effects = target.effects || {};
      target.effects.poison = { remaining: e.duration, power: unit.atk * power, pulse: 0, source: unit.id };
    } else {
      for (var i = 0; i < (e.hits || 1); i++) {
        target = sim.enemies.find(function (u) { return u.hp > 0; });
        if (target) attack(unit, target, emit, power, e.type === "crit");
      }
    }
    return true;
  }
  function advanceEffects(sim, unit, dt, emit) {
    Object.keys(unit.skillCooldowns || {}).forEach(function (id) { unit.skillCooldowns[id] = Math.max(0, unit.skillCooldowns[id] - dt); });
    Object.keys(unit.effects || {}).forEach(function (id) {
      var effect = unit.effects[id];
      effect.remaining -= dt;
      if (id === "regen" || id === "poison") {
        effect.pulse += dt;
        if (effect.pulse >= 0.999999) {
          effect.pulse -= 1;
          if (id === "regen") heal(unit, effect.power, emit);
          else {
            var source = sim.units.find(function (u) { return u.id === effect.source; });
            if (source) damage(source, unit, Math.max(1, Math.round(effect.power)), false, emit);
          }
        }
      }
      if (effect.remaining <= 0.000001) delete unit.effects[id];
    });
  }

  function tick(sim, emit) {
    if (sim.status !== "fighting") return;
    emit = emit || function () {};
    sim.ticks += 1;
    var dt = DATA.tickMs / 1000;
    // DECISION: Mercenaries resolve first on a tied tick. Dead units never retaliate.
    sim.units.concat(sim.enemies).forEach(function (unit) {
      advanceEffects(sim, unit, dt, emit);
      if (unit.hp <= 0) return;
      unit.cooldown -= dt;
      var targets = unit.side === "enemy" ? sim.units : sim.enemies;
      var target = targets.find(function (other) { return other.hp > 0; });
      if (unit.side === "enemy") target = targets.find(function (u) { return u.hp > 0 && u.effects && u.effects.taunt; }) || target;
      if (unit.side === "mercenary" && useSkill(sim, unit, emit)) return;
      if (target && unit.cooldown <= 0.000001) {
        attack(unit, target, emit);
        unit.cooldown += 1 / unit.attackSpeed;
      }
    });
    if (!sim.units.some(function (u) { return u.hp > 0; })) {
      finish(sim, "fail", "defeat", emit);
    } else if (!sim.enemies.some(function (u) { return u.hp > 0; })) {
      if (sim.waveIndex === DATA.stages[sim.stageIndex].waves.length - 1) finish(sim, "clear", "victory", emit);
      else if (sim.ticks * DATA.tickMs >= DATA.stages[sim.stageIndex].timeLimit * 1000) finish(sim, "fail", "timeout", emit);
      else { sim.waveIndex += 1; spawnWave(sim, emit); }
    } else if (sim.ticks * DATA.tickMs >= DATA.stages[sim.stageIndex].timeLimit * 1000) {
      finish(sim, "fail", "timeout", emit);
    }
  }

  return { start: start, tick: tick };
})();
