"use strict";
const assert = require("node:assert/strict");

module.exports = async function ({ evaluate, command, screenshot, delay }) {
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`Game.reset(); Game.setMode("repeat"); window.p2Drops = []; window.p2Animations = [];
    window.p2Off = Game.on('itemDrop', item => {
      p2Drops.push(item);
      requestAnimationFrame(() => {
        const card = document.querySelector('.drop-card');
        p2Animations.push(card && getComputedStyle(card).animationName === 'drop-flight');
      });
    }); Game.resume();`);
  if (process.env.BROWSER_FAST === "1") await evaluate("Game.pause(); for(let n=0;n<1200;n++) Game.step()");
  let captured = false;
  for (let n = 0; n < 125; n++) {
    const state = await evaluate("({elapsed:Game.getState().stats.elapsedMs,drops:p2Drops.length,anim:!!document.querySelector('.drop-card')})");
    if (state.anim && !captured) { await screenshot("p2-drop-pop"); captured = true; }
    if (state.elapsed >= 120000) break;
    if (n % 30 === 0) console.log("P2 real-time play: " + Math.round(state.elapsed / 1000) + "s, " + state.drops + " drops");
    await delay(1000);
  }
  await evaluate("Game.pause(); p2Off()");
  assert.ok(await evaluate("Game.getState().stats.elapsedMs >= 120000 && p2Drops.length >= 3"));
  assert.ok(await evaluate("p2Animations.some(Boolean)"));
  assert.ok(await evaluate("!document.getElementById('equipment-badge').hidden"));
  console.log("PASS fresh 120s " + (process.env.BROWSER_FAST === "1" ? "replay" : "real timer") + ": " + await evaluate("p2Drops.length") + " drops, pop animation and tab badge");
  await evaluate("document.querySelector('[data-tab=equipment]').click()");
  await delay(250);
  assert.equal(await evaluate("document.querySelectorAll('.inventory-cell').length"), await evaluate("Game.getState().inventory.length"));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.inventory-grid')).gridTemplateColumns.split(' ').length"), 6);
  assert.ok(await evaluate("document.documentElement.scrollWidth <= 375 && document.getElementById('sheet').scrollWidth <= document.getElementById('sheet').clientWidth"));
  await screenshot("p2-inventory-375");
  await evaluate("window.p2BeforeCP = Game.getCP(); document.querySelector('.inventory-cell').click(); document.querySelector('[data-equip=warrior]').click()");
  await delay(600);
  assert.ok(await evaluate("Game.getCP() > p2BeforeCP && document.getElementById('cp').textContent === UI.fmt(Game.getCP())"));
  await screenshot("p2-equipped-detail");
  await evaluate("document.getElementById('close-sheet').click(); document.querySelector('[data-tab=mercenaries]').click(); document.querySelector('[data-merc-slot=weapon][data-merc=warrior]').click()");
  assert.ok(await evaluate("document.getElementById('sheet-title').textContent === '장비' && !!document.querySelector('.equip-mode') && document.querySelector('[data-filter=weapon]').getAttribute('aria-pressed') === 'true'"));
  console.log("PASS inventory grid/filter, equip CP animation and mercenary-slot equip mode at 375px");
  // Controlled save fixtures exercise UI actions while all production logic remains unchanged.
  await evaluate(`document.getElementById('close-sheet').click(); Game.reset(); Game.pause();
    const items = []; while(items.length < 12) { const i = Game.rollItem(0,{forcedTier:1}); if(i.slot==='weapon' && i.rarity==='rare') items.push(i); }
    const save = JSON.parse(Game.save()); save.state.inventory = items; save.state.gold = 10000; save.state.squadCoins = 100;
    localStorage.setItem('squad_v1',JSON.stringify(save)); Game.load();
    document.querySelector('[data-tab=fusion]').click(); document.querySelector('[data-fuse-slot=weapon][data-tier="1"]').click();`);
  await delay(80);
  assert.ok(await evaluate("document.getElementById('fusion-reveal').open && !!document.querySelector('.card-back')"));
  await screenshot("p2-fusion-face-down");
  await delay(650);
  assert.ok(await evaluate("Game.getState().inventory.some(i=>i.tier===2) && document.querySelector('#reveal-cards .item-card b').textContent === 'T2'"));
  await screenshot("p2-fusion-face-up");
  await evaluate("document.getElementById('reveal-skip').click();document.getElementById('reveal-skip').click();document.getElementById('auto-fuse').click()");
  await delay(80);
  const first = await evaluate("document.querySelectorAll('.fusion-card').length");
  await delay(280);
  assert.ok(await evaluate("document.querySelectorAll('.fusion-card').length") > first);
  await evaluate("document.getElementById('reveal-skip').click()");
  assert.ok(await evaluate("document.getElementById('fusion-reveal').classList.contains('reveal-skipped') && document.querySelectorAll('.fusion-card').length === 4"));
  await screenshot("p2-auto-fusion-results");
  await evaluate("document.getElementById('reveal-skip').click();document.getElementById('close-sheet').click();document.querySelector('[data-tab=equipment]').click();document.querySelector('.inventory-cell').click();document.querySelector('[data-action=lock]').click();document.querySelector('[data-action=reroll]').click()");
  assert.ok(await evaluate("!!document.querySelector('.reroll-preview') && Game.getState().squadCoins === 80 && document.querySelector('[data-action=sell]').disabled"));
  await delay(650);
  await screenshot("p2-potential-reroll");
  assert.ok(await evaluate("document.documentElement.scrollWidth <= 375 && document.getElementById('sheet').scrollWidth <= document.getElementById('sheet').clientWidth"));
  await evaluate("document.getElementById('close-sheet').click()");
  console.log("PASS single fusion T1→T2 flip, auto-fusion stagger/skip, lock and before/after potential reroll");
  await evaluate(`Game.reset(); Game.pause();
    const unique = []; while(unique.length < 3) { const item = Game.rollItem(29,{forcedTier:1}); if(item.slot==='weapon' && item.rarity==='unique') unique.push(item); }
    const upgradedSave = JSON.parse(Game.save()); upgradedSave.state.inventory = unique; upgradedSave.state.gold = 1000; upgradedSave.state.rngSeed = 2000;
    localStorage.setItem('squad_v1',JSON.stringify(upgradedSave)); Game.load();
    document.querySelector('[data-tab=fusion]').click();document.querySelector('[data-fuse-slot=weapon][data-tier="1"]').click();`);
  await delay(450);
  assert.ok(await evaluate("!!document.querySelector('.rarity-upgrade .rarity-legendary') && document.querySelector('.battle-scene').classList.contains('loot-flash-strong')"));
  await screenshot("p2-legendary-upgrade");
  await evaluate("document.getElementById('reveal-skip').click();document.getElementById('reveal-skip').click();document.getElementById('close-sheet').click()");
  console.log("PASS unique→legendary fusion with stronger flash");
};
