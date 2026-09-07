"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
module.exports=function({test,runtime,plain,edit,add}){
  test('M4 all 54 evolution and three boss paths match manifests; missing art falls back once',()=>{
    const {DATA}=runtime(),c=vm.createContext({DATA,UI:{}});
    vm.runInContext(fs.readFileSync(path.join(root,'js/ui-art.js'),'utf8'),c);
    assert.deepEqual(plain(DATA.monsterArt),JSON.parse(fs.readFileSync(path.join(root,'assets/monsters/manifest.json'),'utf8')));
    assert.deepEqual(plain(DATA.bossArt),JSON.parse(fs.readFileSync(path.join(root,'assets/bosses/manifest.json'),'utf8')));
    for(const speciesId of Object.keys(DATA.species))for(const evo of [1,2,3]){
      const src=c.UI.monsterArt({speciesId,evo});assert.equal(src,DATA.monsterArt[speciesId][evo]);assert.ok(fs.existsSync(path.join(root,src)));
    }
    DATA.regions.forEach((r,i)=>{const src=c.UI.monsterArt({speciesId:r.boss,boss:true});assert.equal(src,DATA.bossArt[DATA.regionBossArt[i]]);assert.ok(fs.existsSync(path.join(root,src)));});
    const m={speciesId:'mistfox',evo:2},base=DATA.monsterArt.mistfox[1],stage2=DATA.monsterArt.mistfox[2];
    delete DATA.monsterArt.mistfox[2];assert.equal(c.UI.monsterArt(m),base);DATA.monsterArt.mistfox[2]=stage2;
    for(const tagName of ['IMG','image']){
      const attrs={src:stage2,href:stage2},node={tagName,dataset:{fallback:base},getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v};
      c.UI.artFallback(node);c.UI.artFallback(node);assert.equal(attrs[tagName==='IMG'?'src':'href'],base);
    }
    assert.equal(c.UI.monsterArt(m),base);
    const key=DATA.regionBossArt[0];delete DATA.bossArt[key];assert.equal(c.UI.monsterArt({speciesId:'reedheron',boss:true}),DATA.species.reedheron.art);
  });
  test('M4 event-triggered onboarding queues in order, survives saves and always skips',()=>{
    const {Game:g}=runtime();g.reset();assert.equal(g.onboardingStep(),1);
    assert.equal(g.completeOnboarding(4),false);g.visitTab('camp');assert.equal(g.onboardingStep(),1);
    g.step();assert.equal(g.onboardingStep(),2);assert.deepEqual(plain(g.getState().onboarding.completedSteps),[1]);
    g.completeOnboarding(2);assert.equal(g.onboardingStep(),3);g.completeOnboarding(3);assert.equal(g.onboardingStep(),null);
    const id='dewslime';add(g,id);add(g,id);assert.equal(g.onboardingStep(),4);
    const before=plain(g.getState().onboarding);assert.ok(g.load(g.save()));assert.deepEqual(plain(g.getState().onboarding),before);
    g.completeOnboarding(4);assert.equal(g.onboardingStep(),5);g.completeOnboarding(5);assert.equal(g.onboardingStep(),6);
    g.completeOnboarding(6);assert.equal(g.onboardingStep(),null);
    g.reset();g.skipOnboarding();g.step();g.visitTab('camp');assert.equal(g.onboardingStep(),null);assert.ok(g.load(g.save()));
    assert.deepEqual(plain(g.getState().onboarding.completedSteps),[1,2,3,4,5,6]);
  });
  test('M4 schema-6 migration, audio settings and malformed tutorial/settings rejection',()=>{
    const {Game:g}=runtime();g.reset();const old=JSON.parse(g.save());old.schemaVersion=old.state.schemaVersion=6;
    delete old.state.onboarding;delete old.state.sound;assert.ok(g.load(JSON.stringify(old)));
    assert.deepEqual(plain(g.getState().sound),{volume:.35,muted:false});
    assert.ok(g.setSound({volume:.2,muted:true}));assert.ok(g.load(g.save()));assert.deepEqual(plain(g.getState().sound),{volume:.2,muted:true});
    assert.equal(g.setSound({volume:NaN,muted:false}),false);
    for(const mutate of [s=>s.onboarding.completedSteps=[2],s=>s.onboarding.triggeredSteps=[1,1],s=>s.sound.volume=2,s=>s.sound.muted=1]){
      const d=JSON.parse(g.save()),before=plain(g.getState());mutate(d.state);assert.equal(g.load(JSON.stringify(d)),false);assert.deepEqual(plain(g.getState()),before);
    }
  });
  test('M4 Sfx never creates audio before unlock and never throws without AudioContext',()=>{
    const code=fs.readFileSync(path.join(root,'js/audio.js'),'utf8');
    for(const extra of [{},{AudioContext:function(){throw new Error('unsupported');}}]){
      const nativeAudio=function(){},c=vm.createContext({...extra,Audio:nativeAudio});vm.runInContext(code,c);
      assert.equal(c.Audio,nativeAudio);assert.equal(c.Sfx.isEnabled(),false);
      assert.doesNotThrow(()=>{c.Sfx.configure({volume:.4,muted:false});c.Sfx.setCamp(true);c.Sfx.setActive(false);c.Sfx.setActive(true);c.Sfx.unlock();
        for(const name of ['hit','captureAttempt','capture','evolution','tap','sack'])assert.equal(c.Sfx.play(name),false);});
    }
    let created=0;const c=vm.createContext({AudioContext:function(){created++;throw Error('test');}});vm.runInContext(code,c);
    c.Sfx.setCamp(true);c.Sfx.play('hit');assert.equal(created,0);c.Sfx.unlock();assert.equal(created,1);
    assert.ok(!code.includes('Math.random('));
  });
  test('M4 relative PWA shell, PNG icons and Capacitor configuration stay synchronized',()=>{
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
    assert.equal(manifest.name,'몬스터 조련단');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.theme_color,'#FEF4E7');
    for(const icon of manifest.icons){const p=fs.readFileSync(path.join(root,icon.src)),size=Number(icon.sizes.split('x')[0]);assert.equal(p.readUInt32BE(16),size);assert.equal(p.readUInt32BE(20),size);}
    const c=vm.createContext({self:{}});vm.runInContext(fs.readFileSync(path.join(root,'sw-shell.js'),'utf8'),c);
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    for(const m of html.matchAll(/<script src="([^"]+)"/g))assert.ok(c.self.APP_SHELL.includes(m[1]),m[1]);
    c.self.APP_SHELL.forEach(p=>{assert.ok(!p.startsWith('/')&&!p.includes('://'));assert.ok(fs.existsSync(path.join(root,p)),p);});
    const config=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json'),'utf8'));
    assert.equal(config.appName,manifest.name);assert.equal(config.plugins.SplashScreen.backgroundColor,manifest.theme_color);assert.equal(config.webDir,'www');
    assert.ok(fs.existsSync(path.join(root,'sw.js')));
  });
  test('M4 three real monster campaigns clear 3-10 within eight simulated hours',()=>require('./long-run')());
};
