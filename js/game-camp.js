"use strict";
Game.registerCamp(function (host) {
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function level(id, s) { return (s || host.state()).camp.levels[id]; }
  function slots(id, s) { return id === "garden" ? DATA.camp.productionSlots[level(id,s)-1] : 1; }
  function effects(s) {
    s = s || host.state(); var ls = s.camp.levels;
    return { rosterCap:DATA.camp.rosterCaps[ls.pen-1], offlineMaxMs:DATA.camp.offlineHours[ls.storehouse-1]*3600000,
      partyBonus:(ls.campfire>=3?1:0)+(ls.campfire>=5?1:0), enhanceDiscount:ls.workshop*DATA.camp.enhanceDiscount,
      evolutionBump:DATA.evolution.bumpRate+ls.altar*DATA.camp.evolutionBonus, catchMultiplier:1+ls.altar*DATA.camp.catchBonus };
  }
  function buildCost(id) {
    if (!Object.hasOwn(DATA.camp.facilities,id) || level(id)>=DATA.camp.maxLevel) return null;
    return copy(DATA.camp.facilities[id].costs[level(id)-1]);
  }
  function canBuild(id) {
    var s=host.state(), cost=buildCost(id);
    return !!cost && !s.pendingReport && (id==="campfire" || level(id)<level("campfire")) &&
      Object.keys(cost).every(function(k){return (k==="gold"?s.gold:s.materials[k])>=cost[k];});
  }
  function build(id) {
    if (!canBuild(id)) return false;
    var s=host.state(), cost=buildCost(id);
    Object.keys(cost).forEach(function(k){if(k==="gold")s.gold-=cost[k];else s.materials[k]-=cost[k];});
    s.camp.levels[id]++; host.changed(); return true;
  }
  function available(m,s) {
    s=s||host.state();
    // DECISION: Wait for a removed party member's battle snapshot to leave too; no simultaneous work/combat.
    return m.party===null && m.camp===null && !s.battle.units.some(function(u){return u.id===m.uid;});
  }
  function assign(uid,id) {
    var s=host.state(), m=s.roster.find(function(m){return m.uid===uid;});
    if(s.pendingReport || !m || !Object.hasOwn(DATA.camp.facilities,id) || !available(m,s) ||
      s.roster.filter(function(m){return m.camp===id;}).length>=slots(id))return false;
    m.camp=id; host.changed(); return true;
  }
  function unassign(uid) {
    var s=host.state(),m=s.roster.find(function(m){return m.uid===uid;});
    if(s.pendingReport || !m || m.camp===null)return false;
    m.camp=null; host.changed(); return true;
  }
  function job(m,id) {
    var def=DATA.camp.facilities[id], work=DATA.species[m.speciesId].campJob;
    var resource=id==="garden" && ["광산","돌 나르기"].includes(work)?"stone":def.resource;
    var match=def.jobs.includes(work);
    // DECISION: Rate = base × facility level × (1 + .1 × (monster level-1)) × job match (2 or 1).
    return {resource:resource,match:match,rateTenths:DATA.camp.baseRates[resource]*level(id)*(m.level+9)*(match?2:1)};
  }
  function rates() {
    var result={wood:0,stone:0,enhanceStone:DATA.camp.workshopPassive*level("workshop")*10,gold:0};
    host.state().roster.filter(function(m){return m.camp!==null;}).forEach(function(m){var j=job(m,m.camp);result[j.resource]+=j.rateTenths;});
    return result;
  }
  function accrue(ms) {
    var r=rates(), p=host.state().camp.production;
    // Integer work units retain fractional production exactly across ticks, saves, collection and offline bags.
    DATA.camp.resources.forEach(function(k){p[k]+=r[k]*ms;});
  }
  function take() {
    var result={},p=host.state().camp.production;
    DATA.camp.resources.forEach(function(k){result[k]=Math.floor(p[k]/DATA.camp.denominator);p[k]%=DATA.camp.denominator;});
    return result;
  }
  function credit(output) {
    var s=host.state(); DATA.camp.resources.forEach(function(k){if(k==="gold")s.gold+=output[k];else s.materials[k]+=output[k];});
  }
  function collect() {
    if(host.state().pendingReport)return false;
    var result=take(); credit(result);
    if(Object.values(result).some(function(n){return n>0;}))host.changed();
    return result;
  }
  function drops(region,boss,weight) {
    var result={wood:0,stone:0,essence:0}; weight=weight===undefined?1:weight;
    ["wood","stone"].forEach(function(k){if(Game.rng()<DATA.camp.dropRate*weight)result[k]=DATA.camp.regionYield[region][k];});
    if(boss && (weight===1 || Game.rng()<weight))result.essence=DATA.camp.bossEssence[region];
    return result;
  }
  function drop(event) {
    var s=host.state(),d=drops(DATA.stages[s.currentStage].region,event.boss);
    Object.keys(d).forEach(function(k){s.materials[k]+=d[k];});
  }
  function enhanceCost(stage) {
    var c=DATA.enhanceCost(stage),factor=1-effects().enhanceDiscount;
    // DECISION: Discount both currencies, round up, preserving a minimum one-stone cost.
    return {gold:Math.ceil(c.gold*factor),stones:Math.ceil(c.stones*factor)};
  }
  return {accrue:accrue,take:take,credit:credit,drop:drop,drops:drops,effects:effects,slots:slots,
    api:{build:build,assign:assign,unassign:unassign,collect:collect,campEffects:effects,campSlots:slots,
      campBuildCost:buildCost,canBuild:canBuild,campJob:job,enhanceCost:enhanceCost,
      idleMonsters:function(){return copy(host.state().roster.filter(function(m){return available(m);}));},
      campRates:function(){var r=rates();Object.keys(r).forEach(function(k){r[k]/=10;});return r;},
      campAccrued:function(){var p=host.state().camp.production,r={};DATA.camp.resources.forEach(function(k){r[k]=p[k]/DATA.camp.denominator;});return r;}}};
});
