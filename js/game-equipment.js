"use strict";

Game.registerEquipment(function (host) {
  var slots = DATA.equipmentSlots.map(function (s) { return s.id; });
  var rarities = DATA.rarityOrder;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function find(uid) { return host.state().inventory.find(function (item) { return item.uid === uid; }); }
  function available(item) { return item && !item.locked && item.equippedBy === null; }
  function weighted(weights) {
    var draw = Game.rng() * weights.reduce(function (sum, n) { return sum + n; }, 0);
    for (var i = 0; i < weights.length; i++) { draw -= weights[i]; if (draw < 0) return i; }
    return weights.length - 1;
  }
  function table(stageIndex) { return DATA.dropTables.find(function (t) { return stageIndex >= t.min && stageIndex <= t.max; }); }
  function potentials(rarity) {
    var rank = rarities.indexOf(rarity);
    var result = [];
    // DECISION: Independent lines may repeat; matching percentages add before multiplication.
    for (var i = 0; i < DATA.equipmentRarities[rarity].lines; i++) {
      var option = DATA.potentialPool[weighted(DATA.potentialPool.map(function (p) { return p.weights[rank]; }))];
      var range = option.ranges[rank];
      result.push({ id: option.id, value: Math.round((range[0] + Game.rng() * (range[1] - range[0])) * 10000) / 10000 });
    }
    return result;
  }
  function baseStats(slot, tier, rarity) {
    var base = DATA.equipmentSlots.find(function (s) { return s.id === slot; }).base;
    var result = {};
    Object.keys(base).forEach(function (key) {
      result[key] = Math.round(base[key] * 1.6 ** (tier - 1) * DATA.equipmentRarities[rarity].multiplier * 10000) / 10000;
    });
    return result;
  }
  function create(slot, tier, rarity) {
    return { uid: "item-" + host.state().nextItemUid++, slot: slot, tier: tier, rarity: rarity,
      base: baseStats(slot, tier, rarity), potentials: potentials(rarity), locked: false, equippedBy: null };
  }
  function rollItem(stageIndex, options) {
    var band = Number.isInteger(stageIndex) && table(stageIndex);
    var forced = options && options.forcedTier;
    if (!band || (forced !== undefined && (!Number.isInteger(forced) || forced < 1 || forced > 8))) return null;
    var tiers = Object.keys(band.tierWeights);
    var tier = forced === undefined ? Number(tiers[weighted(tiers.map(function (t) { return band.tierWeights[t]; }))]) : forced;
    return create(slots[Math.floor(Game.rng() * slots.length)], tier, rarities[weighted(band.rarityWeights)]);
  }
  function equipped(merc) { return slots.map(function (slot) { return find(merc.equipment[slot]); }).filter(Boolean); }
  function stats(merc) {
    var result = DATA.mercenaryStats(merc.id, merc.level);
    var sums = {};
    equipped(merc).forEach(function (item) {
      Object.keys(item.base).forEach(function (key) { result[key] += item.base[key]; });
      item.potentials.forEach(function (p) { sums[p.id] = (sums[p.id] || 0) + p.value; });
    });
    ["hp", "atk", "def", "attackSpeed"].forEach(function (key) { result[key] *= 1 + (sums[key + "Pct"] || 0); });
    result.critChance = Math.min(1, result.critChance + (sums.critChance || 0));
    result.critDamage += sums.critDamage || 0;
    return result;
  }
  function bonus(id) {
    // DECISION: Loot bonuses add across recruited mercenaries, including downed allies.
    return host.state().mercenaries.filter(function (m) { return m.unlocked; }).reduce(function (sum, m) {
      return sum + equipped(m).reduce(function (total, item) {
        return total + item.potentials.reduce(function (n, p) { return n + (p.id === id ? p.value : 0); }, 0);
      }, 0);
    }, 0);
  }
  function refresh(ids) {
    var state = host.state();
    ids.forEach(function (id) {
      var unit = state.battle.units.find(function (u) { return u.id === id; });
      if (!unit) return;
      var next = stats(state.mercenaries.find(function (m) { return m.id === id; }));
      // DECISION: Apply immediately, preserving HP ratio and cooldown progress; never revive.
      var hpRatio = unit.hp / unit.maxHp;
      var cooldown = unit.cooldown * unit.attackSpeed / next.attackSpeed;
      Object.assign(unit, next, { hp: next.hp * hpRatio, maxHp: next.hp, cooldown: cooldown });
    });
  }
  function drop(event, persist) {
    var state = host.state();
    var band = table(state.currentStage);
    var chance = event.type === "boss" ? band.bossChance : Math.min(1, band.chance * (1 + bonus("dropPct")));
    if (Game.rng() >= chance) return;
    var item = rollItem(state.currentStage, { forcedTier: event.type === "boss" ? band.guaranteedTier : undefined });
    var sold = null;
    if (state.inventory.length >= DATA.inventoryCap) {
      state.overflow++;
      // DECISION: Protect locked/equipped items. If no rare can make room, monetize the incoming drop.
      sold = state.inventory.concat(item).filter(function (i) { return available(i) && i.rarity === "rare"; })
        .sort(function (a, b) { return a.tier - b.tier || Number(a.uid.slice(5)) - Number(b.uid.slice(5)); })[0] || item;
      state.inventory = state.inventory.filter(function (i) { return i.uid !== sold.uid; });
      state.gold += DATA.sellPrice(sold.tier, sold.rarity);
    }
    if (sold !== item) state.inventory.push(item);
    host.emit("itemDrop", Object.assign(copy(item), { enemyId: event.id, autoSold: sold === item }));
    if (sold) host.emit("inventoryFull", { overflow: state.overflow, sold: copy(sold), incoming: copy(item),
      gold: DATA.sellPrice(sold.tier, sold.rarity), kept: sold !== item });
    if (persist) host.save();
  }
  function equip(uid, mercenaryId) {
    var item = find(uid);
    var merc = host.state().mercenaries.find(function (m) { return m.id === mercenaryId && m.unlocked; });
    if (!item || !merc) return false;
    var affected = [merc.id];
    if (item.equippedBy) {
      var previous = host.state().mercenaries.find(function (m) { return m.id === item.equippedBy; });
      previous.equipment[item.slot] = null;
      affected.push(previous.id);
    }
    var old = find(merc.equipment[item.slot]);
    if (old) old.equippedBy = null;
    merc.equipment[item.slot] = item.uid;
    item.equippedBy = merc.id;
    refresh(Array.from(new Set(affected)));
    host.changed();
    return true;
  }
  function unequip(mercenaryId, slot) {
    var merc = host.state().mercenaries.find(function (m) { return m.id === mercenaryId; });
    if (!merc || !slots.includes(slot)) return false;
    var item = find(merc.equipment[slot]);
    if (!item) return false;
    merc.equipment[slot] = null;
    item.equippedBy = null;
    refresh([merc.id]);
    host.changed();
    return true;
  }
  function fuse(uids, batch) {
    var state = host.state();
    if (!Array.isArray(uids) || uids.length !== 3 || new Set(uids).size !== 3) return null;
    var items = uids.map(find);
    if (!items.every(available)) return null;
    var first = items[0];
    if (first.tier >= 8 || !items.every(function (i) { return i.slot === first.slot && i.tier === first.tier; }) ||
      state.gold < DATA.fusionCost(first.tier)) return null;
    var rank = Math.max.apply(null, items.map(function (i) { return rarities.indexOf(i.rarity); }));
    var upgraded = Game.rng() < DATA.fuseUpgradeChance && rank < rarities.length - 1;
    var item = create(first.slot, first.tier + 1, rarities[rank + (upgraded ? 1 : 0)]);
    state.gold -= DATA.fusionCost(first.tier);
    state.inventory = state.inventory.filter(function (i) { return !uids.includes(i.uid); });
    state.inventory.push(item);
    host.emit("fuseResult", { item: copy(item), upgraded: upgraded, materialRarity: rarities[rank], batch: !!batch });
    if (!batch) host.changed();
    return copy(item);
  }
  function autoFuse() {
    var results = [];
    while (true) {
      var uids = null;
      var inventory = host.state().inventory.filter(available);
      for (var tier = 1; tier < 8 && !uids; tier++) {
        if (host.state().gold < DATA.fusionCost(tier)) break;
        for (var s = 0; s < slots.length; s++) {
          var group = inventory.filter(function (i) { return i.slot === slots[s] && i.tier === tier; });
          if (group.length >= 3) { uids = group.slice(0, 3).map(function (i) { return i.uid; }); break; }
        }
      }
      if (!uids) break;
      results.push(fuse(uids, true));
    }
    if (results.length) host.changed();
    return results;
  }
  function sell(uids) {
    if (!Array.isArray(uids) || !uids.length || new Set(uids).size !== uids.length) return false;
    var items = uids.map(find);
    // DECISION: Batch sell is atomic; one protected or missing material rejects the whole request.
    if (!items.every(available)) return false;
    var gold = items.reduce(function (sum, i) { return sum + DATA.sellPrice(i.tier, i.rarity); }, 0);
    host.state().inventory = host.state().inventory.filter(function (i) { return !uids.includes(i.uid); });
    host.state().gold += gold;
    host.changed();
    return gold;
  }
  function toggleLock(uid) {
    var item = find(uid);
    if (!item) return false;
    item.locked = !item.locked;
    host.changed();
    return item.locked;
  }
  function rerollPotentials(uid) {
    var item = find(uid);
    if (!item || host.state().squadCoins < DATA.potentialRerollCost) return null;
    var before = copy(item.potentials);
    host.state().squadCoins -= DATA.potentialRerollCost;
    item.potentials = potentials(item.rarity);
    if (item.equippedBy) refresh([item.equippedBy]);
    host.emit("potentialReroll", { item: copy(item), before: before, after: copy(item.potentials) });
    host.changed();
    return copy(item);
  }
  function validate(state) {
    if (!Array.isArray(state.inventory) || state.inventory.length > DATA.inventoryCap ||
      !Number.isSafeInteger(state.overflow) || state.overflow < 0 || !Number.isSafeInteger(state.nextItemUid) || state.nextItemUid < 1) return false;
    var seen = new Set();
    if (!state.inventory.every(function (i) {
      if (!i || !/^item-[1-9]\d*$/.test(i.uid) || seen.has(i.uid) || Number(i.uid.slice(5)) >= state.nextItemUid ||
        !slots.includes(i.slot) || !Number.isInteger(i.tier) || i.tier < 1 || i.tier > 8 || !rarities.includes(i.rarity) ||
        typeof i.locked !== "boolean" || (i.equippedBy !== null && !DATA.mercenaries.some(function (m) { return m.id === i.equippedBy; }))) return false;
      seen.add(i.uid);
      var base = baseStats(i.slot, i.tier, i.rarity);
      if (!i.base || Object.keys(i.base).length !== Object.keys(base).length || !Object.keys(base).every(function (key) { return i.base[key] === base[key]; })) return false;
      return Array.isArray(i.potentials) && i.potentials.length === DATA.equipmentRarities[i.rarity].lines && i.potentials.every(function (p) {
        var def = p && DATA.potentialPool.find(function (o) { return o.id === p.id; });
        var rank = rarities.indexOf(i.rarity);
        return def && def.weights[rank] > 0 && Number.isFinite(p.value) && p.value >= def.ranges[rank][0] && p.value <= def.ranges[rank][1];
      });
    })) return false;
    if (!state.mercenaries.every(function (m) {
      return m.equipment && Object.keys(m.equipment).length === slots.length && slots.every(function (slot) {
        var uid = m.equipment[slot];
        return uid === null || (m.unlocked && state.inventory.some(function (i) { return i.uid === uid && i.slot === slot && i.equippedBy === m.id; }));
      });
    })) return false;
    return state.inventory.every(function (i) {
      return i.equippedBy === null || state.mercenaries.some(function (m) { return m.id === i.equippedBy && m.equipment[i.slot] === i.uid; });
    });
  }
  return { stats: stats, bonus: bonus, drop: drop, validate: validate,
    api: { rollItem: rollItem, equip: equip, unequip: unequip, fuse: function (uids) { return fuse(uids, false); },
      autoFuse: autoFuse, sell: sell, toggleLock: toggleLock, rerollPotentials: rerollPotentials } };
});
