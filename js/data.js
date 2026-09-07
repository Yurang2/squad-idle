"use strict";

var DATA = {
  version: "0.5.0 · M1", schemaVersion: 4,
  tickMs: 100, autosaveMs: 3000, catchUpMaxMs: 60000, statsWindowMs: 300000,
  resultTicks: 15, defaultSeed: 271828, rosterCap: 20, maxLevel: 100,
  offline: { thresholdMs: 60000, maxMs: 28800000, efficiency: 0.7, captureRate: 0.5, fallbackKillsPerSec: 0.1 },
  capture: { threshold: 0.3, cooldown: 8 },
  // DECISION: Rank unlocks use cumulative battle XP, with +3% capture bonus per rank (cap +57%).
  rankXP: [0, 30, 90, 180, 300, 480, 720, 1020, 1380, 1800, 2300, 2900, 3600, 4400, 5300, 6300, 7400, 8600, 9900, 11300],
  partyRanks: [1, 1, 3, 6, 10],
  tamerSkills: [
    { id: "cheer", name: "응원", cooldown: 15, initial: 2, power: 0.15, duration: 5 },
    { id: "heal", name: "회복", cooldown: 12, initial: 6, power: 0.2 },
    { id: "captureBoost", name: "포획 강화", cooldown: 18, initial: 0, power: 1.5 }
  ],
  assets: { tamer: "concepts/character/tamer_side.png", tamerCapture: "concepts/character/tamer_capture.png", companion: "concepts/character/fox_companion.png" },
  rarityOrder: ["rare", "epic", "unique", "legendary"],
  rarityWeights: [80, 17, 2.7, 0.3],
  // DECISION: Preserve v0.1 rarity IDs/multipliers, with the design's four names and 0–3 traits.
  rarities: {
    rare: { name: "일반", multiplier: 1, lines: 0, color: "#A9C4DC" },
    epic: { name: "희귀", multiplier: 1.15, lines: 1, color: "#C9B6E4" },
    unique: { name: "영웅", multiplier: 1.35, lines: 2, color: "#F2C57A" },
    legendary: { name: "전설", multiplier: 1.6, lines: 3, color: "#B7CDA8" }
  },
  roles: { tank: "탱커", dps: "딜러", support: "서포터" },
  elements: { water: "물", wind: "바람", light: "빛", earth: "대지", ice: "얼음", fire: "불" },
  balance: { enemyHp: 42, enemyHpGrowth: 1.12, enemyAtk: 3, enemyAtkGrowth: 1.10,
    enemyDef: 1, enemyDefGrowth: 1.08, defenseConstant: 20, goldBase: 5, goldGrowth: 1.2,
    xpBase: 30, xpGrowth: 1.12, xpPerKill: 3, bossXpMultiplier: 5 },
  cpWeights: { hp: 0.2, atk: 5, def: 2, attackSpeed: 20, critChance: 100, critDamage: 10 },
  potentialPool: [
    { id: "atkPct", name: "공격력", ranges: [[0.02, 0.05], [0.04, 0.08], [0.06, 0.12], [0.08, 0.2]], weights: [25, 25, 25, 25] },
    { id: "hpPct", name: "HP", ranges: [[0.03, 0.06], [0.05, 0.1], [0.08, 0.15], [0.1, 0.25]], weights: [25, 25, 20, 20] },
    { id: "defPct", name: "방어력", ranges: [[0.03, 0.06], [0.05, 0.1], [0.08, 0.15], [0.1, 0.25]], weights: [15, 15, 15, 15] },
    { id: "attackSpeedPct", name: "공격속도", ranges: [[0.02, 0.04], [0.03, 0.07], [0.05, 0.1], [0.07, 0.15]], weights: [15, 15, 15, 15] },
    { id: "critChance", name: "치명타 확률", ranges: [[0.01, 0.03], [0.02, 0.05], [0.03, 0.08], [0.05, 0.12]], weights: [10, 10, 12, 12] },
    { id: "critDamage", name: "치명타 피해", ranges: [[0.05, 0.1], [0.08, 0.15], [0.1, 0.25], [0.15, 0.4]], weights: [10, 10, 12, 12] },
  ],
  regions: [
  {
    "id": "lake",
    "name": "안개 호수",
    "subtitle": "물안개 사이로, 새로운 인연",
    "boss": "reedheron",
    "bossName": "호수의 거대 왜가리",
    "stages": [
      "이슬 물가",
      "갈대 길",
      "잔잔한 여울",
      "물안개 숲",
      "작은 나루",
      "반딧불 언덕",
      "숨은 샘",
      "꽃잎 연못",
      "고요한 섬",
      "호수의 수호자"
    ],
    "species": [
      "mistfox",
      "lakebat",
      "dewslime",
      "reedheron",
      "pondturtle",
      "glowmoth"
    ]
  },
  {
    "id": "ridge",
    "name": "서리 능선",
    "subtitle": "옅은 서리를 밟으며",
    "boss": "ridgegoat",
    "bossName": "능선의 산양 왕",
    "stages": [
      "서리 들판",
      "눈꽃 길",
      "하얀 고개",
      "은빛 숲",
      "수정 동굴",
      "구름 쉼터",
      "바람 언덕",
      "얼음 샘",
      "능선 끝",
      "산양 왕의 길"
    ],
    "species": [
      "snowhare",
      "ridgegoat",
      "frostowl",
      "icewolf",
      "crystalbeetle",
      "cloudram"
    ]
  },
  {
    "id": "cliff",
    "name": "노을 절벽",
    "subtitle": "따뜻한 빛이 머무는 곳",
    "boss": "cliffhawk",
    "bossName": "절벽의 노을 매 군주",
    "stages": [
      "복숭아빛 길",
      "모래 여울",
      "붉은 풀밭",
      "바위 정원",
      "노을 굴",
      "깃털 언덕",
      "빛의 틈",
      "바람 다리",
      "높은 둥지",
      "노을의 군주"
    ],
    "species": [
      "emberlizard",
      "cliffhawk",
      "sandpangolin",
      "duskcat",
      "rockcrab",
      "windserpent"
    ]
  }
],
  species: {}, stages: [],
  enemyScale: function (index) {
    var b = DATA.balance;
    return { hp: b.enemyHp * b.enemyHpGrowth ** index, atk: b.enemyAtk * b.enemyAtkGrowth ** index, def: b.enemyDef * b.enemyDefGrowth ** index };
  },
  goldPerKill: function (index) { return Math.round(DATA.balance.goldBase * DATA.balance.goldGrowth ** index); },
  xpToNext: function (level) { return Math.ceil(DATA.balance.xpBase * DATA.balance.xpGrowth ** level); },
  rankBonus: function (rank) { return 1 + 0.03 * (Math.min(20, Math.max(1, rank)) - 1); }
};

// DECISION: Rotate deterministic regional species through the existing 2/3/3 waves; bosses are uncapturable scaled species.
DATA.regions.forEach(function (region, r) {
  region.stages.forEach(function (name, i) {
    var ids = region.species, pick = function (n) { return ids[(i + n) % ids.length]; };
    DATA.stages.push({ index: r * 10 + i, id: (r + 1) + "-" + (i + 1), region: r, name: name,
      boss: i === 9, bossName: region.bossName, timeLimit: 60,
      waves: [[pick(0), pick(1)], [pick(2), pick(3), pick(4)], i === 9 ? [region.boss] : [pick(5), pick(0), pick(2)]] });
  });
});
