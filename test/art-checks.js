"use strict";
const assert = require("node:assert/strict");

module.exports = async function ({ evaluate, command, screenshot, delay }) {
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("Game.reset(); Game.pause()");
  assert.equal(await evaluate(`Promise.all(Object.values(DATA.assets).map(src => {
    const image = new Image(); image.src = src; return image.decode().then(() => true);
  })).then(images => images.length)`), 31);
  await delay(300);
  await screenshot("restyle-375-battle");
  const layout = await evaluate(`({ width: document.documentElement.scrollWidth,
    small: [...document.querySelectorAll('button')].filter(b => {
      const r = b.getBoundingClientRect(); return r.height > 0 && (r.width < 44 || r.height < 44);
    }).map(b => b.outerHTML),
    palette: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),
    sprites: document.querySelectorAll('#battle-svg .sprite-image').length,
    breathing: getComputedStyle(document.querySelector('.unit-body')).animationDuration })`);
  assert.ok(layout.width <= 375); assert.deepEqual(layout.small, []);
  assert.equal(layout.palette, "#FFF8E7"); assert.equal(layout.sprites, 5); assert.equal(layout.breathing, "2s");
  assert.ok(await evaluate(`new Promise(resolve => {
    const sprite = document.getElementById('sprite-warrior'), image = sprite.querySelector('image');
    UI.attackSprite(sprite); const start = performance.now();
    const attack = image.getAttribute('href').endsWith('warrior_attack.png');
    function sample(now) {
      if (image.getAttribute('href').endsWith('warrior_idle.png')) resolve(attack && now-start >= 120 && now-start < 200);
      else requestAnimationFrame(sample);
    } requestAnimationFrame(sample);
  })`));
  await evaluate("UI.levelUp({id:'warrior',level:2})");
  assert.equal(await evaluate("document.querySelector('.level-up-label').textContent"), "LEVEL UP!");
  await evaluate("UI.countUp('gold', 1000)");
  await delay(150);
  assert.notEqual(await evaluate("document.getElementById('gold').textContent"), "1,000");
  await delay(200);
  assert.equal(await evaluate("document.getElementById('gold').textContent"), "1,000");
  console.log("PASS 31 PNG decodes, 375px, 44px targets, 2s idle, 120ms attack, level label and 300ms counter");

  await evaluate(`window.artFixture = function(stage, boss) {
    Game.reset(); Game.pause(); const save = JSON.parse(Game.save()), state = save.state;
    state.currentStage = stage; state.unlockedStages = Array.from({length:30}, (_,i)=>i);
    state.clearedStages = Array.from({length:29}, (_,i)=>i);
    state.mercenaries.forEach(m => { m.unlocked = true; m.level = 150; });
    state.battle = Battle.start(stage, state.mercenaries);
    if (boss) while(state.battle.waveIndex < 2) Battle.tick(state.battle, ()=>{});
    if (!Game.load(JSON.stringify(save))) throw new Error('Invalid art fixture');
    Game.pause();
  }`);
  for (let region = 0; region < 3; region++) {
    await evaluate("artFixture(" + (region * 10 + 9) + ", false)");
    await delay(150);
    const expected = ["forest", "peak", "volcano"][region];
    assert.ok(await evaluate("document.querySelector('.region-image').getAttribute('href').endsWith('/" + expected + ".png')"));
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('#enemy-layer image')).every(i =>
      Object.values(DATA.artRegions[${region}].monsters).some(name => i.getAttribute('href').endsWith('/'+name+'.png')))`));
    await screenshot("restyle-region-" + expected);
    await evaluate("artFixture(" + (region * 10 + 9) + ", true)");
    await delay(150);
    assert.equal(await evaluate("document.querySelector('#enemy-layer image').getAttribute('height')"), "140");
    assert.ok(await evaluate(`document.querySelector('#enemy-layer image').getAttribute('href').endsWith('/'+DATA.artRegions[${region}].monsters.boss+'.png')`));
    await screenshot("restyle-boss-" + expected);
  }
  console.log("PASS three regional backgrounds, all regional type mappings and 140px bosses");

  for (const tab of ["mercenaries", "equipment", "fusion", "skills", "settings"]) {
    await evaluate("UI.openSheet('" + tab + "')"); await delay(250);
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= 375 && document.getElementById('sheet').scrollWidth <= document.getElementById('sheet').clientWidth`));
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#sheet button')).filter(b => {
      const r=b.getBoundingClientRect(); return r.height>0 && (r.width<44 || r.height<44);
    }).map(b=>b.outerHTML)`), []);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-tab=" + tab + "]')).transform"), "matrix(1, 0, 0, 1, 0, -6)");
    await screenshot("restyle-sheet-" + tab);
    await evaluate("document.getElementById('sheet').close()");
  }
  console.log("PASS all five sheets: 375px no overflow, 44px buttons and raised active tab");

  // A missing manifest entry must issue no request. Invalid PNG bytes exercise real image onerror.
  await evaluate(`window.artAssets = {...DATA.assets}; delete DATA.assets['merc.warrior.idle'];
    DATA.assets['merc.archer.idle'] = 'data:image/png;base64,AAAA';
    DATA.assets['bg.peak'] = 'data:image/png;base64,AAAA'; artFixture(19, false)`);
  await delay(300);
  assert.ok(await evaluate(`!document.querySelector('#sprite-warrior image') &&
    getComputedStyle(document.querySelector('#sprite-warrior .asset-fallback')).display !== 'none' &&
    getComputedStyle(document.querySelector('#sprite-archer .asset-fallback')).display !== 'none' &&
    getComputedStyle(document.querySelector('#scene-background .asset-fallback')).display !== 'none'`));
  await screenshot("restyle-fallbacks");
  // Late load/error callbacks from a replaced region must also be harmless.
  await evaluate(`const orphan = document.createElementNS('http://www.w3.org/2000/svg','image');
    orphan.dataset.asset='test.orphan'; UI.assetLoaded(orphan); UI.assetError(orphan);
    DATA.assets = artAssets; Game.reset(); Game.pause()`);
  console.log("PASS missing mapping, actual image decode failures and detached-image callbacks");
};
