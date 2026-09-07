"use strict";

var DATA = {
  version: "0.2.0 · P2",
  schemaVersion: 2,
  tickMs: 100,
  autosaveMs: 3000,
  catchUpMaxMs: 60000,
  statsWindowMs: 300000,
  resultTicks: 15,
  defaultSeed: 271828,
  // DECISION: Unspecified base stats favor a durable, slow frontline warrior.
  mercenaries: [
    { id: "warrior", name: "전사", role: "선봉 · 탱커", unlockStage: null, position: 0,
      color: "#e4af65", base: { hp: 170, atk: 14, def: 12, attackSpeed: 0.85, critChance: 0.08, critDamage: 1.5 }, growth: 0.05 },
    { id: "archer", name: "궁수", role: "중위 · 딜러", unlockStage: 5, position: 1,
      color: "#88c8a2", base: { hp: 140, atk: 12, def: 5, attackSpeed: 1.4, critChance: 0.15, critDamage: 1.75 }, growth: 0.05 },
    { id: "mage", name: "마법사", role: "후위 · 서포터", unlockStage: 15, position: 2,
      color: "#b7a0ee", base: { hp: 115, atk: 23, def: 3, attackSpeed: 0.7, critChance: 0.1, critDamage: 1.5 }, growth: 0.05 }
  ],
  balance: { enemyHp: 20, enemyHpGrowth: 1.22, enemyAtk: 3, enemyAtkGrowth: 1.18,
    enemyDef: 1, enemyDefGrowth: 1.12, defenseConstant: 20, goldBase: 5, goldGrowth: 1.2,
    xpBase: 50, xpGrowth: 1.15, xpPerKill: 2, bossXpMultiplier: 5,
    firstClearCoins: 10, bossFirstClearCoins: 30, bossRepeatCoins: 2 },
  cpWeights: { hp: 0.2, atk: 5, def: 2, attackSpeed: 20, critChance: 100, critDamage: 10 },
  monsterTypes: {
    slime: { name: "슬라임", hp: 1, atk: 0.9, def: 1, attackSpeed: 0.65 },
    goblin: { name: "척후병", hp: 0.85, atk: 1, def: 0.8, attackSpeed: 0.8 },
    brute: { name: "파수꾼", hp: 1.4, atk: 1.25, def: 1.5, attackSpeed: 0.6 },
    boss: { name: "수호자", hp: 7, atk: 2.5, def: 2, attackSpeed: 0.75 }
  },
  regions: [
    { name: "잊힌 숲", subtitle: "안개 너머, 첫 번째 원정", palette: { slime: "#91b69b", goblin: "#9ba979", brute: "#b09b7d", boss: "#c5b88d" },
      stages: ["숲의 입구", "이끼 오솔길", "버려진 야영지", "뒤틀린 뿌리", "안개 공터", "궁수의 흔적", "가시 덤불", "오래된 제단", "수호자의 길", "고목의 심장"], bossName: "고목 수호자" },
    { name: "잿빛 협곡", subtitle: "꺼지지 않는 불씨를 따라", palette: { slime: "#c69169", goblin: "#c27b68", brute: "#a58a81", boss: "#e09a68" },
      stages: ["재의 경계", "메마른 강", "갈라진 절벽", "붉은 모래", "무너진 광산", "마법사의 봉화", "검은 용광로", "불씨의 다리", "왕의 무덤", "잿불 왕좌"], bossName: "잿불 거인" },
    { name: "서리 성채", subtitle: "마지막 성문을 향하여", palette: { slime: "#8fbdd1", goblin: "#91a2c9", brute: "#a9a3c8", boss: "#c2dded" },
      stages: ["눈 덮인 고개", "얼어붙은 호수", "침묵의 초소", "푸른 회랑", "망각의 정원", "서리 감옥", "백야의 탑", "봉인된 서고", "최후의 성문", "영원의 군주"], bossName: "서리 군주" }
  ],
  // DECISION: Fixed waves keep balance reproducible; the boss replaces the last wave.
  waves: [["slime", "goblin"], ["slime", "goblin", "slime"], ["goblin", "slime", "brute"]],
  bossWaves: [["goblin", "brute"], ["slime", "goblin", "brute"], ["boss"]],
  stages: [],
  equipmentSlots: [
    { id: "weapon", name: "무기", icon: "⚔", base: { atk: 4 } },
    { id: "hat", name: "모자", icon: "♜", base: { hp: 30 } },
    { id: "gloves", name: "장갑", icon: "✧", base: { atk: 2, critChance: 0.01 } },
    { id: "shoes", name: "신발", icon: "♧", base: { hp: 15, def: 3 } }
  ],
  equipmentTiers: [
    { tier: 1, multiplier: 1 }, { tier: 2, multiplier: 1.6 },
    { tier: 3, multiplier: 2.56 }, { tier: 4, multiplier: 4.096 },
    { tier: 5, multiplier: 6.5536 }, { tier: 6, multiplier: 10.48576 },
    { tier: 7, multiplier: 16.777216 }, { tier: 8, multiplier: 26.8435456 }
  ],
  equipmentRarities: {
    rare: { name: "레어", multiplier: 1, lines: 1, color: "#659bff" },
    epic: { name: "에픽", multiplier: 1.15, lines: 2, color: "#b789f5" },
    unique: { name: "유니크", multiplier: 1.35, lines: 3, color: "#edd26a" },
    legendary: { name: "레전더리", multiplier: 1.6, lines: 3, color: "#6cdc99" }
  },
  inventoryCap: 60,
  fuseUpgradeChance: 0.15,
  potentialRerollCost: 20,
  rarityOrder: ["rare", "epic", "unique", "legendary"],
  sellMultipliers: { rare: 1, epic: 2, unique: 4, legendary: 8 },
  // DECISION: Boss-band trash uses normal chance; only the boss guarantees the exact tier.
  dropTables: [
    { min: 0, max: 8, chance: 0.08, tierWeights: { 1: 85, 2: 15 }, rarityWeights: [80, 17, 2.7, 0.3] },
    { min: 9, max: 9, chance: 0.08, bossChance: 1, guaranteedTier: 2, tierWeights: { 2: 100 }, rarityWeights: [65, 28, 6, 1] },
    { min: 10, max: 18, chance: 0.08, tierWeights: { 2: 65, 3: 30, 4: 5 }, rarityWeights: [74, 21, 4.4, 0.6] },
    { min: 19, max: 19, chance: 0.08, bossChance: 1, guaranteedTier: 3, tierWeights: { 3: 100 }, rarityWeights: [55, 34, 9, 2] },
    { min: 20, max: 28, chance: 0.08, tierWeights: { 3: 60, 4: 32, 5: 8 }, rarityWeights: [68, 25, 6, 1] },
    { min: 29, max: 29, chance: 0.08, bossChance: 1, guaranteedTier: 4, tierWeights: { 4: 100 }, rarityWeights: [45, 39, 13, 3] }
  ],
  // P3 data placeholder only: no chaos mode is accessible in P2.
  chaosDropTable: { chance: 0.08, bossChance: 1, tierWeights: { 5: 55, 6: 30, 7: 12, 8: 3 }, rarityWeights: [40, 40, 16, 4] },
  fusionCost: function (tier) { return 100 * 2 ** (tier - 1); },
  sellPrice: function (tier, rarity) { return 20 * 2 ** (tier - 1) * DATA.sellMultipliers[rarity]; },
  // DECISION: Option values are fractions; each rarity lists [min, max] and selection weight.
  potentialPool: [
    { id: "atkPct", name: "공격력", ranges: [[0.02, 0.05], [0.04, 0.08], [0.06, 0.12], [0.08, 0.2]], weights: [25, 25, 25, 25] },
    { id: "hpPct", name: "HP", ranges: [[0.03, 0.06], [0.05, 0.1], [0.08, 0.15], [0.1, 0.25]], weights: [25, 25, 20, 20] },
    { id: "defPct", name: "방어력", ranges: [[0.03, 0.06], [0.05, 0.1], [0.08, 0.15], [0.1, 0.25]], weights: [15, 15, 15, 15] },
    { id: "attackSpeedPct", name: "공격속도", ranges: [[0.02, 0.04], [0.03, 0.07], [0.05, 0.1], [0.07, 0.15]], weights: [15, 15, 15, 15] },
    { id: "critChance", name: "치명타 확률", ranges: [[0.01, 0.03], [0.02, 0.05], [0.03, 0.08], [0.05, 0.12]], weights: [10, 10, 12, 12] },
    { id: "critDamage", name: "치명타 피해", ranges: [[0.05, 0.1], [0.08, 0.15], [0.1, 0.25], [0.15, 0.4]], weights: [10, 10, 12, 12] },
    { id: "goldPct", name: "골드 획득", ranges: [[0.03, 0.08], [0.05, 0.12], [0.08, 0.2], [0.12, 0.3]], weights: [10, 10, 8, 8] },
    { id: "dropPct", name: "드롭률", ranges: [[0.01, 0.03], [0.02, 0.05], [0.03, 0.08], [0.05, 0.12]], weights: [5, 4, 5, 5] },
    { id: "invincibleOnHit", name: "피격 시 1초 무적", duration: 1, ranges: [[0.01, 0.01], [0.01, 0.02], [0.02, 0.04], [0.03, 0.06]], weights: [0, 1, 3, 3] }
  ],
  enemyScale: function (stageIndex) {
    var b = DATA.balance;
    return { hp: b.enemyHp * b.enemyHpGrowth ** stageIndex,
      atk: b.enemyAtk * b.enemyAtkGrowth ** stageIndex,
      def: b.enemyDef * b.enemyDefGrowth ** stageIndex };
  },
  goldPerKill: function (stageIndex) { return Math.round(DATA.balance.goldBase * DATA.balance.goldGrowth ** stageIndex); },
  xpToNext: function (level) { return Math.ceil(DATA.balance.xpBase * DATA.balance.xpGrowth ** level); },
  mercenaryStats: function (id, level) {
    var merc = DATA.mercenaries.find(function (m) { return m.id === id; });
    var growth = (1 + merc.growth) ** (level - 1);
    // DECISION: HP/ATK/DEF grow 5% compounded; speed and critical stats stay at base values.
    return { hp: Math.round(merc.base.hp * growth), atk: Math.round(merc.base.atk * growth),
      def: Math.round(merc.base.def * growth), attackSpeed: merc.base.attackSpeed,
      critChance: merc.base.critChance, critDamage: merc.base.critDamage };
  }
};

DATA.regions.forEach(function (region, regionIndex) {
  region.stages.forEach(function (name, localIndex) {
    DATA.stages.push({ index: regionIndex * 10 + localIndex, id: (regionIndex + 1) + "-" + (localIndex + 1),
      name: name, region: regionIndex, palette: region.palette, boss: localIndex === 9,
      bossName: region.bossName, timeLimit: 60, waves: localIndex === 9 ? DATA.bossWaves : DATA.waves,
      firstClearCoins: localIndex === 9 ? DATA.balance.bossFirstClearCoins : DATA.balance.firstClearCoins });
  });
});
