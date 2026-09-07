"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=function({test,runtime,plain,ticks,edit,add,DATA,Game,Battle}) {
  function fund(){edit(Game,s=>{s.gold=100000;Object.keys(s.materials).forEach(k=>s.materials[k]=10000);});}
  function atLevel(n){edit(Game,s=>{Object.keys(s.camp.levels).forEach(k=>s.camp.levels[k]=n);});}
  test('M3 six instant facilities enforce costs, camp cap, levels and atomic rejection',()=>{
    Game.reset();const initial=Game.getState();
    for(const id of ['missing','__proto__','campfire','pen'])assert.equal(Game.build(id),false);
    assert.deepEqual(Game.getState(),initial);fund();
    for(let level=2;level<=5;level++) {
      for(const id of Object.keys(DATA.camp.facilities)) {
        if(id!=='campfire')assert.equal(Game.getState().camp.levels.campfire,level);
        const before=Game.getState(),cost=Game.campBuildCost(id);assert.equal(Game.build(id),true);
        const after=Game.getState();assert.equal(after.camp.levels[id],level);
        Object.keys(cost).forEach(k=>assert.equal(k==='gold'?before.gold-after.gold:before.materials[k]-after.materials[k],cost[k]));
        if(id!=='campfire' || level===5)assert.equal(Game.build(id),false,'cannot outpace campfire or max');
      }
    }
    assert.ok(Game.validateSave(Game.save()));
  });
  test('M3 all five facility levels apply caps, rank-plus-camp slots, rates and both enhance currencies',()=>{
    Game.reset();fund();
    for(let n=1;n<=5;n++) {
      atLevel(n);const e=Game.campEffects();
      assert.equal(e.rosterCap,[40,60,80,100,120][n-1]);assert.equal(e.offlineMaxMs,[8,12,16,20,24][n-1]*3600000);
      assert.equal(Game.partySlots(1),2+(n>=3?1:0)+(n>=5?1:0));assert.equal(Game.partySlots(20),5);
      assert.equal(Game.campSlots('garden'),n+1);
      assert.ok(Math.abs(e.evolutionBump-(.15+n*.02))<1e-12);
      assert.ok(Math.abs(Battle.captureProbability('lakebat',.2,1,1)-.86*.8*(1+n*.03))<1e-12);
      const base=DATA.enhanceCost(8),cost=Game.enhanceCost(8);
      assert.deepEqual(plain(cost),{gold:Math.ceil(base.gold*(1-n*.05)),stones:Math.ceil(base.stones*(1-n*.05))});
      edit(Game,s=>s.roster[0].enhance=8);const before=Game.getState();Game.enhance('monster-1');
      assert.equal(before.gold-Game.getState().gold,cost.gold);assert.equal(before.materials.enhanceStone-Game.getState().materials.enhanceStone,cost.stones);
    }
    Game.reset();fund();while(Game.getState().roster.length<40)add(Game,'mistfox');assert.equal(Game.canCapture(),false);
    Game.build('campfire');Game.build('pen');assert.equal(Game.canCapture(),true);add(Game,'lakebat');assert.equal(Game.getState().roster.length,41);
    assert.ok(Game.validateSave(Game.save()));
  });
  test('M3 assignment slot capacity and party/battle/evolution/release exclusivity',()=>{
    Game.reset();const ms=[add(Game,'mistfox'),add(Game,'pondturtle'),add(Game,'mistfox')];
    assert.equal(Game.assign('monster-1','garden'),false);assert.equal(Game.assign(ms[0].uid,'__proto__'),false);
    assert.equal(Game.assign(ms[0].uid,'garden'),true);assert.equal(Game.toggleParty(ms[0].uid),false);
    assert.equal(Game.assign(ms[0].uid,'pen'),false);assert.equal(Game.assign(ms[1].uid,'garden'),true);
    assert.equal(Game.assign(ms[2].uid,'garden'),false);assert.equal(Game.release([ms[0].uid]),false);
    assert.equal(Game.evolve([ms[0].uid,ms[2].uid,'monster-2']),false);
    assert.equal(Game.unassign(ms[0].uid),true);assert.equal(Game.unassign(ms[0].uid),false);
    Game.toggleParty('monster-2');assert.equal(Game.assign('monster-2','pen'),false);
    Game.selectStage(0);assert.equal(Game.assign('monster-2','pen'),true);assert.ok(Game.validateSave(Game.save()));
    Game.unassign('monster-2');assert.equal(Game.toggleParty('monster-2'),true);
  });
  test('M3 online integer accrual, job match, monster/facility levels, collect and save fractions',()=>{
    Game.reset();const m=add(Game,'mistfox');Game.assign(m.uid,'garden');
    assert.deepEqual(plain(Game.campRates()),{wood:12,stone:0,enhanceStone:2,gold:0});
    ticks(Game,3000);let p=Game.campAccrued();assert.equal(p.wood,1);assert.equal(p.enhanceStone,1/6);
    const before=Game.getState();assert.equal(Game.collect().wood,1);assert.equal(Game.getState().materials.wood,before.materials.wood+1);
    const once=Game.getState();assert.deepEqual(plain(Game.collect()),{wood:0,stone:0,enhanceStone:0,gold:0});assert.deepEqual(Game.getState(),once);
    const json=Game.save();Game.reset();assert.ok(Game.load(json));assert.deepEqual(Game.getState(),once);
    edit(Game,s=>{s.roster.find(u=>u.uid===m.uid).level=11;s.camp.levels.campfire=2;s.camp.levels.garden=2;});
    assert.equal(Game.campRates().wood,48);
    Game.unassign(m.uid);Game.assign(m.uid,'workshop');assert.equal(Game.campRates().enhanceStone,6);
    Game.unassign(m.uid);Game.assign(m.uid,'pen');assert.equal(Game.campRates().gold,40);
  });
  test('M3 offline camp math follows warehouse cap, pending freeze and single harvest at all levels',()=>{
    for(let n=1;n<=5;n++) {
      Game.reset(92);atLevel(n);const fox=add(Game,'mistfox'),turtle=add(Game,'pondturtle');
      Game.assign(fox.uid,'garden');Game.assign(turtle.uid,'garden');const rates=Game.campRates();
      const before=Game.getState(),hours=DATA.camp.offlineHours[n-1],r=Game.catchUp(99*3600000);
      DATA.camp.resources.forEach(k=>assert.equal(r.campOutput[k],rates[k]*hours));
      assert.equal(r.elapsedMs,hours*3600000);assert.deepEqual(Game.getState().materials,before.materials);
      const frozen=Game.getState();assert.equal(Game.collect(),false);assert.equal(Game.build('pen'),false);assert.equal(Game.unassign(fox.uid),false);
      ticks(Game,10);assert.deepEqual(Game.getState(),frozen);assert.deepEqual(Game.catchUp(3600000),r);
      assert.equal(Game.load(Game.save()),true);Game.harvest();const after=Game.getState();
      ['wood','stone','enhanceStone'].forEach(k=>assert.equal(after.materials[k],before.materials[k]+r.materials[k]+r.campOutput[k]));
      assert.equal(Game.harvest(),false);Game.collect();assert.deepEqual(Game.getState(),after);
    }
  });
  test('M3 short offline uses same production ticks; pending bag includes prior uncollected work exactly once',()=>{
    Game.reset();const m=add(Game,'mistfox');Game.assign(m.uid,'garden');
    const saved=Game.save();ticks(Game,599);const expected=Game.getState().camp;Game.load(saved);Game.catchUp(59900);
    assert.deepEqual(Game.getState().camp,expected);
    const r=Game.catchUp(3*3600000);assert.equal(r.campOutput.wood,36);assert.equal(r.campOutput.enhanceStone,6);
    Game.harvest();assert.ok(Math.abs(Game.campAccrued().wood-12*59.9/3600)<1e-12);
  });
  test('M3 material drop boundaries, regional quantities and guaranteed boss essence online/offline',()=>{
    const original=Game.rng;
    try {
      for(const draw of [.07999,.08]) {
        Game.reset();Game.rng=()=>draw;Game.step();
        assert.equal(Game.getState().materials.wood,draw<.08?2:0);assert.equal(Game.getState().materials.stone,draw<.08?1:0);
      }
      Game.reset();Game.rng=()=>.01;edit(Game,s=>{s.roster.forEach(m=>m.level=100);s.unlockedStages.push(19);});
      Game.selectStage(19);Game.setMode('repeat');ticks(Game,300);const s=Game.getState();
      assert.ok(s.materials.essence>=2);assert.equal(s.materials.stone,s.materials.wood*2);
      assert.ok(Game.catchUp(3*3600000).materials.essence>0);
    } finally {Game.rng=original;}
  });
  test('M3 v5 migration supplies defaults and preserves frozen rewards, roster, RNG and coins',()=>{
    Game.reset();ticks(Game,40);Game.catchUp(3*3600000);const d=JSON.parse(Game.save());d.schemaVersion=d.state.schemaVersion=5;
    delete d.state.camp;for(const k of ['wood','stone','essence']){delete d.state.materials[k];delete d.state.pendingReport.materials[k];}
    delete d.state.pendingReport.campOutput;const old=plain(d.state);assert.equal(Game.load(JSON.stringify(d)),true);
    const s=Game.getState();assert.equal(s.schemaVersion,DATA.schemaVersion);assert.deepEqual(plain(s.roster),old.roster);assert.equal(s.rngSeed,old.rngSeed);
    assert.equal(s.gold,old.gold);assert.equal(s.coins,old.coins);assert.equal(s.pendingReport.gold,old.pendingReport.gold);
    assert.equal(s.materials.wood,0);assert.deepEqual(plain(s.pendingReport.campOutput),{wood:0,stone:0,enhanceStone:0,gold:0});
    assert.ok(Game.validateSave(Game.save()));Game.harvest();assert.ok(Game.validateSave(Game.save()));
  });
  test('M3 malformed camp saves are rejected atomically, validator uses imported levels',()=>{
    Game.reset();const m=add(Game,'mistfox'),json=Game.save(),before=Game.getState();
    for(const mutate of [s=>delete s.camp,s=>s.camp.levels.pen=2,s=>s.camp.levels.campfire=6,
      s=>s.camp.production.wood=-1,s=>s.camp.production.wood=.5,s=>s.materials.wood=-1,
      s=>s.roster[0].camp='garden',s=>s.roster[2].camp='missing']) {
      const d=JSON.parse(json);mutate(d.state);assert.equal(Game.load(JSON.stringify(d)),false);assert.deepEqual(Game.getState(),before);
    }
    edit(Game,s=>{s.camp.levels.campfire=5;s.roster.find(u=>u.uid===m.uid).party=3;});
    const high=Game.save();Game.reset();assert.equal(Game.load(high),true);assert.equal(Game.partySlots(),4);
  });
  test('M3 all seven camp PNGs exist at exact sizes and facility files encode RGBA',()=>{
    for(const name of ['campfire','pen','workshop','altar','storehouse','garden','ground']) {
      const p=path.join(__dirname,'../assets/camp',name+'.png'),b=fs.readFileSync(p);
      assert.ok(b.length>1000);assert.equal(b.readUInt32BE(16),name==='ground'?2048:768);
      assert.equal(b.readUInt32BE(20),name==='ground'?640:768);assert.equal(b[25],name==='ground'?2:6);
    }
  });
};
