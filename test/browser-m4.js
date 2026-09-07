"use strict";
const assert=require('node:assert/strict');
module.exports=async function({evaluate,command,screenshot,delay,url}){
  async function click(selector){
    const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await command('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
    await command('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
  }
  await delay(150);
  assert.equal(await evaluate('Game.onboardingStep()'),1);
  assert.ok(await evaluate("document.querySelector('#onboarding-tip').dataset.step==='1' && !Sfx.isEnabled() && Sfx.state()==='unavailable'"));
  await screenshot('m4-375-onboarding-1');
  await evaluate("window.synthCounts={tones:0,noise:0};for(const [method,key] of [['createOscillator','tones'],['createBufferSource','noise']]){const original=AudioContext.prototype[method];AudioContext.prototype[method]=function(...args){synthCounts[key]++;return original.apply(this,args);};}");
  await click('#onboarding-next');await delay(300);await evaluate('Game.pause()');
  assert.equal(await evaluate('Sfx.state()'),'running');assert.equal(await evaluate('Sfx.isEnabled()'),true);
  assert.equal(await evaluate('Game.onboardingStep()'),2);await screenshot('m4-375-onboarding-2');
  assert.ok(await evaluate("document.querySelector('.capture-status').classList.contains('onboarding-target')"));
  await evaluate("for(const name of ['hit','captureAttempt','capture','evolution','tap','sack'])Sfx.play(name)");
  const counts=await evaluate('synthCounts');assert.ok(counts.tones>=7&&counts.noise>=2);
  await click('#onboarding-next');await evaluate('Game.pause()');await delay(100);
  assert.equal(await evaluate('Game.onboardingStep()'),3);
  await click('[data-tab=monsters]');await delay(100);
  assert.ok(await evaluate("document.getElementById('onboarding-tip').parentElement.id==='sheet' && document.querySelector('[data-monster]').classList.contains('onboarding-target')"));
  await screenshot('m4-375-onboarding-3');
  await click('#onboarding-next');await evaluate('Game.pause()');await delay(100);
  assert.ok(await evaluate("!document.getElementById('onboarding-wait-skip').hidden"));
  await evaluate(`(()=>{const extra=[Game.rollMonster('dewslime'),Game.rollMonster('dewslime')],d=JSON.parse(Game.save());d.state.roster.push(...extra);Game.load(JSON.stringify(d));})()`);
  await delay(100);assert.equal(await evaluate('Game.onboardingStep()'),4);await screenshot('m4-375-onboarding-4');
  await click('#onboarding-next');await evaluate('Game.pause()');await click('#open-evolution');
  await evaluate("document.querySelector('[data-evolve=\"dewslime:1\"]').click()");await delay(850);
  assert.ok(await evaluate("document.querySelector('.evolution-after img').src.endsWith('dewslime_2.png') && document.querySelector('#party-layer image[href$=\"dewslime_2.png\"]')!==null"));
  assert.equal(await evaluate("Number(document.querySelector('#party-layer image[href$=\"dewslime_2.png\"]').getAttribute('width'))"),62);
  await screenshot('m4-375-stage-2-art');
  await click('#close-evolution');await click('#close-sheet');await click('[data-tab=camp]');await delay(250);
  assert.equal(await evaluate('Game.onboardingStep()'),5);await screenshot('m4-375-onboarding-5');
  assert.ok(await evaluate("document.querySelector('[data-facility=garden]').classList.contains('onboarding-target')"));
  await click('[data-facility=garden]');await delay(100);
  await click('[data-empty-slot]');await delay(100);await click('[data-assign]');
  assert.ok(await evaluate("Game.getState().roster.some(m=>m.camp==='garden')"));
  await click('#onboarding-next');await evaluate('Game.pause()');await delay(100);
  assert.equal(await evaluate('Game.onboardingStep()'),6);await screenshot('m4-375-onboarding-6');
  await click('#onboarding-next');await evaluate('Game.pause()');await click('#close-sheet');
  await click('[data-tab=settings]');await delay(100);
  await click('#mute-sound');assert.equal(await evaluate('Sfx.isEnabled()'),false);
  await evaluate("document.getElementById('master-volume').value=22;document.getElementById('master-volume').dispatchEvent(new Event('input'))");
  assert.deepEqual(await evaluate('Game.getState().sound'),{volume:.22,muted:true});await screenshot('m4-375-sound-settings');
  await click('#close-sheet');await evaluate('Game.save()');await command('Page.reload');await delay(500);await evaluate('Game.pause()');
  assert.equal(await evaluate('Game.onboardingStep()'),null);assert.deepEqual(await evaluate('Game.getState().sound'),{volume:.22,muted:true});
  await evaluate(`(()=>{const d=JSON.parse(Game.save());d.state.unlockedStages=Array.from({length:30},(_,i)=>i);d.state.roster.filter(m=>m.party!==null).forEach(m=>{m.level=100;m.xp=0;});if(!Game.load(JSON.stringify(d)))throw Error('boss fixture rejected');})()`);
  for(const index of [9,19,29]){
    await evaluate(`Game.selectStage(${index});while(Game.getState().battle.waveIndex<2 && Game.getState().battle.status==='fighting')Game.step()`);
    const boss=await evaluate("(()=>{const b=Game.getState().battle.enemies[0],img=document.querySelector('#enemy-layer image');return {boss:b.boss,src:img.getAttribute('href'),width:Number(img.getAttribute('width'))};})()");
    assert.ok(boss.boss,JSON.stringify({index,boss,state:await evaluate("({stage:Game.getState().currentStage,status:Game.getState().battle.status,wave:Game.getState().battle.waveIndex,party:Game.getState().battle.units.map(u=>u.atk)})")}));assert.ok(boss.src.startsWith('assets/bosses/'));assert.ok(Math.abs(boss.width-72*1.4)<1e-8);await screenshot('m4-375-boss-'+index);
  }
  // Trigger the real error handler without introducing an expected HTTP 404 into console checks.
  await evaluate("(()=>{const img=document.querySelector('#enemy-layer image');img.setAttribute('href','data:image/png;base64,broken');})()");await delay(150);
  assert.equal(await evaluate("document.querySelector('#enemy-layer image').getAttribute('href')"),'assets/monsters/cliffhawk.png');
  await command('Emulation.setDeviceMetricsOverride',{width:375,height:667,deviceScaleFactor:1,mobile:true});
  assert.ok(await evaluate('document.documentElement.scrollWidth===375'));await screenshot('m4-375-short');
  // Verify the actual service worker and every precached URL under a GitHub Pages-style subdirectory.
  await command('Emulation.setDeviceMetricsOverride',{width:375,height:844,deviceScaleFactor:1,mobile:true});
  await command('Page.navigate',{url:url+'/squad-idle/'});
  for(let i=0;i<150;i++){if(await evaluate("typeof Game!=='undefined' && navigator.serviceWorker.controller?.scriptURL.endsWith('/squad-idle/sw.js')"))break;await delay(100);}
  assert.ok(await evaluate("navigator.serviceWorker.controller.scriptURL.endsWith('/squad-idle/sw.js')"));
  assert.equal(await evaluate("fetch('manifest.webmanifest').then(r=>r.json()).then(m=>m.name)"),'몬스터 조련단');
  await evaluate('Game.pause();Game.skipOnboarding();Game.save()');
  await command('Network.enable');await command('Network.setCacheDisabled',{cacheDisabled:true});
  await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await command('Page.reload');await delay(600);
  assert.ok(await evaluate("typeof Game!=='undefined' && Game.validateSave(Game.save())"));await evaluate('Game.pause()');
  assert.ok(await evaluate("fetch('sw-shell.js').then(r=>r.text()).then(t=>{const paths=JSON.parse(t.slice(t.indexOf('['),t.lastIndexOf(']')+1));return Promise.all(paths.map(p=>fetch(p).then(r=>r.ok))).then(a=>a.every(Boolean));})"));
  assert.ok(await evaluate('document.documentElement.scrollWidth===375'));await screenshot('m4-375-offline-subpath');
  await command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  console.log('PASS M4 six onboarding steps, trusted-gesture running audio/synth graph, settings reload, evolution/boss/fallback art, 375px layout and full subpath offline shell');
};

