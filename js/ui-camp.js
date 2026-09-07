"use strict";
(function () {
  var signature="", facility="campfire", picking=false;
  function el(id){return document.getElementById(id);}
  function label(k){return k==="gold"?"골드":DATA.camp.materials[k];}
  function amounts(values,unit){return Object.keys(values).map(function(k){return label(k)+' '+UI.fmt(values[k])+(unit||'');}).join(' · ');}
  function produced(values){var out={};Object.keys(values).forEach(function(k){if(values[k]>=.01)out[k]=values[k];});return amounts(out);}
  function openFacility(id){facility=id;picking=false;UI.openSheet('facility');}
  function effect(id,level) {
    if(id==='campfire')return '시설 레벨 상한 '+UI.fmt(level)+' · 추가 파티 슬롯 '+UI.fmt((level>=3?1:0)+(level>=5?1:0))+' (최대 '+UI.fmt(5)+'마리)';
    if(id==='pen')return '몬스터 보유 한도 '+UI.fmt(DATA.camp.rosterCaps[level-1])+'마리';
    if(id==='workshop')return '강화 비용 −'+UI.fmt(level*5)+'% · 기본 강화석 '+UI.fmt(level*DATA.camp.workshopPassive)+'/시간';
    if(id==='altar')return '진화 등급 상승 '+UI.fmt(15+level*2)+'% · 포획률 ×'+UI.fmt(1+level*.03);
    if(id==='storehouse')return '오프라인 수확 최대 '+UI.fmt(DATA.camp.offlineHours[level-1])+'시간';
    return '생산 배치 '+UI.fmt(DATA.camp.productionSlots[level-1])+'칸 · 광산/돌 나르기는 돌, 나머지는 나무';
  }
  UI.initCamp=function(){
    var section=document.createElement('section');section.id='camp-screen';section.hidden=true;
    section.innerHTML='<div id="camp-materials" class="camp-materials" aria-label="캠프 재료"></div>'+
      '<div class="camp-heading"><div><p class="eyebrow">호숫가의 작은 안식처</p><h2>우리의 캠프 <small id="camp-level"></small></h2></div><button id="camp-center" class="icon-button" aria-label="모닥불로 이동">'+UI.icon('camp')+'</button></div>'+
      '<p class="camp-hint">옆으로 둘러보고, 시설을 눌러 동료를 배치하세요.</p>'+
      '<div id="camp-scroll" tabindex="0" role="region" aria-label="가로로 둘러보는 캠프"><div id="camp-scene"><div id="camp-stations"></div><div id="camp-residents"></div></div></div>'+
      '<div class="camp-harvest panel"><div><h3>동료들이 모은 선물</h3><p id="camp-accrued"></p><p id="camp-rate"></p></div><button id="collect-camp" class="primary">수확</button></div>';
    document.querySelector('.adventure').before(section);
    el('camp-center').onclick=UI.centerCamp;
    el('collect-camp').onclick=function(){var r=Game.collect();if(r)UI.toast(amounts(r)+' 수확');};
  };
  UI.centerCamp=function(){var scroll=el('camp-scroll');scroll.scrollLeft=(scroll.scrollWidth-scroll.clientWidth)/2;};
  UI.showCamp=function(visible){
    UI.campVisible=visible;el('app').classList.toggle('camp-open',visible);el('camp-screen').hidden=!visible;
    document.querySelectorAll('[data-tab]').forEach(function(b){b.classList.toggle('selected',b.dataset.tab===(visible?'camp':'adventure'));});
    if(visible){Game.collect();UI.updateCamp(Game.getState());requestAnimationFrame(UI.centerCamp);}
  };
  UI.updateCamp=function(s){
    el('camp-materials').innerHTML=Object.keys(DATA.camp.materials).map(function(k){return '<span>'+UI.icon(k)+'<span>'+label(k)+'<b>'+UI.fmt(s.materials[k])+'</b></span></span>';}).join('');
    el('camp-level').textContent='Lv. '+UI.fmt(s.camp.levels.campfire);
    var accrued=Game.campAccrued(),rates=Game.campRates();
    el('camp-accrued').textContent=produced(accrued)||'조금씩 선물을 모으고 있어요.';
    el('camp-rate').textContent='시간당 '+produced(rates);
    el('collect-camp').disabled=s.pendingReport!==null || !Object.values(accrued).some(function(n){return n>=1;});
    var idle=Game.idleMonsters();
    el('camp-scroll').setAttribute('aria-label','가로로 둘러보는 캠프 · 쉬는 동료 '+UI.fmt(idle.length)+' · 일하는 동료 '+UI.fmt(s.roster.filter(function(m){return m.camp!==null;}).length));
    var next=JSON.stringify([s.camp.levels,s.roster.map(function(m){return [m.uid,m.speciesId,m.camp,m.party];}),idle.map(function(m){return m.uid;})]);
    if(signature===next)return;signature=next;
    el('camp-stations').innerHTML=Object.keys(DATA.camp.facilities).map(function(id){var f=DATA.camp.facilities[id];return '<button class="camp-station" data-facility="'+id+'" style="left:'+f.x+'%;top:'+f.y+'%" aria-label="'+f.name+' Lv. '+UI.fmt(s.camp.levels[id])+'"><img src="'+f.art+'" alt="'+f.name+'"><span>'+f.name+' <small>Lv. '+UI.fmt(s.camp.levels[id])+'</small></span></button>';}).join('');
    el('camp-stations').querySelectorAll('[data-facility]').forEach(function(b){b.onclick=function(){openFacility(b.dataset.facility);};});
    var placed=s.roster.filter(function(m){return m.camp!==null;});
    el('camp-residents').innerHTML=placed.map(function(m){var f=DATA.camp.facilities[m.camp],i=placed.filter(function(n){return n.camp===m.camp;}).findIndex(function(n){return n.uid===m.uid;});
      return '<button class="camp-resident assigned" data-resident="'+m.camp+'" style="left:calc('+f.x+'% + '+((i%3-1)*36)+'px);top:calc('+f.y+'% + '+(85+Math.floor(i/3)*18)+'px)" aria-label="'+DATA.species[m.speciesId].name+' · '+f.name+' 배치 중"><img src="'+DATA.species[m.speciesId].art+'" alt=""></button>';
    }).join('')+idle.map(function(m,i){
      // DECISION: Decorative paths derive from roster order, without consuming gameplay RNG.
      return '<span class="camp-resident wandering" style="left:'+(8+(i*17)%58)+'%;top:'+(34+(i*13)%37)+'%;--walk:'+(75+(i%4)*24)+'px;--duration:'+(26+i%7*4)+'s;animation-delay:-'+(i%11)+'s"><img src="'+DATA.species[m.speciesId].art+'" alt="'+DATA.species[m.speciesId].name+' · 쉬는 중"></span>';
    }).join('');
    el('camp-residents').querySelectorAll('[data-resident]').forEach(function(b){b.onclick=function(){openFacility(b.dataset.resident);};});
  };
  UI.renderCampSheet=function(s){
    var f=DATA.camp.facilities[facility],level=s.camp.levels[facility],content=el('sheet-content');
    el('sheet-title').textContent=f.name+' · Lv. '+UI.fmt(level);
    if(picking){
      var idle=Game.idleMonsters().sort(function(a,b){return Number(Game.campJob(b,facility).match)-Number(Game.campJob(a,facility).match);});
      content.innerHTML='<button id="camp-pick-back" class="back-button">시설로 돌아가기</button><p class="detail-note">쉬는 동료를 선택하세요. ✦ 직업이 맞으면 생산량 ×'+UI.fmt(2)+'<br>파티에서 해제한 동료는 다음 전투부터 배치할 수 있습니다.</p><div class="camp-picker">'+idle.map(function(m){var j=Game.campJob(m,facility);return '<button data-assign="'+m.uid+'"><img src="'+DATA.species[m.speciesId].art+'" alt=""><span><strong>'+DATA.species[m.speciesId].name+'</strong><small>Lv. '+UI.fmt(m.level)+' · '+DATA.species[m.speciesId].campJob+(j.match?' <b class="job-match">✦</b>':'')+'</small><small>'+label(j.resource)+' '+UI.fmt(j.rateTenths/10)+'/시간</small></span></button>';}).join('')+'</div>'+(idle.length?'':'<p class="detail-note">배치할 동료가 없습니다. 탐험에서 새 동료를 만나 보세요.</p>');
      el('camp-pick-back').onclick=function(){picking=false;UI.refreshSheet();};
      content.querySelectorAll('[data-assign]').forEach(function(b){b.onclick=function(){picking=false;if(Game.assign(b.dataset.assign,facility))UI.toast('동료가 일을 시작합니다.');UI.refreshSheet();};});return;
    }
    var cost=Game.campBuildCost(facility), assigned=s.roster.filter(function(m){return m.camp===facility;});
    content.innerHTML='<div class="facility-summary"><img src="'+f.art+'" alt="'+f.name+'"><div><p>'+effect(facility,level)+'</p><p class="detail-note">잘 맞는 직업 · '+f.jobs.join(' / ')+'</p></div></div>'+
      '<section class="trait-list"><h3>'+(cost?'다음 레벨 · Lv. '+UI.fmt(level+1):'최고 레벨')+'</h3>'+(cost?'<p>'+effect(facility,level+1)+'</p><p id="camp-cost">'+amounts(cost)+'</p>':'')+
      '<button id="build-facility"'+(!Game.canBuild(facility)?' disabled':'')+'>'+(cost?'즉시 업그레이드':'완성된 시설')+'</button>'+(cost&&facility!=='campfire'&&level>=s.camp.levels.campfire?'<p>모닥불을 먼저 Lv. '+UI.fmt(level+1)+'로 올려 주세요.</p>':cost&&!Game.canBuild(facility)?'<p>재료를 더 모아 주세요.</p>':'')+'</section>'+
      '<h3>함께 일하는 동료 · '+UI.fmt(assigned.length)+' / '+UI.fmt(Game.campSlots(facility))+'</h3><div class="camp-slots">'+Array.from({length:Game.campSlots(facility)},function(_,i){var m=assigned[i];
        if(!m)return '<button data-empty-slot="'+i+'" class="empty-slot">'+UI.icon('paw')+'<span>동료 배치</span></button>';
        var j=Game.campJob(m,facility);return '<button data-unassign="'+m.uid+'"><img src="'+DATA.species[m.speciesId].art+'" alt=""><strong>'+DATA.species[m.speciesId].name+(j.match?' <b class="job-match">✦</b>':'')+'</strong><small>'+label(j.resource)+' '+UI.fmt(j.rateTenths/10)+'/시간</small><small>눌러서 배치 해제</small></button>';
      }).join('')+'</div><p class="detail-note">레벨이 높을수록 더 많이 생산합니다. 직업 일치 ✦ ×'+UI.fmt(2)+'<br>배치 중인 동료는 편성·진화·방생에서 보호됩니다.</p>';
    el('build-facility').onclick=function(){if(Game.build(facility))UI.toast(f.name+' Lv. '+UI.fmt(level+1));};
    content.querySelectorAll('[data-empty-slot]').forEach(function(b){b.onclick=function(){picking=true;UI.refreshSheet();};});
    content.querySelectorAll('[data-unassign]').forEach(function(b){b.onclick=function(){Game.unassign(b.dataset.unassign);};});
  };
})();
