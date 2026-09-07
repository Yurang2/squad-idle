"use strict";
(function () {
  var revealFrame=0;
  UI.evoLabel=function(stage){return ['','Ⅰ','Ⅱ','Ⅲ'][stage];};
  function view(name) { UI.monsterView=name; UI.refreshSheet(); }
  function click(id,fn) { document.getElementById(id).onclick=fn; }
  function resources(s) { return '<p class="resource-line">'+UI.icon('gold')+UI.fmt(s.gold)+' 골드 · 강화석 '+UI.fmt(s.materials.enhanceStone)+' · 스쿼드 코인 '+UI.fmt(s.coins)+'</p>'; }
  UI.rosterActions=function(content,state) {
    content.insertAdjacentHTML('afterbegin','<div class="roster-actions"><button id="open-evolution" class="primary">'+UI.icon('lantern')+'진화</button><button id="open-accessories">'+UI.icon('accessory')+'장신구</button></div>'+resources(state));
    content.insertAdjacentHTML('beforeend','<button id="release-duplicates" class="back-button bulk-release">일괄 방생: 일반 등급 중복 '+UI.fmt(3)+'마리 초과분</button><p class="detail-note">잠금·파티·장신구 장착·진화 개체는 일괄 방생에서 보호됩니다.</p>');
    click('open-evolution',function(){view('evolution');});click('open-accessories',function(){UI.accessoryTarget=null;view('accessories');});
    click('release-duplicates',function(){var r=Game.releaseDuplicates();UI.toast(UI.fmt(r.count)+'마리 방생 · '+UI.fmt(r.gold)+' 골드');});
  };
  UI.detailProgression=function(m,state,content) {
    var cost=DATA.enhanceCost(m.enhance), groups=Game.evolutionGroups(), group=groups[m.speciesId+':'+m.evo]||[];
    var ids=group.some(function(u){return u.uid===m.uid;})?[m.uid].concat(group.filter(function(u){return u.uid!==m.uid;}).slice(0,2).map(function(u){return u.uid;})):[];
    var a=state.accessories.find(function(a){return a.uid===m.accessory;});
    var protectedM=m.locked||m.party!==null||m.accessory!==null||state.battle.units.some(function(u){return u.id===m.uid;});
    content.insertAdjacentHTML('beforeend',resources(state)+'<p class="detail-note">현재 파티 전투력 <b class="detail-cp">'+UI.fmt(Game.getCP())+'</b><br>성장·장신구 능력치는 다음 전투부터 적용됩니다.</p>'+
      '<section class="trait-list"><h3>진화 '+UI.evoLabel(m.evo)+'</h3><p>같은 종·단계의 동료 '+UI.fmt(3)+'마리 · 능력치 ×'+UI.fmt(1.6)+'</p><button id="detail-evolve" class="primary"'+(ids.length!==3||m.evo===3?' disabled':'')+'>진화 ×'+UI.fmt(1)+'</button><p>잠금 개체는 보호됩니다. 파티 슬롯과 장신구 하나를 계승하고, 나머지 장신구는 보관됩니다.</p></section>'+
      '<section class="trait-list"><h3>강화 +'+UI.fmt(m.enhance)+' / '+UI.fmt(10)+'</h3><p>단계마다 모든 능력치 +'+UI.fmt(6)+'% · 실패 없음</p><button id="enhance-monster"'+(m.enhance===10||state.gold<cost.gold||state.materials.enhanceStone<cost.stones?' disabled':'')+'>'+(m.enhance===10?'최대 강화':'강화 · '+UI.fmt(cost.stones)+' 강화석 / '+UI.fmt(cost.gold)+' 골드')+'</button></section>'+
      '<section class="trait-list"><h3>장신구</h3>'+(a?UI.accessoryCard(a):'<p>아직 장착한 장신구가 없습니다.</p>')+'<button id="choose-accessory">장신구 선택</button>'+(a?'<button id="unequip-accessory" class="back-button">해제</button>':'')+'</section>'+
      '<div class="detail-actions"><button id="lock-monster">'+(m.locked?'잠금 해제':'잠금')+'</button><button id="release-monster" class="danger-button"'+(protectedM?' disabled':'')+'>방생 · '+UI.fmt(DATA.releaseGold[DATA.rarityOrder.indexOf(m.rarity)])+' 골드</button></div>');
    click('detail-evolve',function(){var r=Game.evolve(ids);if(r){UI.selectedMonster=r.monster.uid;UI.refreshSheet();UI.showEvolution([r]);}});
    click('enhance-monster',function(){if(Game.enhance(m.uid))UI.toast('강화 +'+UI.fmt(m.enhance+1)+' · 전투력 '+UI.fmt(Game.getCP()));});
    click('choose-accessory',function(){UI.accessoryTarget=m.uid;view('accessories');});
    if(a)click('unequip-accessory',function(){Game.unequip(m.uid);});
    click('lock-monster',function(){Game.toggleMonsterLock(m.uid);});
    click('release-monster',function(){var r=Game.release([m.uid]);if(r){UI.selectedMonster=null;UI.refreshSheet();UI.toast(UI.fmt(r.gold)+' 골드를 받았습니다.');}});
  };
  UI.renderEvolution=function(state) {
    var groups=Game.evolutionGroups(), content=document.getElementById('sheet-content');
    content.innerHTML='<div class="roster-actions"><button id="evolution-back" class="back-button">몬스터 목록</button><button id="auto-evolve" class="primary">자동 진화</button></div><p class="sheet-intro">같은 종·단계 '+UI.fmt(3)+'마리가 한 동료로.<br>최고 등급·레벨·강화 계승, '+UI.fmt(15)+'%로 등급 상승.<br>잠금 개체는 보호됩니다. 편성·장신구 하나를 계승합니다.</p><table class="evolution-table"><thead><tr><th>종</th><th>Ⅰ → Ⅱ</th><th>Ⅱ → Ⅲ</th></tr></thead><tbody>'+Object.values(DATA.species).filter(function(s){return state.dex[s.id].seen;}).map(function(s){
      return '<tr><th>'+s.name+'</th>'+[1,2].map(function(stage){var n=(groups[s.id+':'+stage]||[]).length;return '<td><small>'+UI.fmt(n)+'마리</small><button data-evolve="'+s.id+':'+stage+'" class="primary"'+(n<3?' disabled':'')+'>진화 ×'+UI.fmt(1)+'</button></td>';}).join('')+'</tr>';
    }).join('')+'</tbody></table>';
    click('evolution-back',function(){UI.selectedMonster=null;view(null);});
    click('auto-evolve',function(){var r=Game.autoEvolve();if(r.length)UI.showEvolution(r);else UI.toast('진화 가능한 동료가 없습니다.');});
    content.querySelectorAll('[data-evolve]').forEach(function(b){b.onclick=function(){var r=Game.evolve(groups[b.dataset.evolve].slice(0,3).map(function(m){return m.uid;}));if(r)UI.showEvolution([r]);};});
  };
  UI.accessoryCard=function(a) {
    return '<article class="accessory-card" style="--rarity:'+DATA.rarities[a.rarity].color+'">'+UI.icon('accessory')+'<strong>'+DATA.rarities[a.rarity].name+' 새벽 목걸이'+(a.locked?' · 잠금':'')+'</strong><small>HP +'+UI.fmt(8*DATA.rarities[a.rarity].multiplier)+' · 공격 / 방어 +'+UI.fmt(DATA.rarities[a.rarity].multiplier)+'</small>'+a.potentials.map(function(p){return '<p>'+DATA.accessoryPool.find(function(d){return d.id===p.id;}).name+' +'+UI.fmt(p.value*100)+'%</p>';}).join('')+'</article>';
  };
  UI.renderAccessories=function(state) {
    var content=document.getElementById('sheet-content'),target=state.roster.find(function(m){return m.uid===UI.accessoryTarget;});
    content.innerHTML='<button id="accessory-back" class="back-button">'+(target?'몬스터 상세':'몬스터 목록')+'</button>'+resources(state)+'<p class="sheet-intro">장신구 '+UI.fmt(state.accessories.length)+' / '+UI.fmt(DATA.accessory.cap)+' · 파티 전투력 <b class="accessory-cp">'+UI.fmt(Game.getCP())+'</b><br>'+(target?DATA.species[target.speciesId].name+'에게 장착':'장착할 동료를 선택하세요')+'</p>'+
      '<label>장착 대상 <select id="accessory-target"><option value="">동료 선택</option>'+state.roster.map(function(m){return '<option value="'+m.uid+'"'+(target&&target.uid===m.uid?' selected':'')+'>'+DATA.species[m.speciesId].name+' '+UI.evoLabel(m.evo)+' · Lv. '+UI.fmt(m.level)+' · '+UI.fmt(Number(m.uid.slice(8)))+'</option>';}).join('')+'</select></label><div class="accessory-list">'+state.accessories.map(function(a){var owner=state.roster.find(function(m){return m.accessory===a.uid;});return '<section data-accessory="'+a.uid+'">'+UI.accessoryCard(a)+(owner?'<p class="detail-note">'+DATA.species[owner.speciesId].name+' 장착 중</p>':'')+'<div class="accessory-actions"><button data-equip="'+a.uid+'"'+(!target?' disabled':'')+'>장착</button>'+(owner?'<button data-unequip="'+owner.uid+'">해제</button>':'')+'<button data-lock="'+a.uid+'">'+(a.locked?'잠금 해제':'잠금')+'</button><button data-sell="'+a.uid+'"'+(owner||a.locked?' disabled':'')+'>판매 · '+UI.fmt(DATA.accessoryGold[DATA.rarityOrder.indexOf(a.rarity)])+'</button><button data-reroll="'+a.uid+'"'+(state.coins<20?' disabled':'')+'>잠재 재설정 · '+UI.fmt(20)+' 코인</button></div></section>';}).join('')+'</div>'+(state.accessories.length?'':'<p class="detail-note">적 처치 시 '+UI.fmt(5)+'%, 보스 처치 시 반드시 드롭됩니다.</p>');
    click('accessory-back',function(){view(null);});
    document.getElementById('accessory-target').onchange=function(e){UI.accessoryTarget=e.target.value;UI.refreshSheet();};
    [['equip',function(id){Game.equip(id,UI.accessoryTarget);}],['unequip',Game.unequip],['lock',Game.toggleLock],['sell',function(id){Game.sell([id]);}],['reroll',function(id){if(Game.rerollPotentials(id))UI.toast('새 잠재가 드러났습니다.');}]].forEach(function(pair){
      content.querySelectorAll('[data-'+pair[0]+']').forEach(function(b){b.onclick=function(){pair[1](b.dataset[pair[0]]);};});
    });
  };
  UI.showEvolution=function(results) {
    var dialog=document.getElementById('evolution-reveal'), container=document.getElementById('evolution-cards');
    cancelAnimationFrame(revealFrame);
    container.innerHTML=results.map(function(r){return '<div class="evolution-pair"><div class="evolution-before">'+UI.monsterCard(r.materials[0],false)+'</div><div class="evolution-after '+(r.bumped?'rarity-bump':'')+'">'+UI.monsterCard(r.monster,false)+'<p>'+(r.bumped?'등급 상승':'새로운 형태')+'</p></div></div>';}).join('');
    dialog.classList.remove('revealed');if(!dialog.open)dialog.showModal();
    var start=performance.now();function frame(now){if(now-start>=400)dialog.classList.add('revealed');else revealFrame=requestAnimationFrame(frame);}revealFrame=requestAnimationFrame(frame);
    click('close-evolution',function(){if(!dialog.classList.contains('revealed')){cancelAnimationFrame(revealFrame);dialog.classList.add('revealed');}else dialog.close();});
  };
  UI.initProgression=function() {
    document.body.insertAdjacentHTML('beforeend','<dialog id="evolution-reveal" aria-labelledby="evolution-title"><div class="report-inner"><h2 id="evolution-title">빛 속에서, 새로운 모습으로</h2><div id="evolution-cards"></div><button id="close-evolution" class="primary">계속 · 탭하여 건너뛰기</button></div></dialog>');
    document.getElementById('evolution-reveal').addEventListener('cancel',function(e){e.preventDefault();document.getElementById('close-evolution').click();});
    Game.on('itemDrop',function(e){
      var popup=document.getElementById('accessory-drop');if(!popup){popup=document.createElement('div');popup.id='accessory-drop';document.getElementById('scene-wrap').appendChild(popup);}
      popup.innerHTML='<div class="capture-card" style="border-color:'+DATA.rarities[e.item.rarity].color+'">'+UI.icon('accessory')+'<strong>'+DATA.rarities[e.item.rarity].name+' 장신구</strong><small>'+(e.stored?'장신구함에 보관':'보유 한도 · 골드로 환전')+'</small></div>';
      UI.animate(popup,'drop-visible');
    });
    Game.on('inventoryFull',function(e){UI.toast('장신구함이 가득 차 새 드롭을 '+UI.fmt(e.gold)+' 골드로 환전했습니다.');});
  };
})();
