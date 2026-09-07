"use strict";

var UI = (function () {
  var svgNS = "http://www.w3.org/2000/svg";
  var activeSheet = null;
  var hiddenAt = null;
  var sheetSignature = "";
  var latestState;
  var titles = { mercenaries: "용병", equipment: "장비", fusion: "합성", skills: "스킬", settings: "설정" };
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
  function figure(type, color) {
    if (type === "warrior") return '<path d="M-18-39L-25-3 14-2 17-39" fill="#FF9F1C"/><path d="M-10-13l-3 15m23-15 4 15" stroke="#FFC93C" stroke-width="9"/><path d="M-17-45h30l8 28-36 3z" fill="' + color + '"/><path d="M-9-44l6 26 12-3 1-23" fill="#ede0b4" opacity=".6"/><circle cy="-57" r="12" fill="#d2b69a"/><path d="M-13-55v-8l13-8 13 8v8z" fill="#FFC93C"/><path d="M-11-60h22m-11-9v14" stroke="#e4e5c8" stroke-width="3"/><path d="M20-37l14-20" stroke="#ceb9a0" stroke-width="7"/><path d="M32-52l15-29 5 2-10 32z" fill="#dce9df"/><path d="M30-54l15 7" stroke="#bd924e" stroke-width="4"/><path d="M-24-37l17 5-2 23-12 7-13-12 1-21z" fill="#FF9F1C" stroke="#d6c3a0" stroke-width="2"/><path d="M-23-31v19m-6-10h13" stroke="#d6c3a0" stroke-width="2"/>';
    if (type === "archer") return '<path d="M-15-43l-9 41h30l8-41z" fill="#22C55E"/><path d="M-6-14l-3 17m14-17 3 17" stroke="#FFE9B8" stroke-width="6"/><path d="M-12-44h21l5 28-29-1z" fill="' + color + '"/><circle cy="-54" r="10" fill="#d5b9a0"/><path d="M-14-51q0-34 19-17l10 21-15-9z" fill="#3DDC97"/><path d="M-8-42l14 26" stroke="#bfa47a" stroke-width="4"/><path d="M5-36l20 5" stroke="#d5b9a0" stroke-width="6"/><path d="M23-59q30 27 0 50" fill="none" stroke="#cfad70" stroke-width="3"/><path d="M23-59v50m-12-24h30" stroke="#e6d6ac"/><path d="M40-36l6 3-6 3" fill="#e6d6ac"/>';
    if (type === "mage") return '<path d="M-11-44L-24 2h46L10-44z" fill="' + color + '"/><path d="M-4-36l-8 35h23L4-36z" fill="#A855F7"/><circle cy="-52" r="10" fill="#d5b9a0"/><path d="M-23-56L-7-82 13-58l12 7z" fill="#B388FF"/><path d="M-14-60l20 4" stroke="#d6bc81" stroke-width="3"/><path d="M9-35l16 3" stroke="#b7a0ee" stroke-width="7"/><path d="M27-57L23 2" stroke="#bfa77b" stroke-width="4"/><path d="M28-72l8 9-9 10-7-11z" fill="#d2ccfa"/><circle cx="27" cy="-63" r="14" fill="#b7a0ee" opacity=".15"/>';
    if (type === "slime") return '<path d="M-25-4q-4-24 11-31 9-12 19-2 22 3 23 28Q12 6-25-4" fill="' + color + '"/><ellipse cx="-10" cy="-27" rx="6" ry="3" fill="#eef5cf" opacity=".3"/><path d="M-12-17v5m15-5v5" stroke="#4A2C12" stroke-width="4"/><path d="M-7-6h8" stroke="#4A2C12" stroke-width="2"/>';
    if (type === "boss") return '<path d="M-23-15L-29 2m47-17 9 17" stroke="#FF9F1C" stroke-width="15"/><path d="M-32-56l-8 41 28 9 40-6 8-39-29-19z" fill="' + color + '"/><path d="M-26-54l-16-23m62 25 19-24" stroke="' + color + '" stroke-width="10"/><path d="M-16-52l10 4m13 0 10-4" stroke="#fbe0a2" stroke-width="5"/><path d="M-3-35l-9 21h22L4-37" fill="#3DDC97"/><path d="M-38-39l-15 21m84-20 17 19" stroke="' + color + '" stroke-width="12"/>';
    return '<path d="M-9-17l-6 20m22-20 7 20" stroke="#3DDC97" stroke-width="7"/><path d="M-17-42h30l7 28-39 2z" fill="' + color + '"/><path d="M-13-58l-15-6 8 17m29-12 17-6-8 19" fill="' + color + '"/><ellipse cy="-49" rx="17" ry="14" fill="' + color + '"/><path d="M-11-50l7 2m8 0 7-2" stroke="#4A2C12" stroke-width="3"/><path d="M-7-41h12" stroke="#f1dbb2" stroke-width="3"/><path d="M-20-31l-10 11" stroke="' + color + '" stroke-width="7"/><path d="M-31-39v39" stroke="#8A6A4A" stroke-width="5"/><path d="M-38-41h13l4 12-16 2z" fill="#FFC93C"/>';
  }
  function position(unit) {
    if (unit.side === "mercenary") return [{ x: 143, y: 236 }, { x: 91, y: 255 }, { x: 47, y: 224 }][unit.position];
    if (unit.type === "boss") return { x: 284, y: 245 };
    return [{ x: 252, y: 242 }, { x: 313, y: 216 }, { x: 335, y: 271 }, { x: 274, y: 289 }][unit.position];
  }
  function drawUnit(unit, color, locked) {
    var p = position(unit);
    var group = svgNode("g", { id: "sprite-" + unit.id, transform: "translate(" + p.x + " " + p.y + ")",
      "data-x": p.x, "data-y": p.y, class: "unit " + (locked ? "locked-unit" : unit.side) });
    group.appendChild(svgNode("ellipse", { cx: 0, cy: 4, rx: unit.type === "boss" ? 40 : 25, ry: 7, fill: "#4A2C12", opacity: ".4" }));
    var body = svgNode("g", { class: "unit-body" });
    var fallback = svgNode("g", { class: "asset-fallback", transform: unit.type === "boss" ? "scale(1.6)" : "scale(1.15)" });
    fallback.innerHTML = figure(unit.type, color); body.appendChild(fallback);
    var region = DATA.stages[Game.getState().currentStage].region;
    var key = unit.side === "mercenary" ? "merc." + unit.type + ".idle" : "mon." + UI.artRegion(region).monsters[unit.type];
    UI.spriteImage(body, key, unit.type === "boss" ? 140 : 96);
    body.addEventListener("animationend", function (event) {
      if (event.target === body) body.classList.remove("lunge-left", "lunge-right", "hit-flash");
    });
    group.appendChild(body);
    if (!locked) {
      group.appendChild(svgNode("rect", { x: -22, y: 13, width: 44, height: 4, rx: 2, fill: "#FFE9B8" }));
      group.appendChild(svgNode("rect", { x: -22, y: 13, width: 44 * unit.hp / unit.maxHp, height: 4, rx: 2,
        fill: unit.side === "enemy" ? "#FF6B6B" : "#5CE07A", class: "hp-fill" }));
    } else group.appendChild(svgNode("text", { x: 0, y: 20, "text-anchor": "middle", class: "locked-label" }, "미합류"));
    if (unit.hp <= 0 && !locked) group.classList.add("fallen");
    return group;
  }
  function drawScene(state, clearEffects) {
    UI.sceneBackground(DATA.stages[state.currentStage].region);
    if (clearEffects) el("effect-layer").replaceChildren();
    el("mercenary-layer").replaceChildren();
    el("enemy-layer").replaceChildren();
    DATA.mercenaries.slice().reverse().forEach(function (merc) {
      var unit = state.battle.units.find(function (u) { return u.id === merc.id; });
      el("mercenary-layer").appendChild(drawUnit(unit || { id: merc.id, type: merc.id, side: "mercenary", position: merc.position }, merc.color, !unit));
    });
    state.battle.enemies.forEach(function (unit) { el("enemy-layer").appendChild(drawUnit(unit, DATA.stages[state.currentStage].palette[unit.type], false)); });
  }
  function animate(node, name) {
    node.classList.remove(name);
    void node.getBoundingClientRect();
    node.classList.add(name);
  }
  function hit(event) {
    var attacker = el("sprite-" + event.attackerId);
    var target = el("sprite-" + event.targetId);
    if (attacker) { UI.attackSprite(attacker); animate(attacker.querySelector(".unit-body"), event.side === "enemy" ? "lunge-left" : "lunge-right"); }
    if (!target) return;
    animate(target.querySelector(".unit-body"), "hit-flash");
    var text = svgNode("text", { x: target.dataset.x, y: Number(target.dataset.y) - 78,
      "text-anchor": "middle", class: "damage-number " + (event.crit ? "critical" : event.side === "enemy" ? "incoming" : "") },
    (event.crit ? "✦ " : "") + fmt(event.amount));
    el("effect-layer").appendChild(text);
    text.addEventListener("animationend", function () { text.remove(); }, { once: true });
  }
  function death(event) {
    var target = el("sprite-" + event.id);
    if (!target) return;
    var ghost = target.cloneNode(true);
    ghost.removeAttribute("id");
    ghost.classList.add("death-fade");
    el("effect-layer").appendChild(ghost);
    target.classList.add("fallen");
    ghost.addEventListener("animationend", function (e) { if (e.target === ghost) ghost.remove(); });
  }
  function toast(message) {
    var surface = document.querySelector("#offline-report[open]") || document.querySelector("#fusion-reveal[open]") || document.querySelector("#sheet[open]") || el("app");
    surface.appendChild(el("toast"));
    el("toast").textContent = message;
    animate(el("toast"), "visible");
  }
  function update(state) {
    latestState = state;
    var stage = DATA.stages[state.currentStage];
    var remaining = Math.max(0, stage.timeLimit - state.battle.ticks / 10);
    if (UI.updateCP) UI.updateCP(Game.getCP());
    else el("cp").textContent = fmt(Game.getCP());
    UI.countUp("gold", state.gold);
    UI.countUp("coins", state.squadCoins);
    el("region-name").textContent = UI.artRegion(stage.region).name;
    el("region-subtitle").textContent = UI.artRegion(stage.region).subtitle;
    el("stage-id").textContent = stageLabel(state.currentStage);
    el("stage-name").textContent = UI.artRegion(stage.region).stages?.[state.currentStage % 10] || stage.name;
    el("timer").innerHTML = fmt(Math.ceil(remaining)) + "<small>초</small>";
    el("timer").classList.toggle("urgent", remaining <= 10);
    el("time-fill").style.width = (remaining / stage.timeLimit * 100) + "%";
    el("wave-label").textContent = stage.boss && state.battle.waveIndex === 2 ? "보스 · " + UI.artRegion(stage.region).bossName : "웨이브 " + fmt(state.battle.waveIndex + 1) + " / " + fmt(stage.waves.length);
    el("selected-stage").textContent = (state.difficulty === "chaos" ? "카오스 " : "") + stageLabel(state.currentStage);
    var unlocks = state.difficulty === "chaos" ? state.chaosUnlockedStages : state.unlockedStages;
    el("previous-stage").disabled = !unlocks.includes(state.currentStage - 1);
    el("next-stage").disabled = !unlocks.includes(state.currentStage + 1);
    if (UI.updateExpedition) UI.updateExpedition(state);
    ["repeat", "challenge"].forEach(function (mode) {
      el(mode + "-mode").classList.toggle("active", state.mode === mode);
      el(mode + "-mode").setAttribute("aria-pressed", String(state.mode === mode));
    });
    el("mode-hint").textContent = state.mode === "repeat" ? "현재 스테이지에서 전투와 성장을 반복합니다" : "클리어하면 다음 스테이지로 나아갑니다";
    el("gold-rate").textContent = fmt(state.stats.goldPerSec);
    el("kill-rate").textContent = fmt(state.stats.killsPerSec);
    var result = el("battle-result");
    result.classList.toggle("shown", state.battle.status !== "fighting");
    result.classList.toggle("failed", state.battle.status === "fail");
    result.innerHTML = state.battle.status === "clear" ? "<span>✦</span><strong>스테이지 클리어</strong><small>다음 전투를 준비합니다</small>" :
      "<span>↻</span><strong>" + (remaining <= 0 ? "시간 초과" : "용병단 전멸") + "</strong><small>체력을 회복하고 다시 도전합니다</small>";
    state.battle.units.concat(state.battle.enemies).forEach(function (unit) {
      var sprite = el("sprite-" + unit.id);
      if (sprite && sprite.querySelector(".hp-fill")) {
        sprite.querySelector(".hp-fill").setAttribute("width", 44 * unit.hp / unit.maxHp);
        sprite.classList.toggle("fallen", unit.hp <= 0);
      }
    });
    el("squad-strip").innerHTML = state.mercenaries.map(function (merc, index) {
      var definition = DATA.mercenaries[index];
      var unit = state.battle.units.find(function (u) { return u.id === merc.id; });
      return '<div class="squad-member ' + (merc.unlocked ? "" : "not-recruited") + '"><span class="member-dot" style="background:' + definition.color + '"></span><span>' + definition.name + '</span><small>' +
        (merc.unlocked ? (unit && unit.hp <= 0 ? "전투 불능" : "Lv. " + fmt(merc.level)) : stageLabel(definition.unlockStage) + " 해금") + "</small></div>";
    }).join("");
    if (activeSheet) renderSheet(state);
  }
  function mercenaryCards(state) {
    return '<p class="sheet-intro">함께 싸우고, 함께 성장합니다.</p>' + state.mercenaries.map(function (merc, index) {
      var def = DATA.mercenaries[index];
      var stats = Game.mercenaryStats(merc.id);
      return '<article class="merc-card ' + (merc.unlocked ? "" : "locked-card") + '"><div class="merc-card-heading">' + UI.portrait(merc.id, figure(merc.id, def.color)) + '<div><p>' + def.role + '</p><h3>' + def.name + '</h3></div><strong>' + (merc.unlocked ? 'Lv. ' + fmt(merc.level) : '미합류') + '</strong></div>' +
        (merc.unlocked ? '<div class="xp-label"><span>경험치</span><span>' + fmt(merc.xp) + ' / ' + fmt(DATA.xpToNext(merc.level)) + '</span></div><div class="xp-track"><div style="width:' + (merc.xp / DATA.xpToNext(merc.level) * 100) + '%"></div></div>' : '<p class="unlock-note">' + stageLabel(def.unlockStage) + ' 클리어 시 합류</p>') +
        '<dl class="merc-stats"><div><dt>HP</dt><dd>' + fmt(stats.hp) + '</dd></div><div><dt>공격력</dt><dd>' + fmt(stats.atk) + '</dd></div><div><dt>방어력</dt><dd>' + fmt(stats.def) + '</dd></div><div><dt>공격속도</dt><dd>' + fmt(stats.attackSpeed) + '/초</dd></div><div><dt>치명타 확률</dt><dd>' + fmt(stats.critChance * 100) + '%</dd></div><div><dt>치명타 피해</dt><dd>' + fmt(stats.critDamage * 100) + '%</dd></div></dl><div class="equipment-slots">' + DATA.equipmentSlots.map(function (slot) {
          return UI.equipmentSlot(merc, slot, state);
        }).join("") + '</div></article>';
    }).join("");
  }
  function renderSheet(state) {
    if (!activeSheet) return;
    var signature = activeSheet + (activeSheet === "skills" ? JSON.stringify([state.mercenaries, state.skillBooks]) : activeSheet === "mercenaries" ? JSON.stringify([state.mercenaries, state.inventory]) :
      UI.equipmentSignature ? UI.equipmentSignature(activeSheet, state) : "");
    if (signature === sheetSignature) return;
    sheetSignature = signature;
    el("sheet-title").textContent = titles[activeSheet];
    if (activeSheet === "mercenaries") el("sheet-content").innerHTML = mercenaryCards(state);
    else if (activeSheet === "equipment" || activeSheet === "fusion") UI.renderEquipmentSheet(activeSheet, state);
    else if (activeSheet === "skills") UI.renderSkills(state);
    else if (activeSheet === "settings") {
      el("sheet-content").innerHTML = '<p class="sheet-intro">진행 상황은 자동으로 저장됩니다.</p><dl class="settings-info"><div><dt>버전</dt><dd>' + DATA.version + '</dd></div><div><dt>저장 형식 · schemaVersion</dt><dd>' + fmt(state.schemaVersion) + '</dd></div><div><dt>자동 저장 간격</dt><dd>' + fmt(DATA.autosaveMs / 1000) + '초</dd></div></dl><div class="reset-panel"><h3>새로운 원정</h3><p>모든 용병의 성장과 보유 재화를 초기화합니다.</p><button id="reset-game" class="danger-button">게임 초기화</button></div>';
      el("reset-game").addEventListener("click", function () {
        if (window.confirm("모든 진행 상황과 재화를 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) {
          Game.reset();
          el("sheet").close();
          toast("새로운 원정이 시작되었습니다");
        }
      });
      UI.renderSaveControls();
    } else el("sheet-content").innerHTML = '<div class="placeholder"><span>◇</span><h3>준비 중</h3><p>지금은 용병단과 첫 원정을 떠나 보세요.</p><small>이 기능은 이후 업데이트에서 열립니다.</small></div>';
  }
  function openSheet(name) {
    activeSheet = name;
    if (UI.sheetOpened) UI.sheetOpened(name);
    sheetSignature = "";
    renderSheet(latestState);
    if (!el("sheet").open) el("sheet").showModal();
    document.querySelectorAll("[data-tab]").forEach(function (button) { button.classList.toggle("selected", button.dataset.tab === name); });
  }
  function init() {
    Game.on("update", update);
    Game.on("stageStart", function (state) { drawScene(state, true); });
    Game.on("wave", function () { drawScene(Game.getState(), false); });
    Game.on("hit", hit);
    Game.on("unitDeath", death);
    Game.on("levelUp", function (event) { UI.levelUp(event); toast(DATA.mercenaries.find(function (m) { return m.id === event.id; }).name + " 레벨 " + fmt(event.level) + " 달성"); });
    Game.on("mercenaryUnlock", function (event) { toast(DATA.mercenaries.find(function (m) { return m.id === event.id; }).name + "가 용병단에 합류했습니다"); });
    Game.on("storageError", function (event) { el("save-status").textContent = "저장 확인 필요"; el("save-status").title = event.message; toast(event.message); });
    Game.on("saved", function () { el("save-status").textContent = "저장됨"; });
    el("previous-stage").addEventListener("click", function () { Game.selectStage(latestState.currentStage - 1); });
    el("next-stage").addEventListener("click", function () { Game.selectStage(latestState.currentStage + 1); });
    el("repeat-mode").addEventListener("click", function () { Game.setMode("repeat"); });
    el("challenge-mode").addEventListener("click", function () { Game.setMode("challenge"); });
    document.querySelectorAll("[data-tab]").forEach(function (button) { button.addEventListener("click", function () { openSheet(button.dataset.tab); }); });
    el("close-sheet").addEventListener("click", function () { el("sheet").close(); });
    el("sheet").addEventListener("click", function (event) { if (event.target === el("sheet") && event.clientY < el("sheet").getBoundingClientRect().top) el("sheet").close(); });
    el("sheet").addEventListener("close", function () {
      if (el("sheet").open) return;
      activeSheet = null;
      document.querySelectorAll("[data-tab]").forEach(function (button) { button.classList.remove("selected"); });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { hiddenAt = Date.now(); Game.pause(); }
      else { if (hiddenAt !== null) Game.catchUp(Date.now() - hiddenAt); hiddenAt = null; Game.resume(); }
    });
    window.addEventListener("pagehide", function () { hiddenAt = Date.now(); Game.pause(); });
    window.addEventListener("pageshow", function (event) {
      if (event.persisted && !document.hidden) { if (hiddenAt !== null) Game.catchUp(Date.now() - hiddenAt); hiddenAt = null; Game.resume(); }
    });
    Game.init();
    if (!document.hidden) Game.resume();
    else hiddenAt = Date.now();
  }
  return { fmt: fmt, init: init, openSheet: openSheet, toast: toast,
    refreshSheet: function () { sheetSignature = ""; renderSheet(Game.getState()); } };
})();
