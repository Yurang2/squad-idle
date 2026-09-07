"use strict";

var Battle = (function () {
  function spawnWave(sim, emit) {
    var stage = DATA.stages[sim.stageIndex];
    var scale = DATA.enemyScale(sim.stageIndex);
    sim.enemies = stage.waves[sim.waveIndex].map(function (type, index) {
      var base = DATA.monsterTypes[type];
      var hp = Math.round(scale.hp * base.hp);
      return { id: "enemy-" + sim.waveIndex + "-" + index, side: "enemy", type: type,
        name: type === "boss" ? stage.bossName : base.name, position: index,
        hp: hp, maxHp: hp, atk: scale.atk * base.atk, def: scale.def * base.def,
        attackSpeed: base.attackSpeed, critChance: 0, critDamage: 1.5,
        cooldown: 1 / base.attackSpeed, skills: [] };
    });
    emit("wave", { wave: sim.waveIndex + 1, total: stage.waves.length, stageIndex: sim.stageIndex });
  }

  function start(stageIndex, squad, emit) {
    var sim = { stageIndex: stageIndex, ticks: 0, waveIndex: 0, status: "fighting", enemies: [],
      units: squad.map(function (merc) {
        var stats = merc.stats || DATA.mercenaryStats(merc.id, merc.level);
        return Object.assign({ id: merc.id, side: "mercenary", type: merc.id,
          position: DATA.mercenaries.find(function (m) { return m.id === merc.id; }).position,
          maxHp: stats.hp, cooldown: 0, skills: [null, null, null] }, stats);
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

  function attack(attacker, target, emit) {
    var crit = Game.rng() < attacker.critChance;
    // DECISION: damage = ATK × 20 / (20 + DEF), rounded, minimum 1; crit multiplies before rounding.
    var amount = Math.max(1, Math.round(attacker.atk * DATA.balance.defenseConstant /
      (DATA.balance.defenseConstant + target.def) * (crit ? attacker.critDamage : 1)));
    var damage = Math.min(target.hp, amount);
    target.hp = Math.max(0, target.hp - amount);
    emit("hit", { attackerId: attacker.id, targetId: target.id, side: attacker.side,
      amount: amount, damage: damage, crit: crit, hp: target.hp });
    if (target.hp === 0) {
      if (target.side === "enemy") emit("kill", { id: target.id, type: target.type });
      emit("unitDeath", { id: target.id, side: target.side });
    }
  }

  function tick(sim, emit) {
    if (sim.status !== "fighting") return;
    emit = emit || function () {};
    sim.ticks += 1;
    var dt = DATA.tickMs / 1000;
    // DECISION: Mercenaries resolve first on a tied tick. Dead units never retaliate.
    sim.units.concat(sim.enemies).forEach(function (unit) {
      if (unit.hp <= 0) return;
      unit.cooldown -= dt;
      var targets = unit.side === "enemy" ? sim.units : sim.enemies;
      var target = targets.find(function (other) { return other.hp > 0; });
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
