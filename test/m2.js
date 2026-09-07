"use strict";
const assert = require('node:assert/strict');
module.exports = function ({test,runtime,plain,ticks,edit,add,DATA,Game}) {
  function materials(n=3,id='dewslime',rarity='rare') { return Array.from({length:n},()=>add(Game,id,rarity)); }
  test('evolution validates atomically, preserves maximum rarity/level/enhancement and rerolls traits',()=>{
    Game.reset(); const ms=materials(), ids=ms.map(m=>m.uid);
    edit(Game,s=>{s.roster.find(m=>m.uid===ids[1]).level=8;s.roster.find(m=>m.uid===ids[2]).enhance=4;});
    const before=Game.getState();
    for(const bad of [[],ids.slice(0,2),[ids[0],ids[0],ids[1]],['missing',ids[1],ids[2]]]){
      assert.equal(Game.evolve(bad),false);assert.deepEqual(Game.getState(),before);
    }
    Game.toggleMonsterLock(ids[0]);assert.equal(Game.evolve(ids),false);Game.toggleMonsterLock(ids[0]);
    const r=Game.evolve(ids);assert.equal(r.monster.evo,2);assert.equal(r.monster.level,8);assert.equal(r.monster.enhance,4);
    assert.equal(r.monster.traits.length,[1,2,3,3][DATA.rarityOrder.indexOf(r.monster.rarity)]);
    assert.ok(Game.validateSave(Game.save()));
    const mixed=materials();edit(Game,s=>{s.roster.find(m=>m.uid===mixed[0].uid).speciesId='mistfox';});
    assert.equal(Game.evolve(mixed.map(m=>m.uid)),false);
    edit(Game,s=>{s.roster.find(m=>m.uid===mixed[0].uid).speciesId='dewslime';s.roster.find(m=>m.uid===mixed[0].uid).evo=2;});
    assert.equal(Game.evolve(mixed.map(m=>m.uid)),false);
  });
  test('5000 real evolutions bump rarity within 15% ±2%',()=>{
    Game.reset(77123); let bumps=0;
    for(let i=0;i<5000;i++) {
      const ids=materials().map(m=>m.uid),r=Game.evolve(ids);if(r.bumped)bumps++;
      assert.ok(Game.release([r.monster.uid]));
    }
    const rate=bumps/5000;console.log('  Evolution bump rate: '+(rate*100).toFixed(2)+'%');assert.ok(Math.abs(rate-.15)<=.02);
  });
  test('auto evolution cascades, lowest levels first, protects locks and stops at stage III',()=>{
    Game.reset(); const ms=materials(27);edit(Game,s=>{s.roster.find(m=>m.uid===ms[0].uid).level=9;});
    Game.toggleMonsterLock(ms[26].uid);const results=Game.autoEvolve();assert.ok(results.length);
    assert.ok(results[0].materials.every(m=>m.level===1));
    assert.ok(Object.values(Game.evolutionGroups()).every(g=>g.length<3));
    assert.ok(Game.getState().roster.some(m=>m.uid===ms[26].uid&&m.locked));
    assert.ok(results.some(r=>r.monster.evo===3));
    assert.deepEqual(plain(Game.autoEvolve()),[]);assert.ok(Game.validateSave(Game.save()));
  });
  test('enhancement exact costs, all-stat math, no failure and maximum stage',()=>{
    Game.reset();const prices=[50,75,113,169,254,380,570,855,1282,1923];
    prices.forEach((gold,i)=>assert.deepEqual(plain(DATA.enhanceCost(i)),{stones:2+i,gold}));
    const base=Game.monsterStats('monster-1');assert.equal(Game.enhance('monster-1'),false);
    edit(Game,s=>{s.gold=10000;s.materials.enhanceStone=100;});
    for(let i=1;i<=10;i++) {
      assert.equal(Game.enhance('monster-1').enhance,i);const now=Game.monsterStats('monster-1');
      Object.keys(DATA.cpWeights).forEach(k=>assert.ok(Math.abs(now[k]-base[k]*(1+.06*i))<1e-9,k));
    }
    assert.equal(Game.enhance('monster-1'),false);assert.equal(Game.getState().gold,10000-prices.reduce((a,b)=>a+b,0));
    const evolved=plain(Game.getState().roster[0]);evolved.evo=3;
    assert.ok(Math.abs(Game.monsterStats(evolved).hp/base.hp-1.6**2*1.6)<1e-9);
  });
  test('accessory equip raises CP, transfer/unequip/lock/sell/reroll and seven potentials',()=>{
    Game.reset(); const a=Game.rollAccessory('legendary');edit(Game,s=>{s.accessories.push(a);s.coins=40;});
    const cp=Game.getCP();assert.equal(Game.equip(a.uid,'monster-1'),true);assert.ok(Game.getCP()>cp);
    assert.equal(Game.sell([a.uid]),false);assert.equal(Game.equip(a.uid,'monster-2'),true);
    assert.equal(Game.getState().roster[0].accessory,null);assert.equal(Game.unequip('monster-2'),true);assert.equal(Game.getCP(),cp);
    assert.equal(Game.toggleLock(a.uid),true);assert.equal(Game.sell([a.uid]),false);
    assert.ok(Game.rerollPotentials(a.uid));assert.equal(Game.getState().coins,20);assert.ok(Game.validateSave(Game.save()));
    Game.toggleLock(a.uid);assert.equal(Game.sell([a.uid]).gold,160);assert.equal(Game.getState().accessories.length,0);
    assert.deepEqual(plain(DATA.accessoryPool.map(p=>p.id)),['atkPct','hpPct','defPct','attackSpeedPct','critChance','goldPct','catchPct']);
  });
  test('release pays rarity gold and bulk keeps three ordinary duplicates, protected and evolved monsters',()=>{
    Game.reset();const ms=materials(6);Game.toggleMonsterLock(ms[0].uid);
    const epic=add(Game,'dewslime','epic');assert.equal(Game.release([epic.uid]).gold,40);
    const r=Game.releaseDuplicates();assert.equal(r.count,4);assert.equal(r.gold,80);
    assert.equal(Game.getState().roster.filter(m=>m.speciesId==='dewslime').length,3);
    assert.ok(Game.getState().roster.some(m=>m.uid===ms[0].uid));assert.equal(Game.release(['monster-1']),false);
  });
  test('v4→v5 preserves old traits and combat, adds empty materials/accessories and survives round trip',()=>{
    Game.reset();const d=JSON.parse(Game.save());d.schemaVersion=d.state.schemaVersion=4;
    delete d.state.materials;delete d.state.accessories;delete d.state.nextAccessoryUid;delete d.state.coins;
    d.state.roster.forEach(m=>{delete m.locked;delete m.accessory;delete m.evo;delete m.enhance;});
    const battle=plain(d.state.battle);assert.equal(Game.load(JSON.stringify(d)),true);
    const s=Game.getState();assert.equal(s.schemaVersion,5);assert.equal(s.materials.enhanceStone,0);assert.equal(s.accessories.length,0);
    assert.deepEqual(plain(s.battle),battle);assert.equal(s.roster[0].traits.length,0);assert.ok(Game.validateSave(Game.save()));
    const json=Game.save();assert.equal(Game.load(json),true);assert.deepEqual(Game.getState(),s);
  });
  test('offline sack freezes stones, accessories and monsters; harvest at cap converts only incoming accessories',()=>{
    Game.reset(42);const as=Array.from({length:40},()=>Game.rollAccessory());edit(Game,s=>{s.accessories=as;s.accessories.forEach(a=>a.locked=true);});
    const r=Game.catchUp(3*3600000);assert.ok(r.materials.enhanceStone>0&&r.accessories.length>0&&r.monsters.length>0);
    const json=Game.save(),before=Game.getState();assert.equal(Game.enhance('monster-1'),false);assert.equal(Game.releaseDuplicates(),false);
    ticks(Game,30);assert.deepEqual(Game.getState(),before);assert.equal(Game.load(json),true);assert.deepEqual(Game.catchUp(3600000),r);
    Game.harvest();const s=Game.getState();assert.equal(s.materials.enhanceStone,r.materials.enhanceStone);assert.equal(s.accessories.length,40);
    assert.equal(s.gold,r.gold+r.accessories.reduce((n,a)=>n+DATA.accessoryGold[DATA.rarityOrder.indexOf(a.rarity)],0));
    assert.equal(Game.harvest(),false);assert.ok(Game.validateSave(Game.save()));
  });
  test('fresh region-1 five-minute capture rate across 20 seeds is 3–8 per run',()=>{
    const counts=[];
    for(let seed=1;seed<=20;seed++) {Game.reset(seed);let count=0;const off=Game.on('capture',()=>count++);ticks(Game,3000);off();counts.push(count);}
    console.log('  Five-minute captures: '+counts.join(', '));
    assert.ok(counts.every(n=>n>=3&&n<=8));const mean=counts.reduce((a,b)=>a+b,0)/20;
    assert.ok(300/mean>=60&&300/mean<=90);console.log('  Mean seconds per capture: '+(300/mean).toFixed(2));
  });
  test('evolution of assigned/equipped materials retains a slot/item and never heals its battle snapshot',()=>{
    Game.reset();const ms=materials(2),as=[Game.rollAccessory(),Game.rollAccessory()];
    edit(Game,s=>{s.accessories=as;s.roster.find(m=>m.uid===ms[1].uid).level=3;});
    Game.equip(as[0].uid,'monster-1');Game.equip(as[1].uid,ms[1].uid);
    const hp=Game.getState().battle.units.find(u=>u.id==='monster-1').hp;
    const r=Game.evolve(['monster-1',...ms.map(m=>m.uid)]);assert.equal(r.monster.party,0);assert.equal(r.monster.accessory,as[1].uid);
    const s=Game.getState();assert.equal(s.battle.units.find(u=>u.id===r.monster.uid).hp,hp);
    assert.equal(s.accessories.length,2);assert.ok(Game.validateSave(Game.save()));
  });
  test('6% stone and 5% accessory drop boundaries; bosses always drop, first-clear coins only once',()=>{
    const old=Game.rng;
    try {
      for(const [draw,stones,items] of [[.0599,1,0],[.06,0,0],[.0499,1,1],[.05,1,0]]) {
        Game.reset();Game.rng=()=>draw;Game.step();const s=Game.getState();
        assert.equal(s.materials.enhanceStone,stones);assert.equal(s.accessories.length,items);
      }
      Game.reset();Game.rng=()=>.99;
      edit(Game,s=>{s.roster.forEach(m=>m.level=100);s.unlockedStages.push(9);});Game.setMode('repeat');Game.selectStage(9);
      ticks(Game,300);assert.ok(Game.getState().accessories.length>=1);assert.equal(Game.getState().coins,30);
      ticks(Game,300);assert.equal(Game.getState().coins,30);
    } finally {Game.rng=old;}
  });
  test('pending v4 report migrates without rerolling its monsters or rewards',()=>{
    Game.reset();const report=Game.catchUp(3600000),d=JSON.parse(Game.save());d.schemaVersion=d.state.schemaVersion=4;
    const r=d.state.pendingReport;delete r.materials;delete r.accessories;
    d.state.roster.concat(r.monsters).forEach(m=>{delete m.locked;delete m.accessory;});
    assert.equal(Game.load(JSON.stringify(d)),true);const migrated=Game.getState().pendingReport;
    assert.equal(migrated.gold,report.gold);assert.deepEqual(migrated.monsters,report.monsters);assert.equal(migrated.accessories.length,0);
    assert.ok(Game.harvest());assert.ok(Game.validateSave(Game.save()));
  });
  test('malformed v5 accessories, ownership and report IDs are rejected without changing state',()=>{
    Game.reset();const a=Game.rollAccessory();edit(Game,s=>{s.accessories.push(a);});const json=Game.save(),before=Game.getState();
    for(const fn of [s=>{s.materials.enhanceStone=-1;},s=>{s.accessories[0].potentials[0].value=99;},
      s=>{s.roster[0].accessory='accessory-999';},s=>{s.roster.forEach(m=>m.accessory=a.uid);},
      s=>{s.accessories.push(s.accessories[0]);},s=>{s.nextAccessoryUid=1;}]) {
      const d=JSON.parse(json);fn(d.state);assert.equal(Game.load(JSON.stringify(d)),false);assert.deepEqual(Game.getState(),before);
    }
  });
};
