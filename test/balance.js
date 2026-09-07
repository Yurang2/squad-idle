"use strict";
// Deterministic 15-minute play: inspect loot and equip CP improvements every ten seconds.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const results = [];
for (const seed of [271828, ...Array.from({ length: Number(process.env.BALANCE_SEEDS || 20) - 1 }, (_, n) => (n + 1) * 7919)]) {
  const c = vm.createContext({});
  for (const file of ["data", "battle", "game", "game-equipment"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/" + file + ".js"), "utf8"), c);
  }
  if (process.env.EQUIPMENT_SCALE) c.DATA.equipmentSlots.forEach(s => {
    Object.keys(s.base).forEach(key => { s.base[key] *= Number(process.env.EQUIPMENT_SCALE); });
  });
  c.Game.reset(seed);
  const times = {};
  c.Game.on("stageClear", e => { if (times[e.stageIndex] === undefined) times[e.stageIndex] = c.Game.getState().stats.elapsedMs / 1000; });
  for (let tick = 0; tick < 9000; tick++) {
    c.Game.step();
    if (tick % 100 !== 0 || process.env.NO_EQUIP === "1") continue;
    for (const merc of c.Game.getState().mercenaries.filter(m => m.unlocked)) {
      for (const item of c.Game.getState().inventory.filter(i => !i.equippedBy)) {
        const old = c.Game.getState().mercenaries.find(m => m.id === merc.id).equipment[item.slot];
        const cp = c.Game.getCP();
        c.Game.equip(item.uid, merc.id);
        if (c.Game.getCP() <= cp) {
          c.Game.unequip(merc.id, item.slot);
          if (old) c.Game.equip(old, merc.id);
        }
      }
    }
  }
  results.push({ seed, stage6: times[5] ?? null, stage8: times[7] ?? null, stage10: times[9] ?? null,
    cleared: c.Game.getState().clearedStages.length, inventory: c.Game.getState().inventory.length });
}
console.log(JSON.stringify(results, null, 2));
for (const field of ["stage6", "stage8", "stage10"]) {
  const times = results.map(r => r[field]).filter(t => t !== null).sort((a, b) => a - b);
  console.log(field + ": " + times.length + "/" + results.length + " cleared; seconds min/median/max: " + [times[0], times[Math.floor(times.length / 2)], times.at(-1)].join("/"));
}
