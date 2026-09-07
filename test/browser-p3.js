"use strict";
const assert = require("node:assert/strict");

module.exports = async function ({ evaluate, command, screenshot, delay, events }) {
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`Game.pause(); document.querySelectorAll('dialog[open]').forEach(d=>d.close()); Game.reset();
    window.p3Save = JSON.parse(Game.save());
    p3Save.state.stats = {goldPerSec:20,killsPerSec:2,elapsedMs:10000,samples:[{at:10000,gold:20}]};
    p3Save.savedAt = Date.now()-3*3600000;
    localStorage.setItem('squad_v1',JSON.stringify(p3Save));`);
  // Navigation reload triggers pagehide save; set the old timestamp in the next document before UI.init.
  const injected = await command("Page.addScriptToEvaluateOnNewDocument", { source: `
    const stored = JSON.parse(localStorage.getItem('squad_v1'));
    stored.savedAt=Date.now()-3*3600000;
    stored.state.stats={goldPerSec:20,killsPerSec:2,elapsedMs:10000,samples:[{at:10000,gold:20}]};
    localStorage.setItem('squad_v1',JSON.stringify(stored));` });
  await command("Page.reload");
  for (let i = 0; i < 50; i++) {
    if (await evaluate("!!document.getElementById('offline-report')?.open")) break;
    await delay(50);
  }
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
  assert.ok(await evaluate("document.getElementById('offline-report').open"));
  assert.ok(await evaluate("document.getElementById('report-duration').textContent.includes('3시간 0분')"));
  const goldEarly = await evaluate("document.getElementById('report-gold').textContent");
  await delay(250);
  assert.notEqual(await evaluate("document.getElementById('report-gold').textContent"), goldEarly);
  assert.equal(await evaluate("Game.getState().gold"), 0);
  await screenshot("p3-report-countup");
  await delay(900);
  const before = await evaluate("document.querySelectorAll('#report-items .fusion-card').length");
  await delay(450);
  assert.ok(await evaluate("document.querySelectorAll('#report-items .fusion-card').length > " + before));
  assert.ok(await evaluate("getComputedStyle(document.querySelector('#report-items .flip-inner')).animationName === 'item-flip'"));
  await screenshot("p3-report-flips");
  await evaluate("document.getElementById('report-title').click()");
  assert.ok(await evaluate("document.querySelectorAll('#report-items .fusion-card').length === Game.getState().pendingReport.items.length"));
  assert.ok(await evaluate("document.getElementById('offline-report').classList.contains('loot-flash-strong')"));
  assert.ok(await evaluate("document.documentElement.scrollWidth <= 375 && document.getElementById('offline-report').scrollWidth <= 375"));
  await screenshot("p3-report-revealed");
  const reward = await evaluate("Game.getState().pendingReport.gold");
  await evaluate("document.getElementById('harvest-report').click(); Game.pause()");
  assert.ok(await evaluate("!document.getElementById('offline-report').open && Game.getState().pendingReport === null && Game.getState().gold >= " + reward));
  assert.ok(await evaluate("Game.getState().inventory.length === 60 && Game.getState().overflow > 0"));
  console.log("PASS P3 3h reload report, count-up, 200ms flips, strong flash, skip and harvest overflow");

  await evaluate(`Game.reset(); window.p3Now=Date.now;
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    Date.now=()=>p3Now()+61000;
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
    document.dispatchEvent(new Event('visibilitychange'));
    Date.now=p3Now; delete document.hidden;`);
  assert.ok(await evaluate("document.getElementById('offline-report').open && Game.getState().pendingReport.elapsedMs >= 61000"));
  await evaluate("document.getElementById('harvest-report').click(); Game.pause()");
  console.log("PASS P3 visibilitychange return after 61s opens a harvest report");

  await evaluate("Game.reset(); Game.pause(); Game.step(); document.querySelector('[data-tab=skills]').click()");
  assert.ok(await evaluate("!!document.querySelector('.skill-label') && document.querySelectorAll('.skill-card').length === 4"));
  await delay(300);
  await screenshot("p3-skills");
  await evaluate("document.querySelector('[data-skill=taunt]').click(); document.querySelector('[data-skill=regen]').click()");
  assert.ok(await evaluate("Game.getState().mercenaries[0].skills.join(',') === 'guard,smash,regen'"));
  await evaluate("document.getElementById('close-sheet').click()");
  assert.ok(await evaluate("document.getElementById('difficulty-toggle').hidden"));
  await evaluate(`window.p3State=Game.getState();
    p3State.currentStage=29;p3State.unlockedStages=Array.from({length:30},(_,i)=>i);p3State.clearedStages=Array.from({length:29},(_,i)=>i);
    p3State.mercenaries.forEach(m=>{m.level=180;m.unlocked=true});
    p3State.battle=Battle.start(29,p3State.mercenaries);
    Game.importSave(JSON.stringify({schemaVersion:3,savedAt:Date.now(),state:p3State}));
    while(Game.getState().battle.status==='fighting')Game.step();`);
  assert.ok(await evaluate("!document.getElementById('difficulty-toggle').hidden"));
  await evaluate("document.querySelector('[data-difficulty=chaos]').click()");
  assert.equal(await evaluate("Game.getState().difficulty"), "chaos");
  assert.ok(await evaluate("document.documentElement.scrollWidth <= 375"));
  await delay(300);
  await screenshot("p3-chaos");
  console.log("PASS P3 visible skill casts, slot edits, chaos toggle only after 3-10 and 375px layout");

  await evaluate("document.querySelector('[data-tab=settings]').click(); document.getElementById('export-save').click(); window.p3Export=document.getElementById('save-json').value");
  assert.equal(await evaluate("JSON.parse(p3Export).schemaVersion"), 3);
  await evaluate("document.getElementById('copy-save').click()");
  await delay(100);
  assert.ok(await evaluate("document.getElementById('save-message').textContent.includes('복사') || document.getElementById('save-json').selectionEnd>0"));
  await screenshot("p3-export");
  await evaluate("document.getElementById('import-save').click(); document.getElementById('save-json').value='bad'; document.getElementById('apply-save').click()");
  assert.ok(await evaluate("document.getElementById('save-message').textContent.includes('올바른 JSON')"));
  await evaluate("document.getElementById('save-json').value=p3Export");
  const eventStart = events.length;
  const applying = evaluate("document.getElementById('apply-save').click()");
  for (let i = 0; i < 30 && !events.slice(eventStart).some(e => e.method === "Page.javascriptDialogOpening"); i++) await delay(50);
  assert.ok(events.slice(eventStart).some(e => e.method === "Page.javascriptDialogOpening" && e.params.type === "confirm"));
  await command("Page.handleJavaScriptDialog", { accept: true }); await applying;
  assert.ok(await evaluate("!document.getElementById('sheet').open && JSON.stringify(Game.getState())===JSON.stringify(JSON.parse(p3Export).state)"));
  assert.ok(await evaluate("document.documentElement.scrollWidth <= 375"));
  console.log("PASS P3 JSON export/copy, invalid import validation, confirmed import round-trip");
  await evaluate("Game.setMode('challenge')");
};
