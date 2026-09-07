"use strict";

module.exports = function ({ context, assert }) {
  for (const seed of [271828, 7919, 42]) {
    const c = context(); c.Game.reset(seed);
    c.Game.toggleSkill("warrior", "taunt"); c.Game.toggleSkill("warrior", "regen");
    let cleared = false, ticks = 0, fusions = 0, sessions = 1, fails = 0, farmUntil = 0, frontier = 0;
    c.Game.on("stageFail", () => { fails++; });
    c.Game.on("stageClear", e => { if (e.stageIndex === 29) cleared = true; });
    function manage() {
      const s = c.Game.getState();
      // Approximate improvements using flat stat CP plus weighted potentials, with no free gear or XP.
      function score(item, merc) {
        if (!item) return 0;
        const base = c.DATA.mercenaryStats(merc.id, merc.level);
        let total = Object.entries(item.base).reduce((n, [key, value]) => n + value * (c.DATA.cpWeights[key] || 0), 0);
        for (const p of item.potentials) {
          const key = p.id.endsWith("Pct") ? p.id.slice(0, -3) : p.id;
          total += p.value * (c.DATA.cpWeights[key] || 0) * (p.id.endsWith("Pct") ? base[key] || 0 : 1);
        }
        return total;
      }
      for (const merc of s.mercenaries.filter(m => m.unlocked)) {
        for (const slot of c.DATA.equipmentSlots) {
          const inventory = c.Game.getState().inventory;
          const candidates = inventory.filter(i => i.slot === slot.id && (!i.equippedBy || i.equippedBy === merc.id));
          candidates.sort((a, b) => score(b, merc) - score(a, merc));
          if (candidates[0] && candidates[0].equippedBy !== merc.id) c.Game.equip(candidates[0].uid, merc.id);
        }
        const skills = c.DATA.skills.filter(d => d.owner === merc.id && merc.skills.includes(d.id));
        skills.sort((a, b) => merc.skillLevels[a.id] - merc.skillLevels[b.id]);
        skills.forEach(skill => c.Game.levelSkill(skill.id));
      }
      fusions += c.Game.autoFuse().length;
    }
    // Every 10 seconds: equip, fuse spare items and spend books. Every hour: save/load a session.
    for (; ticks < 6 * 36000 && !cleared; ticks++) {
      c.Game.step();
      if (ticks % 100 === 0) {
        manage();
        const state = c.Game.getState();
        if (farmUntil && ticks >= farmUntil) {
          c.Game.setMode("challenge"); c.Game.selectStage(frontier); farmUntil = 0; fails = 0;
        } else if (!farmUntil && fails >= 2 && state.currentStage > 0) {
          frontier = state.currentStage;
          c.Game.setMode("repeat"); c.Game.selectStage(Math.max(0, frontier - 3)); farmUntil = ticks + 6000; fails = 0;
        }
      }
      if (ticks && ticks % 36000 === 0) { c.Game.save(); assert.equal(c.Game.load(), true); sessions++; }
    }
    const s = c.Game.getState();
    console.log(`     Seed ${seed}: ${(ticks / 36000).toFixed(2)}h, stage ${s.currentStage + 1}, levels ${s.mercenaries.map(m => m.level)}, ${fusions} fusions, ${sessions} sessions`);
    assert.ok(cleared, `seed ${seed}: 3-10 did not clear within six hours`);
    assert.ok(fusions > 0);
    assert.ok(s.mercenaries.some(m => Object.values(m.skillLevels).some(level => level > 1)));
  }
};
