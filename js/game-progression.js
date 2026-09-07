"use strict";
Game.registerProgression(function (host) {
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function monster(uid) { return host.state().roster.find(function (m) { return m.uid === uid; }); }
  function item(uid) { return host.state().accessories.find(function (a) { return a.uid === uid; }); }
  function owner(uid) { return host.state().roster.find(function (m) { return m.accessory === uid; }); }
  function idle() { return !host.state().pendingReport; }
  function protectedMonster(m) {
    // DECISION: Also protect the current battle snapshot after a pending formation change.
    return m.locked || m.party !== null || m.accessory !== null || host.state().battle.units.some(function (u) { return u.id === m.uid; });
  }
  function evolve(uids) {
    if (!idle() || !Array.isArray(uids) || uids.length !== 3 || new Set(uids).size !== 3) return false;
    var ms = uids.map(monster);
    if (ms.some(function (m) { return !m || m.locked; }) || ms[0].evo >= DATA.evolution.max ||
      ms.some(function (m) { return m.speciesId !== ms[0].speciesId || m.evo !== ms[0].evo; })) return false;
    var rank = Math.max.apply(null, ms.map(function (m) { return DATA.rarityOrder.indexOf(m.rarity); }));
    var bump = Game.rng() < DATA.evolution.bumpRate && rank < 3;
    var result = Game.rollMonster(ms[0].speciesId, DATA.rarityOrder[rank + (bump ? 1 : 0)]);
    result.evo = ms[0].evo + 1;
    result.level = Math.max.apply(null, ms.map(function (m) { return m.level; }));
    result.enhance = Math.max.apply(null, ms.map(function (m) { return m.enhance; }));
    // DECISION: Keep the highest-level material's largest XP remainder and maximum enhancement, never sum them.
    result.xp = Math.max.apply(null, ms.filter(function (m) { return m.level === result.level; }).map(function (m) { return m.xp; }));
    // DECISION: Retain the lowest party slot and highest-level equipped material's accessory; other items stay in inventory.
    var assigned = ms.filter(function (m) { return m.party !== null; }).sort(function (a,b) { return a.party-b.party; });
    var equipped = ms.filter(function (m) { return m.accessory; }).sort(function (a,b) { return b.level-a.level; });
    result.party = assigned.length ? assigned[0].party : null;
    result.accessory = equipped.length ? equipped[0].accessory : null;
    var sim = host.state().battle, active = sim.units.filter(function (u) { return uids.includes(u.id); });
    if (active.length) {
      // Keep one existing HP/cooldown snapshot, without healing; evolved stats begin on the next attempt.
      var survivor = active.find(function (u) { return u.hp > 0; }) || active[0]; survivor.id = result.uid; survivor.evo = result.evo;
      sim.units = sim.units.filter(function (u) { return u === survivor || !uids.includes(u.id); });
      sim.units.concat(sim.enemies).forEach(function (u) { if (u.effects.poison && uids.includes(u.effects.poison.source)) u.effects.poison.source = result.uid; });
    }
    host.state().roster = host.state().roster.filter(function (m) { return !uids.includes(m.uid); });
    host.monsters().receive(result); monster(result.uid).party = result.party;
    if (active.length) host.emit("stageStart", Game.getState());
    host.changed();
    var event = { monster: result, materials: copy(ms), bumped: bump };
    host.emit("evolution", copy(event)); return copy(event);
  }
  function evolutionGroups() {
    var groups = {};
    host.state().roster.filter(function (m) { return m.evo < 3 && !m.locked; }).sort(function (a,b) {
      return a.level - b.level || Number(a.uid.slice(8)) - Number(b.uid.slice(8));
    }).forEach(function (m) { var key = m.speciesId + ":" + m.evo; (groups[key] || (groups[key] = [])).push(m); });
    return copy(groups);
  }
  function autoEvolve() {
    var results = [], groups;
    while (idle()) {
      groups = Object.values(evolutionGroups()).filter(function (g) { return g.length >= 3; }).sort(function (a,b) { return a[0].level - b[0].level; });
      if (!groups.length) break;
      var result = evolve(groups[0].slice(0,3).map(function (m) { return m.uid; }));
      if (!result) break; results.push(result);
    }
    return results;
  }
  function enhance(uid) {
    var m = monster(uid), s = host.state();
    if (!idle() || !m || m.enhance >= DATA.enhancement.max) return false;
    var cost = DATA.enhanceCost(m.enhance);
    if (s.gold < cost.gold || s.materials.enhanceStone < cost.stones) return false;
    s.gold -= cost.gold; s.materials.enhanceStone -= cost.stones; m.enhance++;
    host.changed(); return copy(m);
  }
  function release(uids) {
    if (!idle() || !Array.isArray(uids) || !uids.length || new Set(uids).size !== uids.length) return false;
    var ms = uids.map(monster);
    if (ms.some(function (m) { return !m || protectedMonster(m); })) return false;
    var gold = ms.reduce(function (sum,m) { return sum + DATA.releaseGold[DATA.rarityOrder.indexOf(m.rarity)]; },0);
    host.state().roster = host.state().roster.filter(function (m) { return !uids.includes(m.uid); });
    host.state().gold += gold; host.changed(); return { count: ms.length, gold: gold };
  }
  function releaseDuplicates() {
    if (!idle()) return false;
    var groups = {}, ids = [];
    // DECISION: Keep at least three ordinary stage-1 specimens per species, including protected ones; keep highest levels.
    host.state().roster.filter(function (m) { return m.rarity === "rare" && m.evo === 1; }).forEach(function (m) {
      (groups[m.speciesId] || (groups[m.speciesId] = [])).push(m);
    });
    Object.values(groups).forEach(function (ms) {
      var eligible = ms.filter(function (m) { return !protectedMonster(m); }).sort(function (a,b) { return a.level-b.level; });
      eligible.slice(0, Math.max(0, ms.length-3)).forEach(function (m) { ids.push(m.uid); });
    });
    return ids.length ? release(ids) : { count: 0, gold: 0 };
  }
  function toggleMonsterLock(uid) {
    var m = monster(uid); if (!idle() || !m) return false;
    m.locked = !m.locked; host.changed(); return true;
  }
  function rollAccessory(rarity) {
    if (rarity !== undefined && !DATA.rarityOrder.includes(rarity)) return null;
    rarity = rarity || DATA.rarityOrder[host.monsters().weighted(DATA.rarityWeights)];
    return { uid: "accessory-" + host.state().nextAccessoryUid++, rarity: rarity, locked: false,
      potentials: host.monsters().potentials(rarity, DATA.accessoryPool, DATA.accessory.lines[DATA.rarityOrder.indexOf(rarity)]) };
  }
  function price(a) { return DATA.accessoryGold[DATA.rarityOrder.indexOf(a.rarity)]; }
  function receive(a) {
    var s = host.state();
    // DECISION: At cap, convert only the incoming item to gold; every existing/locked/equipped item is preserved.
    if (s.accessories.length >= DATA.accessory.cap) { s.gold += price(a); host.emit("inventoryFull", { gold: price(a) }); return false; }
    s.accessories.push(copy(a)); return true;
  }
  function drop(event) {
    if (Game.rng() < DATA.enhancement.dropRate) host.state().materials.enhanceStone++;
    if (Game.rng() < (event.boss ? 1 : DATA.accessory.dropRate)) {
      var a = rollAccessory(), stored = receive(a); host.emit("itemDrop", { item: a, stored: stored });
    }
  }
  function equip(uid, monsterUid) {
    var a = item(uid), m = monster(monsterUid); if (!idle() || !a || !m) return false;
    var old = owner(uid); if (old) old.accessory = null; m.accessory = uid; host.changed(); return true;
  }
  function unequip(uid) { var m = monster(uid); if (!idle() || !m || !m.accessory) return false; m.accessory = null; host.changed(); return true; }
  function toggleLock(uid) { var a = item(uid); if (!idle() || !a) return false; a.locked = !a.locked; host.changed(); return true; }
  function sell(uids) {
    if (!idle() || !Array.isArray(uids) || !uids.length || new Set(uids).size !== uids.length) return false;
    var as = uids.map(item); if (as.some(function (a) { return !a || a.locked || owner(a.uid); })) return false;
    var gold = as.reduce(function (sum,a) { return sum + price(a); },0);
    host.state().accessories = host.state().accessories.filter(function (a) { return !uids.includes(a.uid); });
    host.state().gold += gold; host.changed(); return { gold: gold, count: as.length };
  }
  function rerollPotentials(uid) {
    var a = item(uid), s = host.state(); if (!idle() || !a || s.coins < DATA.accessory.rerollCost) return false;
    s.coins -= DATA.accessory.rerollCost;
    a.potentials = host.monsters().potentials(a.rarity, DATA.accessoryPool, DATA.accessory.lines[DATA.rarityOrder.indexOf(a.rarity)]);
    host.changed(); return copy(a);
  }
  function bonus(id) {
    return host.state().roster.filter(function (m) { return m.party !== null; }).reduce(function (sum,m) {
      var a = item(m.accessory); return sum + (a ? a.potentials.filter(function (p) { return p.id === id; }).reduce(function (n,p) { return n+p.value; },0) : 0);
    },0);
  }
  return { drop: drop, receive: receive, bonus: bonus, api: { evolve: evolve, autoEvolve: autoEvolve, evolutionGroups: evolutionGroups,
    enhance: enhance, release: release, releaseDuplicates: releaseDuplicates, toggleMonsterLock: toggleMonsterLock,
    rollAccessory: rollAccessory, equip: equip, unequip: unequip, toggleLock: toggleLock, sell: sell,
    rerollPotentials: rerollPotentials, accessoryBonus: bonus } };
});
