"use strict";
var UI = (function () {
  var svgNS = "http://www.w3.org/2000/svg", activeSheet = null, hiddenAt = null, sheetSignature = "", latestState;
  var titles = { monsters: "몬스터", dex: "도감", settings: "설정" };
  function el(id) { return document.getElementById(id); }
  function fmt(n) {
    if (!Number.isFinite(n)) return "0";
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return n.toLocaleString("ko-KR", { maximumFractionDigits: abs < 10 ? 2 : 1 });
  }
  function stageLabel(index) { return fmt(Math.floor(index / 10) + 1) + "-" + fmt(index % 10 + 1); }
  function svgNode(tag, attrs, content) {
    var node = document.createElementNS(svgNS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function position(unit, index, count) {
    if (unit.side === "party") {
      // DECISION: Tanks occupy the front column; five allies use staggered rows, leaving the tamer visible.
      if (count <= 2) return { x: index === 0 ? 163 : 112, y: index === 0 ? 240 : 258 };
      return [{ x:173,y:205 },{ x:170,y:270 },{ x:116,y:164 },{ x:112,y:227 },{ x:116,y:290 }][index];
    }
    if (unit.boss) return { x:282,y:246 };
    return [{ x:250,y:226 },{ x:315,y:195 },{ x:308,y:284 }][index];
  }
  function drawUnit(unit, index, count) {
    var p = position(unit, index, count), size = unit.boss ? 105 : unit.side === "party" ? 62 : 72;
    size *= unit.evo === 3 ? 1.3 : unit.evo === 2 ? 1.15 : 1;
    var group = svgNode("g", { id: "sprite-" + unit.id, transform: "translate(" + p.x + " " + p.y + ")",
      "data-x":p.x,"data-y":p.y, class:"unit " + unit.side });
    group.appendChild(svgNode("ellipse", { cx:0,cy:0,rx:size*.29,ry:4,fill:"#DCCFD8",opacity:.6 }));
    var body = svgNode("g", { class:"unit-body" }), art = svgNode("g", { class:unit.evo > 1 ? "evolved-rim" : "", transform:unit.side === "party" ? "scale(-1 1)" : "scale(1 1)" });
    art.appendChild(svgNode("image", { href:DATA.species[unit.speciesId].art,x:-size/2,y:-size*.92,width:size,height:size }));
    body.appendChild(art); group.appendChild(body);
    group.appendChild(svgNode("rect", { x:-20,y:7,width:40,height:3,rx:1.5,fill:"#FEF4E7" }));
    group.appendChild(svgNode("rect", { x:-20,y:7,width:40*unit.hp/unit.maxHp,height:3,rx:1.5,
      fill:unit.side === "enemy" ? "#DAC0BB" : "#B7CDA8",class:"hp-fill" }));
    group.classList.toggle("fallen",unit.hp<=0); group.classList.toggle("captured",!!unit.captured);
    return group;
  }
  function drawScene(state, clearEffects) {
    UI.sceneBackground(DATA.stages[state.currentStage].region);
    if (clearEffects) el("effect-layer").replaceChildren();
    el("party-layer").replaceChildren(); el("enemy-layer").replaceChildren();
    state.battle.units.forEach(function (u,i) { el("party-layer").appendChild(drawUnit(u,i,state.battle.units.length)); });
    state.battle.enemies.forEach(function (u,i) { el("enemy-layer").appendChild(drawUnit(u,i,state.battle.enemies.length)); });
  }
  function animate(node, name) {
    node.classList.remove(name); void node.getBoundingClientRect(); node.classList.add(name);
  }
  function hit(event) {
    var target = el("sprite-" + event.targetId); if (!target) return;
    animate(target.querySelector(".unit-body"),"hit-flash");
    var text = svgNode("text", { x:target.dataset.x,y:Number(target.dataset.y)-60,"text-anchor":"middle",class:"damage-number" },fmt(event.amount));
    el("effect-layer").appendChild(text); text.addEventListener("animationend",function () { text.remove(); },{once:true});
  }
  function death(event) { var target=el("sprite-"+event.id); if(target) target.classList.add("fallen"); }
  function toast(message) {
    var surface=document.querySelector("#offline-report[open]") || document.querySelector("#sheet[open]") || el("app");
    surface.appendChild(el("toast")); el("toast").textContent=message; animate(el("toast"),"visible");
  }
  function update(state) {
    latestState=state; var stage=DATA.stages[state.currentStage], region=DATA.regions[stage.region], rank=Game.getRank();
    var remaining=Math.max(0,stage.timeLimit-state.battle.ticks/10);
    el("cp").textContent=fmt(Game.getCP()); el("gold").textContent=fmt(state.gold); el("rank").textContent=fmt(rank);
    var base=DATA.rankXP[rank-1], next=DATA.rankXP[rank];
    el("rank-xp").textContent=next === undefined ? "최고 랭크" : fmt(state.tamerXP-base)+" / "+fmt(next-base);
    el("rank-fill").style.width=(next === undefined ? 100 : (state.tamerXP-base)/(next-base)*100)+"%";
    el("region-name").textContent=region.name; el("region-subtitle").textContent=region.subtitle;
    el("stage-id").textContent=stageLabel(state.currentStage); el("stage-name").textContent=stage.name;
    el("timer").textContent=fmt(Math.ceil(remaining))+"초"; el("time-fill").style.width=remaining/stage.timeLimit*100+"%";
    el("wave-label").textContent=stage.boss && state.battle.waveIndex===2 ? "수호자" : "웨이브 "+fmt(state.battle.waveIndex+1)+" / "+fmt(3);
    el("selected-stage").textContent=stageLabel(state.currentStage);
    el("previous-stage").disabled=!state.unlockedStages.includes(state.currentStage-1);
    el("next-stage").disabled=!state.unlockedStages.includes(state.currentStage+1);
    ["repeat","challenge"].forEach(function (mode) { el(mode+"-mode").classList.toggle("active",state.mode===mode); el(mode+"-mode").setAttribute("aria-pressed",String(state.mode===mode)); });
    el("mode-hint").textContent=state.mode==="repeat" ? "이곳에서 동료를 만나고 함께 성장합니다" : "클리어하면 다음 구역으로 나아갑니다";
    el("gold-rate").textContent=fmt(state.stats.goldPerSec);
    var t=state.battle.tamer, full=state.roster.length>=DATA.rosterCap;
    el("capture-status").textContent=full ? "보유 한도 도달 · "+fmt(DATA.rosterCap)+"마리" : t.captureCooldown>0 ? "포획 준비 중 · "+fmt(Math.ceil(t.captureCooldown))+"초" : "HP "+fmt(30)+"% 미만이면 자동 포획";
    el("tamer-skills").innerHTML=DATA.tamerSkills.map(function(s) { return '<span>'+s.name+'<small>'+(s.id==="captureBoost" && t.captureBoost>1 ? "다음 포획 강화" : t.cooldowns[s.id]>0 ? fmt(Math.ceil(t.cooldowns[s.id]))+"초" : "준비됨")+'</small></span>'; }).join("");
    el("battle-result").classList.toggle("shown",state.battle.status!=="fighting");
    el("battle-result").innerHTML=state.battle.status==="clear" ? "<strong>구역 탐험 완료</strong><small>다음 인연을 찾아 떠납니다</small>" : "<strong>잠시 숨을 고릅니다</strong><small>체력을 회복하고 다시 도전합니다</small>";
    state.battle.units.concat(state.battle.enemies).forEach(function(u) {
      var sprite=el("sprite-"+u.id); if(!sprite)return;
      sprite.querySelector(".hp-fill").setAttribute("width",40*u.hp/u.maxHp); sprite.classList.toggle("fallen",u.hp<=0); sprite.classList.toggle("captured",!!u.captured);
    });
    el("squad-strip").innerHTML=state.roster.filter(function(m){return m.party!==null;}).sort(function(a,b){return a.party-b.party;}).map(function(m){
      return '<div class="squad-member"><img src="'+DATA.species[m.speciesId].art+'" alt="'+DATA.species[m.speciesId].name+'"><span><small>Lv. '+fmt(m.level)+'</small></span></div>';
    }).join("")+ '<span class="squad-member"><span>파티<small>'+fmt(state.roster.filter(function(m){return m.party!==null;}).length)+' / '+fmt(Game.partySlots())+'</small></span></span>';
    if(activeSheet)renderSheet(state);
  }
  function renderSheet(state) {
    if(!activeSheet)return;
    var signature=activeSheet+(activeSheet==="settings" ? "" : JSON.stringify([state.roster,state.dex,state.accessories,state.materials,state.gold,state.coins,Game.getRank()]));
    if(signature===sheetSignature)return; sheetSignature=signature;
    el("sheet-title").textContent=titles[activeSheet];
    if(activeSheet==="monsters")UI.renderMonsters(state);
    if(activeSheet==="dex")UI.renderDex();
    if(activeSheet==="settings")UI.renderSaveControls();
  }
  function openSheet(name) {
    if(name==="adventure") { el("sheet").close(); return; }
    activeSheet=name; UI.selectedMonster=null; UI.monsterView=null; sheetSignature=""; renderSheet(Game.getState());
    if(!el("sheet").open)el("sheet").showModal();
    document.querySelectorAll("[data-tab]").forEach(function(b){b.classList.toggle("selected",b.dataset.tab===name);});
  }
  function setActive(active) {
    if(!active) { if(hiddenAt===null) { hiddenAt=Date.now(); Game.pause(); } }
    else if(hiddenAt!==null) { var elapsed=Math.max(0,Date.now()-hiddenAt); hiddenAt=null; Game.catchUp(elapsed); Game.resume(); }
  }
  function closeOverlay() {
    if(document.getElementById("evolution-reveal").open) { document.getElementById("close-evolution").click(); return true; }
    if(el("offline-report").open) { el("harvest-report").click(); return true; }
    if(el("sheet").open) { el("sheet").close(); return true; } return false;
  }
  function init() {
    document.querySelectorAll("[data-icon]").forEach(function(n){n.innerHTML=UI.icon(n.dataset.icon);});
    UI.initArt(); UI.initExpedition(); UI.initProgression();
    Game.on("update",update); Game.on("stageStart",function(s){drawScene(s,true);});
    Game.on("wave",function(){drawScene(Game.getState(),false);}); Game.on("hit",hit); Game.on("unitDeath",death);
    Game.on("rankUp",function(e){toast("조련사 랭크 "+fmt(e.rank)+" · 파티 "+fmt(e.slots)+"슬롯");});
    Game.on("storageError",function(e){el("save-status").textContent="저장 확인 필요";toast(e.message);});
    Game.on("saved",function(){el("save-status").textContent="저장됨";});
    el("previous-stage").onclick=function(){Game.selectStage(latestState.currentStage-1);};
    el("next-stage").onclick=function(){Game.selectStage(latestState.currentStage+1);};
    el("repeat-mode").onclick=function(){Game.setMode("repeat");}; el("challenge-mode").onclick=function(){Game.setMode("challenge");};
    document.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){openSheet(b.dataset.tab);};});
    el("close-sheet").onclick=function(){el("sheet").close();};
    el("sheet").addEventListener("close",function(){
      if(el("sheet").open)return; activeSheet=null; el("app").appendChild(el("toast"));
      document.querySelectorAll("[data-tab]").forEach(function(b){b.classList.toggle("selected",b.dataset.tab==="adventure");});
    });
    document.addEventListener("visibilitychange",function(){setActive(!document.hidden);});
    window.addEventListener("pagehide",function(){setActive(false);});
    window.addEventListener("pageshow",function(e){if(e.persisted&&!document.hidden)setActive(true);});
    Game.init(); if(!document.hidden)Game.resume(); else hiddenAt=Date.now(); UI.native.init();
  }
  return { fmt:fmt, init:init, openSheet:openSheet, toast:toast, setActive:setActive, closeOverlay:closeOverlay,
    svgNode:svgNode, animate:animate, stageLabel:stageLabel, refreshSheet:function(){sheetSignature="";renderSheet(Game.getState());} };
})();
