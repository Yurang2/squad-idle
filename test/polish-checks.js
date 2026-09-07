"use strict";
const assert = require("node:assert/strict");

module.exports = async function ({ evaluate, command, screenshot, delay }) {
  for (const height of [844, 667]) {
    await command("Emulation.setDeviceMetricsOverride", { width: 375, height, deviceScaleFactor: 1, mobile: true });
    for (const recruited of [1, 2, 3]) {
      await evaluate(`Game.reset(); Game.pause(); (() => {
        const save = JSON.parse(Game.save()), state = save.state;
        state.mercenaries.forEach((m, i) => { m.unlocked = i < ${recruited}; });
        state.battle = Battle.start(0, state.mercenaries.filter(m => m.unlocked));
        if (!Game.load(JSON.stringify(save))) throw new Error('Invalid polish fixture');
        Game.pause();
      })()`);
      await delay(200);
      const layout = await evaluate(`(() => {
        const rect = n => { const r = n.getBoundingClientRect();
          return {left:r.left, right:r.right, top:r.top, bottom:r.bottom, height:r.height}; };
        const units = ['mage','archer','warrior'].map(id => document.getElementById('sprite-'+id));
        return {width:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight,
          scene:rect(document.querySelector('.battle-scene')), tabs:rect(document.querySelector('.bottom-tabs')),
          strip:rect(document.querySelector('.squad-strip')), harvest:rect(document.querySelector('.harvest-row')),
          controls:rect(document.querySelector('.stage-controls')),
          sprites:units.map(n => rect(n.querySelector('image'))),
          ghosts:units.filter(n => n.classList.contains('locked-unit')).map(n => ({
            opacity:getComputedStyle(n).opacity, label:rect(n.querySelector('.locked-label')),
            sprite:rect(n.querySelector('image'))})),
          order:[...document.querySelector('#mercenary-layer').children].map(n => n.classList.contains('locked-unit')),
          icons:[...document.querySelectorAll('.bottom-tabs img')].map(n => n.complete && n.naturalWidth === 256)};
      })()`);
      console.log('Polish layout', height, recruited, 'scene:', layout.scene.height, 'tabs bottom:', layout.tabs.bottom);
      assert.ok(layout.width <= 375, 'No horizontal scroll');
      assert.ok(layout.height <= height && layout.tabs.bottom <= height, 'Entire page and tabs fit');
      assert.ok(layout.scene.height >= 260, 'Scene keeps its minimum height');
      assert.ok(layout.scene.bottom <= layout.strip.top && layout.strip.bottom <= layout.harvest.top &&
        layout.harvest.bottom <= layout.controls.top && layout.controls.bottom <= layout.tabs.top, 'Page sections do not overlap: ' + JSON.stringify(layout));
      assert.equal(layout.icons.length, 5); assert.ok(layout.icons.every(Boolean));
      for (let i = 1; i < 3; i++) assert.ok(layout.sprites[i].left - layout.sprites[i-1].right >= 12, '12px sprite gap');
      for (const sprite of layout.sprites) {
        assert.ok(sprite.left >= layout.scene.left && sprite.right <= layout.scene.right, 'Sprite stays in scene');
      }
      for (const ghost of layout.ghosts) {
        assert.equal(ghost.opacity, '0.35');
        assert.ok(ghost.label.top > ghost.sprite.bottom, 'Ghost label below feet');
      }
      assert.deepEqual(layout.order, [...layout.order].sort((a,b) => Number(b)-Number(a)), 'Ghosts painted first');
      await screenshot('polish-375x' + height + '-' + recruited + '-recruited');
      if (recruited === 3) {
        const gap = await evaluate(`new Promise(resolve => {
          const archer = document.querySelector('#sprite-archer .unit-body');
          archer.classList.add('lunge-right'); UI.attackSprite(document.getElementById('sprite-archer'));
          const start = performance.now(); let minimum = Infinity;
          function sample(now) {
            const a = archer.querySelector('image').getBoundingClientRect();
            const w = document.querySelector('#sprite-warrior image').getBoundingClientRect();
            minimum = Math.min(minimum, w.left - a.right);
            if (now - start < 140) requestAnimationFrame(sample); else resolve(minimum);
          } requestAnimationFrame(sample);
        })`);
        assert.ok(gap >= 12, 'Attack animation preserves 12px gap: ' + gap);
      }
    }
  }
  console.log('PASS Polish: two phone heights, all recruitment states, sprite gaps, ghost labels/layers, five PNG tabs');
};
