"use strict";
(function () {
  UI.renderSaveControls=function() {
    var content=document.getElementById('sheet-content');
    content.innerHTML='<p class="sheet-intro">진행 상황은 자동으로 저장됩니다.</p><dl class="settings-info"><div><dt>버전</dt><dd>'+DATA.version+'</dd></div><div><dt>저장 형식</dt><dd>'+UI.fmt(DATA.schemaVersion)+'</dd></div><div><dt>오프라인 수확 상한</dt><dd>'+UI.fmt(DATA.offline.maxMs/3600000)+'시간</dd></div></dl><div class="save-controls"><button id="export-save">저장 내보내기</button><label for="save-json">저장 데이터</label><textarea id="save-json" spellcheck="false" placeholder="내보낸 저장 데이터를 보관하거나 여기에 붙여 넣으세요."></textarea><button id="copy-save">클립보드에 복사</button><button id="import-save">저장 가져오기</button><p class="sheet-intro" id="import-status" role="status"></p></div><div class="reset-panel"><h3>새로운 탐험</h3><p>모든 몬스터와 진행 상황을 초기화합니다.</p><button id="reset-game" class="danger-button">게임 초기화</button></div>';
    document.getElementById('export-save').onclick=function(){document.getElementById('save-json').value=Game.exportSave();};
    document.getElementById('copy-save').onclick=async function(){
      var field=document.getElementById('save-json');if(!field.value)field.value=Game.exportSave();
      try { await navigator.clipboard.writeText(field.value);UI.toast('저장을 복사했습니다.'); }
      catch(_){field.focus();field.select();UI.toast('선택한 저장 데이터를 직접 복사해 주세요.');}
    };
    document.getElementById('import-save').onclick=function(){
      var source=document.getElementById('save-json').value;
      if(!Game.validateSave(source)){document.getElementById('import-status').textContent='유효한 몬스터 조련단 저장이 아닙니다. 이전 용병단 저장은 호환되지 않습니다.';return;}
      if(window.confirm('현재 진행을 이 저장 데이터로 교체할까요?')){
        if(Game.importSave(source)){document.getElementById('sheet').close();UI.toast('저장을 가져왔습니다.');}
      }
    };
    document.getElementById('reset-game').onclick=function(){
      if(window.confirm('모든 몬스터와 진행 상황을 초기화할까요?')){Game.reset();document.getElementById('sheet').close();}
    };
  };
  UI.initExpedition=function() {
    var dialog=document.getElementById('offline-report'), frame=0, phase=0;
    function revealAll() { cancelAnimationFrame(frame);phase=3;dialog.classList.add('sack-open','show-materials','show-accessories','show-monsters');document.getElementById('harvest-report').textContent='모두 수확하기'; }
    function openSack() {
      phase=1;dialog.classList.add('sack-open');document.getElementById('harvest-report').textContent='탭하여 건너뛰기';
      var started=performance.now();
      function advance(now) {
        var elapsed=now-started;
        if(elapsed>=400)dialog.classList.add('show-materials');
        if(elapsed>=800)dialog.classList.add('show-accessories');
        if(elapsed>=1200)dialog.classList.add('show-monsters');
        if(elapsed>=1600)revealAll();else frame=requestAnimationFrame(advance);
      }
      frame=requestAnimationFrame(advance);
    }
    Game.on('offlineReport',function(report){
      var minutes=Math.floor(report.elapsedMs/60000);
      document.getElementById('report-time').textContent=UI.fmt(minutes)+'분 동안 · '+UI.stageLabel(report.stageIndex)+' 탐험';
      cancelAnimationFrame(frame);phase=0;dialog.className='';document.getElementById('harvest-report').textContent='자루를 푼다';
      document.getElementById('report-rewards').innerHTML='<span>골드 <strong>'+UI.fmt(report.gold)+'</strong></span><span>경험치 <strong>'+UI.fmt(report.xp)+'</strong></span><span>강화석 <strong>'+UI.fmt(report.materials.enhanceStone)+'</strong></span>';
      var items=document.getElementById('report-accessories');
      if(!items){items=document.createElement('div');items.id='report-accessories';document.getElementById('report-monsters').before(items);}
      var room=DATA.accessory.cap-Game.getState().accessories.length,overflow=report.accessories.slice(room);
      items.innerHTML='<h3>장신구 · '+UI.fmt(report.accessories.length)+'</h3>'+(overflow.length?'<p class="detail-note">보관 한도를 넘는 '+UI.fmt(overflow.length)+'개는 '+UI.fmt(overflow.reduce(function(sum,a){return sum+DATA.accessoryGold[DATA.rarityOrder.indexOf(a.rarity)];},0))+' 골드로 수확됩니다.</p>':'')+report.accessories.map(UI.accessoryCard).join('');
      document.getElementById('report-monsters').innerHTML=report.monsters.length?report.monsters.map(function(m,i){
        return UI.monsterCard(m,false);
      }).join(''):'<p class="sheet-intro">이번 자루에는 새로운 동료가 없어요.</p>';
      if(!dialog.open)dialog.showModal();
    });
    document.getElementById('harvest-report').onclick=function(){
      if(phase===0){openSack();return;}if(phase===1){revealAll();return;}
      Game.harvest();dialog.close();document.getElementById('app').appendChild(document.getElementById('toast'));
    };
    dialog.addEventListener('click',function(e){if(phase===1 && !e.target.closest('button'))revealAll();});
    dialog.addEventListener('cancel',function(e){e.preventDefault();document.getElementById('harvest-report').click();});
  };
})();
