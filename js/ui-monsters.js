"use strict";
(function () {
  UI.selectedMonster=null;
  UI.monsterCard=function(m,interactive) {
    var species=DATA.species[m.speciesId], rarity=DATA.rarities[m.rarity],tag=interactive?"button":"article";
    return '<'+tag+' class="monster-card evo-'+m.evo+'" style="--rarity:'+rarity.color+'"'+(interactive?' data-monster="'+m.uid+'"':'')+'>'+
      (m.party!==null?'<span class="party-badge">파티</span>':m.camp!==null?'<span class="party-badge">캠프</span>':'')+'<img src="'+species.art+'" alt=""><strong>'+species.name+(m.evo>1?' '+UI.evoLabel(m.evo):'')+'</strong><small>'+rarity.name+' · Lv. '+UI.fmt(m.level)+(m.enhance?' +'+UI.fmt(m.enhance):'')+(m.locked?' · 잠금':'')+'</small></'+tag+'>';
  };
  UI.renderMonsters=function(state) {
    if(UI.monsterView === 'evolution') { UI.renderEvolution(state); return; }
    if(UI.monsterView === 'accessories') { UI.renderAccessories(state); return; }
    var content=document.getElementById("sheet-content"), m=state.roster.find(function(u){return u.uid===UI.selectedMonster;});
    if(m) { detail(m,state);return; }
    var count=state.roster.filter(function(u){return u.party!==null;}).length;
    content.innerHTML='<p class="sheet-intro">함께 싸우고, 함께 성장합니다.<br>보유 '+UI.fmt(state.roster.length)+' / '+UI.fmt(Game.campEffects().rosterCap)+' · 파티 '+UI.fmt(count)+' / '+UI.fmt(Game.partySlots())+'<br>조련사 랭크 '+[3,6,10].map(UI.fmt).join(' / ')+' 및 모닥불 Lv. '+UI.fmt(3)+' / '+UI.fmt(5)+'에 파티가 확장됩니다.</p><div class="roster-grid">'+state.roster.map(function(u){return UI.monsterCard(u,true);}).join('')+'</div>';
    content.querySelectorAll('[data-monster]').forEach(function(b){b.onclick=function(){UI.selectedMonster=b.dataset.monster;UI.refreshSheet();};});
    UI.rosterActions(content,state);
  };
  function detail(m,state) {
    var species=DATA.species[m.speciesId],rarity=DATA.rarities[m.rarity],stats=Game.monsterStats(m.uid),content=document.getElementById("sheet-content");
    var selected=state.roster.filter(function(u){return u.party!==null;}).length, blocked=m.camp!==null || (m.party===null?selected>=Game.partySlots():selected===1);
    var effect=species.skill.effect,desc=effect.type==="hit"?'공격력 '+UI.fmt(effect.power*100)+'%의 일격':effect.type==="heal"?'생존 동료 HP '+UI.fmt(effect.power*100)+'% 회복':effect.type==="shield"?'HP '+UI.fmt(effect.power*100)+'%의 보호막':UI.fmt(effect.duration)+'초간 매초 공격력 '+UI.fmt(effect.power*100)+'% 피해';
    content.innerHTML='<div class="monster-detail"><img class="detail-art" src="'+species.art+'" alt="'+species.name+'"><h3>'+species.name+'</h3><p class="detail-rarity" style="--rarity:'+rarity.color+'">'+rarity.name+' · Lv. '+UI.fmt(m.level)+'</p><p>'+DATA.roles[species.role]+' · '+DATA.elements[species.element]+'</p><p class="detail-note">경험치 '+UI.fmt(m.xp)+' / '+UI.fmt(DATA.xpToNext(m.level))+'</p><div class="xp-track"><div style="width:'+m.xp/DATA.xpToNext(m.level)*100+'%"></div></div><dl class="detail-stats">'+[['hp','HP'],['atk','공격력'],['def','방어력']].map(function(pair){return '<div><dt>'+pair[1]+'</dt><dd>'+UI.fmt(stats[pair[0]])+'</dd></div>';}).join('')+'</dl><div class="trait-list"><strong>'+species.skill.name+'</strong><p>'+desc+' · '+UI.fmt(species.skill.cooldown)+'초</p></div><div class="trait-list"><strong>개체 특성</strong>'+ (m.traits.length?m.traits.map(function(t){return '<p>'+DATA.potentialPool.find(function(p){return p.id===t.id;}).name+' +'+UI.fmt(t.value*100)+'%</p>';}).join(''):'<p>타고난 특성이 없는 평온한 동료입니다.</p>')+'</div><p class="detail-note">편성 변경은 다음 전투부터 적용됩니다.'+(blocked?'<br>'+(m.camp!==null?'캠프에서 배치를 먼저 해제해 주세요.':m.party===null?'파티 슬롯이 가득 찼습니다. 다른 동료를 먼저 해제해 주세요.':'최소 한 마리는 파티에 남아야 합니다.'):'')+'</p><div class="detail-actions"><button id="back-roster" class="back-button">목록으로</button><button id="toggle-party"'+(blocked?' disabled':'')+'>'+ (m.party===null?'파티 편성':'파티 해제')+'</button></div></div>';
    document.getElementById('back-roster').onclick=function(){UI.selectedMonster=null;UI.refreshSheet();};
    document.getElementById('toggle-party').onclick=function(){if(Game.toggleParty(m.uid))UI.toast('다음 전투부터 편성이 적용됩니다.');};
    content.querySelector('.monster-detail').classList.add('evo-'+m.evo);
    UI.detailProgression(m,state,content.querySelector('.monster-detail'));
  }
  UI.renderDex=function() {
    var entries=Game.getDex(),caught=entries.filter(function(e){return e.caught;}).length;
    document.getElementById('sheet-content').innerHTML='<p class="sheet-intro">새벽에 만난 생명들의 기록<br>포획 '+UI.fmt(caught)+' / '+UI.fmt(entries.length)+'</p>'+DATA.regions.map(function(region){
      return '<section class="dex-group"><h3>'+region.name+'</h3><div class="roster-grid">'+entries.filter(function(e){return e.region===region.id;}).map(function(e){
        return '<article class="monster-card dex-entry '+(e.caught?'dex-caught':'')+'" data-species="'+e.speciesId+'"><img class="'+(e.silhouette?'silhouette':'')+'" src="'+e.art+'" alt="'+(e.silhouette?'미발견 몬스터의 실루엣':e.name)+'"><strong>'+e.name+'</strong><small class="dex-state">'+(e.caught?'포획 완료':e.seen?'발견 · 미포획':'아직 만나지 못함')+'</small></article>';
      }).join('')+'</div></section>';
    }).join('');
  };
})();
