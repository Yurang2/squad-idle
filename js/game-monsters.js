"use strict";
Game.registerMonsters(function (host) {
  var offline = false;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function find(uid) { return host.state().roster.find(function (m) { return m.uid === uid; }); }
  function weighted(weights) {
    var draw = Game.rng() * weights.reduce(function (sum, n) { return sum + n; }, 0);
    for (var i = 0; i < weights.length; i++) { draw -= weights[i]; if (draw < 0) return i; }
    return weights.length - 1;
  }
  function potentials(rarity) {
    var rank = DATA.rarityOrder.indexOf(rarity), result = [];
    // DECISION: Preserve independent weighted trait lines; duplicate percentages add before multiplication.
    for (var i = 0; i < DATA.rarities[rarity].lines; i++) {
      var option = DATA.potentialPool[weighted(DATA.potentialPool.map(function (p) { return p.weights[rank]; }))];
      var range = option.ranges[rank];
      result.push({ id: option.id, value: Math.round((range[0] + Game.rng() * (range[1] - range[0])) * 10000) / 10000 });
    }
    return result;
  }
  function rollMonster(speciesId, rarity) {
    if (!Object.hasOwn(DATA.species, speciesId) || (rarity !== undefined && !DATA.rarityOrder.includes(rarity))) return null;
    rarity = rarity || DATA.rarityOrder[weighted(DATA.rarityWeights)];
    return { uid: "monster-" + host.state().nextMonsterUid++, speciesId: speciesId, rarity: rarity, level: 1, xp: 0,
      traits: potentials(rarity), enhance: 0, evo: 1, party: null, camp: null };
  }
  function getRank(xp) {
    xp = xp === undefined ? host.state().tamerXP : xp;
    return DATA.rankXP.filter(function (n) { return n <= xp; }).length;
  }
  function partySlots(rank) {
    rank = rank === undefined ? getRank() : rank;
    return DATA.partyRanks.filter(function (n) { return n <= rank; }).length;
  }
  function canCapture() { return host.state().roster.length < DATA.rosterCap && !host.state().pendingReport; }
  function receive(monster) {
    var s = host.state();
    if (!monster || !validateMonster(monster) || s.roster.length >= DATA.rosterCap || find(monster.uid)) return false;
    var m = copy(monster); m.party = null; s.roster.push(m);
    s.nextMonsterUid = Math.max(s.nextMonsterUid, Number(m.uid.slice(8)) + 1);
    s.dex[m.speciesId] = { seen: true, caught: true };
    return copy(m);
  }
  function stats(monster) {
    var m = typeof monster === "string" ? find(monster) : monster;
    if (!m || !DATA.species[m.speciesId]) return null;
    var species = DATA.species[m.speciesId], result = Object.assign({}, species.baseStats), sums = {};
    var scale = (1 + species.growth) ** (m.level - 1) * DATA.rarities[m.rarity].multiplier;
    ["hp", "atk", "def"].forEach(function (key) { result[key] = Math.round(result[key] * scale); });
    m.traits.forEach(function (p) { sums[p.id] = (sums[p.id] || 0) + p.value; });
    ["hp", "atk", "def", "attackSpeed"].forEach(function (key) { result[key] *= 1 + (sums[key + "Pct"] || 0); });
    result.critChance = Math.min(1, result.critChance + (sums.critChance || 0)); result.critDamage += sums.critDamage || 0;
    return result;
  }
  function grantXP(amount) {
    var s = host.state(), oldRank = getRank(); s.tamerXP += amount;
    // DECISION: All assigned monsters earn full XP, including fallen allies; new stats apply next attempt.
    s.roster.filter(function (m) { return m.party !== null; }).forEach(function (m) {
      var before = m.level; m.xp += amount;
      while (m.level < DATA.maxLevel && m.xp >= DATA.xpToNext(m.level)) { m.xp -= DATA.xpToNext(m.level); m.level++; }
      if (m.level === DATA.maxLevel) m.xp = 0;
      if (before !== m.level) host.emit("levelUp", { id: m.uid, speciesId: m.speciesId, level: m.level });
    });
    if (getRank() !== oldRank) host.emit("rankUp", { rank: getRank(), slots: partySlots() });
  }
  function toggleParty(uid) {
    var s = host.state(), m = find(uid), party = s.roster.filter(function (u) { return u.party !== null; });
    if (!m || s.pendingReport) return false;
    if (m.party !== null) {
      if (party.length === 1) return false;
      m.party = null;
    } else {
      var slot = Array.from({ length: partySlots() }, function (_, i) { return i; }).find(function (i) { return !party.some(function (u) { return u.party === i; }); });
      if (slot === undefined) return false;
      m.party = slot;
    }
    // DECISION: Formation changes take effect on the next attempt, avoiding free healing/revival mid-battle.
    host.changed(); return true;
  }
  function getDex() {
    var s = host.state();
    return Object.values(DATA.species).map(function (species) {
      var entry = s.dex[species.id];
      return { speciesId: species.id, seen: entry.seen, caught: entry.caught, silhouette: !entry.seen,
        name: entry.seen ? species.name : "미발견", art: species.art, region: species.region };
    });
  }
  function validateMonster(m) {
    if (!m || !/^monster-[1-9]\d*$/.test(m.uid) || !Number.isSafeInteger(Number(m.uid.slice(8))) || !Object.hasOwn(DATA.species, m.speciesId) ||
      !DATA.rarityOrder.includes(m.rarity) || !Number.isInteger(m.level) || m.level < 1 || m.level > DATA.maxLevel ||
      !Number.isSafeInteger(m.xp) || m.xp < 0 || m.xp >= DATA.xpToNext(m.level) || (m.level === DATA.maxLevel && m.xp !== 0) ||
      m.enhance !== 0 || m.evo !== 1 || m.camp !== null || (m.party !== null && (!Number.isInteger(m.party) || m.party < 0 || m.party > 4))) return false;
    var rank = DATA.rarityOrder.indexOf(m.rarity);
    return Array.isArray(m.traits) && m.traits.length === DATA.rarities[m.rarity].lines && m.traits.every(function (t) {
      var def = DATA.potentialPool.find(function (p) { return p.id === t.id; });
      return def && Number.isFinite(t.value) && t.value >= def.ranges[rank][0] && t.value <= def.ranges[rank][1];
    });
  }
  return { stats: stats, grantXP: grantXP, receive: receive, validateMonster: validateMonster, setOffline: function (v) { offline = v; },
    api: { rollMonster: rollMonster, monsterStats: stats, getRank: getRank, partySlots: partySlots, toggleParty: toggleParty,
      canCapture: canCapture, getDex: getDex, captureMultiplier: function () { return offline ? DATA.offline.captureRate : 1; } } };
});
