"use strict";
(function(){
  var tip, skip, highlight=null, step=null, frame=0;
  var copy={
    1:['자동으로 함께 싸워요','동료들이 알아서 전투하고, 구역을 클리어하면 다음으로 나아가요.'],
    2:['포획 준비','적의 HP가 30% 미만이면 조련사가 랜턴으로 포획해요. 새 동료를 기다려 보세요.'],
    3:['몬스터 탭에서 파티 편성','동료 카드를 누른 뒤 파티 편성을 선택하세요. 가득 찼다면 다른 동료를 먼저 해제해요.'],
    4:['같은 종 세 마리, 새로운 모습','같은 종·단계가 3마리 모였어요. 몬스터 탭의 진화에서 더 강한 동료로 합쳐 보세요.'],
    5:['텃밭에 동료를 배치해요','텃밭·광산을 누르고 빈 배치 칸을 선택하세요. 파티 밖의 동료가 재료를 모아 줘요.'],
    6:['앱을 꺼도 자루가 쌓여요','자리를 비운 동안 탐험과 캠프 선물이 쌓여요. 돌아오면 자루를 풀어 수확하세요. 창고에서 최대 시간을 늘릴 수 있어요.']
  };
  function anchor(n){
    var sheet=document.getElementById('sheet');
    if(document.getElementById('offline-report').open)return document.getElementById('harvest-report');
    if(document.getElementById('evolution-reveal').open)return document.getElementById('close-evolution');
    if(sheet.open){
      if(n===3)return document.getElementById('toggle-party') || document.querySelector('[data-monster]') || document.getElementById('close-sheet');
      if(n===4)return document.getElementById('open-evolution') || document.getElementById('auto-evolve') || document.getElementById('close-sheet');
      if(n===5)return document.querySelector('[data-empty-slot], [data-assign]') || document.getElementById('close-sheet');
      return document.getElementById('close-sheet');
    }
    if(n===1)return UI.campVisible?document.querySelector('[data-tab="adventure"]'):document.getElementById('scene-wrap');
    if(n===2)return UI.campVisible?document.querySelector('[data-tab="adventure"]'):document.querySelector('.capture-status');
    if(n===3 || n===4)return document.querySelector('[data-tab="monsters"]');
    if(n===5)return UI.campVisible?document.querySelector('[data-facility="garden"]'):document.querySelector('[data-tab="camp"]');
    return UI.campVisible?document.getElementById('camp-accrued'):document.querySelector('.save-line');
  }
  function render(){
    frame=0;var n=Game.onboardingStep();
    if(highlight)highlight.classList.remove('onboarding-target');highlight=null;
    var surface=document.querySelector('#evolution-reveal[open], #offline-report[open]') || document.querySelector('#sheet[open]') || document.getElementById('app');
    if(skip.parentNode!==surface)surface.appendChild(skip);
    skip.hidden=!!n || Game.getState().onboarding.completedSteps.length===6;
    tip.hidden=!n;if(!n){step=null;return;}
    if(step!==n){step=n;tip.querySelector('strong').textContent=copy[n][0];tip.querySelector('p').textContent=copy[n][1];tip.querySelector('small').textContent=UI.fmt(n)+' / '+UI.fmt(6);}
    var target=anchor(n);if(!target)return;
    surface=target.closest('dialog') || document.getElementById('app');if(tip.parentNode!==surface)surface.appendChild(tip);
    highlight=target;target.classList.add('onboarding-target');
    var r=target.getBoundingClientRect(), app=document.getElementById('app').getBoundingClientRect();
    // DECISION: Camp's internal panorama scrolls only when its garden guide first becomes active.
    if(n===5 && UI.campVisible && !target.closest('dialog') && (r.left<app.left || r.right>app.right)){
      var scroll=document.getElementById('camp-scroll');scroll.scrollLeft+=r.left-app.left-(app.width-r.width)/2;r=target.getBoundingClientRect();
    }
    var width=Math.min(304,app.width-24);tip.style.width=width+'px';
    var height=tip.offsetHeight, left=Math.max(app.left+12,Math.min(r.left+(r.width-width)/2,app.right-width-12));
    var top=r.top-height-12;if(top<12)top=r.bottom+12;
    tip.style.left=left+'px';tip.style.top=Math.max(12,Math.min(top,innerHeight-height-12))+'px';
    tip.dataset.step=n;
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render);}
  UI.initOnboarding=function(){
    tip=document.createElement('aside');tip.id='onboarding-tip';tip.hidden=true;tip.setAttribute('aria-live','polite');
    tip.innerHTML='<small></small><strong></strong><p></p><div><button id="onboarding-skip" class="back-button">건너뛰기</button><button id="onboarding-next">알겠어요</button></div>';
    document.getElementById('app').appendChild(tip);
    function start(){if(!document.hidden)Game.resume();}
    tip.querySelector('#onboarding-next').onclick=function(){Game.completeOnboarding(step);start();};
    tip.querySelector('#onboarding-skip').onclick=function(){Game.skipOnboarding();start();};
    skip=document.createElement('button');skip.id='onboarding-wait-skip';skip.textContent='안내 건너뛰기';skip.hidden=true;
    skip.onclick=function(){Game.skipOnboarding();start();};document.getElementById('app').appendChild(skip);
    Game.on('update',schedule);Game.on('captureAttempt',schedule);Game.on('capture',schedule);
    document.addEventListener('click',schedule);document.addEventListener('close',schedule,true);
    document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);
  };
})();
