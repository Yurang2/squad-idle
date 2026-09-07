"use strict";
(function () {
  // DECISION: M3's explicit 40-start capacity supersedes §5's old 20-start draft.
  // All six stations start at Lv1; build upgrades instantly, gated by the campfire.
  DATA.camp = {
    maxLevel: 5, denominator: 36000000,
    materials: { wood: "나무", stone: "돌", essence: "정수", enhanceStone: "강화석" },
    resources: ["wood", "stone", "enhanceStone", "gold"],
    rosterCaps: [40,60,80,100,120], offlineHours: [8,12,16,20,24], productionSlots: [2,3,4,5,6],
    enhanceDiscount: .05, evolutionBonus: .02, catchBonus: .03,
    baseRates: { wood: 6, stone: 6, enhanceStone: 2, gold: 20 }, workshopPassive: 2,
    dropRate: .08,
    // DECISION: Each material rolls at 8%; region weighting changes quantity, not chance.
    regionYield: [{wood:2,stone:1},{wood:1,stone:2},{wood:1,stone:1}], bossEssence: [1,2,3],
    facilities: {
      campfire: { name:"모닥불", art:"assets/camp/campfire.png", jobs:["불 지피기"], resource:"gold", x:50, y:43,
        costs:[{gold:200},{gold:600},{gold:1800},{gold:5000}] },
      pen: { name:"우리", art:"assets/camp/pen.png", jobs:["양털","사냥"], resource:"gold", x:13, y:43,
        costs:[{gold:100,wood:15},{gold:300,wood:40},{gold:900,wood:90},{gold:2500,wood:180}] },
      workshop: { name:"작업장", art:"assets/camp/workshop.png", jobs:["불 지피기","돌 나르기"], resource:"enhanceStone", x:30, y:5,
        costs:[{gold:150,wood:10,stone:10},{gold:450,wood:30,stone:30},{gold:1350,wood:70,stone:70},{gold:3500,wood:140,stone:140}] },
      altar: { name:"제단", art:"assets/camp/altar.png", jobs:["정찰"], resource:"gold", x:70, y:4,
        costs:[{gold:150,essence:2},{gold:450,essence:5},{gold:1350,essence:12},{gold:3500,essence:25}] },
      storehouse: { name:"창고", art:"assets/camp/storehouse.png", jobs:["돌 나르기","양털"], resource:"gold", x:89, y:43,
        costs:[{gold:100,stone:15},{gold:300,stone:40},{gold:900,stone:90},{gold:2500,stone:180}] },
      garden: { name:"텃밭·광산", art:"assets/camp/garden.png", jobs:["채집","물긷기","광산","돌 나르기"], resource:"wood", x:69, y:50,
        costs:[{gold:150},{gold:450},{gold:1350},{gold:3500}] }
    }
  };
})();
