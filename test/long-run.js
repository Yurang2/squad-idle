"use strict";
const assert=require('node:assert/strict');
const {runtime}=require('./runtime');
// Public actions only: no grants, edited saves, replaced RNG or stat injections.
function simulate(seed){
  const {Game:g,DATA:d}=runtime();g.reset(seed);
  let ticks=0,cleared=false,fails=0,farmUntil=0,frontier=0,evolutions=0,enhancements=0,assignments=0,sessions=1;
  const bosses={};
  g.on('stageFail',()=>fails++);
  g.on('stageClear',e=>{if(d.stages[e.stageIndex].boss && bosses[e.stageIndex]===undefined)bosses[e.stageIndex]=(ticks+1)/36000;if(e.stageIndex===29)cleared=true;});
  function cp(m){const stats=g.monsterStats(m);return Object.keys(d.cpWeights).reduce((sum,k)=>sum+stats[k]*d.cpWeights[k],0);}
  function manage(){
    g.collect();
    // Release workers before evaluating evolution/party so camp cannot trap valuable duplicates.
    g.getState().roster.filter(m=>m.camp!==null).forEach(m=>g.unassign(m.uid));
    evolutions+=g.autoEvolve().length;
    let roster=g.getState().roster;
    const best=roster.slice().sort((a,b)=>cp(b)-cp(a)||Number(a.uid.slice(8))-Number(b.uid.slice(8))).slice(0,g.partySlots());
    // Temporarily retain the last current member until a replacement is assigned.
    roster.filter(m=>m.party!==null && !best.some(b=>b.uid===m.uid)).forEach(m=>g.toggleParty(m.uid));
    best.forEach(m=>{if(g.getState().roster.find(r=>r.uid===m.uid).party===null)g.toggleParty(m.uid);});
    roster=g.getState().roster;
    roster.filter(m=>m.party!==null && !best.some(b=>b.uid===m.uid)).forEach(m=>g.toggleParty(m.uid));
    best.forEach(m=>{if(g.getState().roster.find(r=>r.uid===m.uid).party===null)g.toggleParty(m.uid);});
    ['campfire','workshop','garden','pen','altar','storehouse'].forEach(id=>{while(g.canBuild(id))g.build(id);});
    g.getState().roster.filter(m=>m.party!==null).sort((a,b)=>a.enhance-b.enhance||cp(b)-cp(a)).forEach(m=>{if(g.enhance(m.uid))enhancements++;});
    for(const id of ['garden','workshop','campfire','pen','altar','storehouse']){
      const idle=g.idleMonsters().sort((a,b)=>Number(g.campJob(b,id).match)-Number(g.campJob(a,id).match)||cp(a)-cp(b));
      idle.slice(0,g.campSlots(id)).forEach(m=>{if(g.assign(m.uid,id))assignments++;});
    }
    g.releaseDuplicates();
  }
  for(;ticks<8*36000 && !cleared;ticks++){
    g.step();
    if(ticks%100===0){
      manage();const s=g.getState();
      if(farmUntil && ticks>=farmUntil){g.setMode('challenge');g.selectStage(frontier);farmUntil=0;fails=0;}
      else if(!farmUntil && fails>=2 && s.currentStage>0){frontier=s.currentStage;g.setMode('repeat');g.selectStage(Math.max(0,frontier-3));farmUntil=ticks+6000;fails=0;}
    }
    if(ticks && ticks%36000===0){const before=g.getState();assert.ok(g.load(g.save()));assert.deepEqual(g.getState(),before);sessions++;}
  }
  const s=g.getState(),result={seed,hours:Number((ticks/36000).toFixed(4)),bosses,stage:d.stages[s.currentStage].id,
    levels:s.roster.filter(m=>m.party!==null).map(m=>m.level),evolutions,enhancements,assignments,sessions,cp:g.getCP()};
  console.log('     '+JSON.stringify(result));
  assert.ok(cleared,`seed ${seed}: 3-10 did not clear within eight hours`);
  assert.ok(evolutions>0 && enhancements>0 && assignments>0,'all monster progression systems exercised');
  return result;
}
function run(){return [271828,7919,42].map(simulate);}
module.exports=run;
if(require.main===module)run();
