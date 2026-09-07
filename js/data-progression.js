"use strict";
// DECISION: The seven accessory potentials reuse v0.1 percentage ranges; catch replaces equipment drop chance.
DATA.accessoryPool = DATA.potentialPool.filter(function (p) { return p.id !== "critDamage"; }).concat([
  { id: "goldPct", name: "골드 획득", ranges: [[.03,.08],[.05,.12],[.08,.2],[.12,.3]], weights: [10,10,8,8] },
  { id: "catchPct", name: "포획 확률", ranges: [[.01,.03],[.02,.05],[.03,.08],[.05,.12]], weights: [5,4,5,5] }
]);
