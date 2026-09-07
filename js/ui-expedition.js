"use strict";

(function () {
  var owner = "warrior", report = null, frame = null, started = 0, shown = 0;
  function el(id) { return document.getElementById(id); }
  function mercName(id) { return DATA.mercenaries.find(function (m) { return m.id === id; }).name; }
  UI.updateExpedition = function (state) {
    el("difficulty-toggle").hidden = !state.clearedStages.includes(29);
    document.querySelectorAll("[data-difficulty]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.difficulty === state.difficulty);
      button.setAttribute("aria-pressed", String(button.dataset.difficulty === state.difficulty));
    });
  };
  document.querySelectorAll("[data-difficulty]").forEach(function (button) {
    button.addEventListener("click", function () { Game.setDifficulty(button.dataset.difficulty); });
  });
  UI.renderSkills = function (state) {
    var merc = state.mercenaries.find(function (m) { return m.id === owner; });
    el("sheet-content").innerHTML = '<p class="sheet-intro">슬롯 순서대로 자동 발동합니다. 해제 후 탭하면 마지막 슬롯에 배치됩니다.</p>' +
      '<div class="skill-selector">' + state.mercenaries.map(function (m) {
        return '<button data-skill-owner="' + m.id + '" aria-pressed="' + (owner === m.id) + '" class="' + (owner === m.id ? 'active' : '') + '">' + mercName(m.id) + '</button>';
      }).join('') + '</div><p class="skill-books">' + UI.icon('skillbook', '▤') + mercName(owner) + ' 스킬북 <b>' + UI.fmt(state.skillBooks[owner]) + '</b></p>' +
      '<div class="active-skills">' + [0, 1, 2].map(function (index) {
        var skill = DATA.skills.find(function (s) { return s.id === merc.skills[index]; });
        return '<span>' + UI.fmt(index + 1) + ' · ' + (skill ? skill.name : '빈 슬롯') + '</span>';
      }).join('') + '</div>' + DATA.skills.filter(function (s) { return s.owner === owner; }).map(function (s) {
        var index = merc.skills.indexOf(s.id), level = merc.skillLevels[s.id], cost = DATA.skillBookCost(level);
        return '<article class="skill-card ' + (index >= 0 ? 'equipped-skill' : '') + '"><button class="skill-toggle" data-skill="' + s.id + '" aria-pressed="' + (index >= 0) + '" ' + (!merc.unlocked ? 'disabled' : '') +
          '><span><strong>' + s.name + '</strong> <small>Lv. ' + UI.fmt(level) + '</small></span><b>' + (index >= 0 ? '슬롯 ' + UI.fmt(index + 1) : '배치 +') + '</b></button>' +
          '<p>' + s.desc + '</p><small>쿨타임 ' + UI.fmt(s.cooldown / (s.effect.type === "resurrect" ? 1 + (level - 1) * s.levelScale : 1)) + '초 · 성장 배율 ' + UI.fmt((1 + (level - 1) * s.levelScale) * 100) + '%</small>' +
          '<button class="skill-level" data-level-skill="' + s.id + '" ' + (!merc.unlocked || level >= s.maxLevel || state.skillBooks[owner] < cost ? 'disabled' : '') + '>' +
          (level >= s.maxLevel ? '최대 레벨' : '레벨업 (스킬북 ' + UI.fmt(cost) + ')') + '</button></article>';
      }).join('') + (!merc.unlocked ? '<p class="equipment-note">이 용병이 합류하면 스킬을 변경할 수 있습니다.</p>' : '');
  };
  UI.renderSaveControls = function () {
    var panel = document.createElement("section");
    panel.className = "save-controls";
    panel.innerHTML = '<h3>원정 기록 보관</h3><p>JSON으로 진행 상황을 옮기거나 백업하세요.</p>' +
      '<div class="save-buttons"><button id="export-save">세이브 내보내기</button><button id="import-save">세이브 불러오기</button></div>' +
      '<div id="save-editor" hidden><label for="save-json" id="save-json-label">세이브 JSON</label><textarea id="save-json" spellcheck="false" rows="6"></textarea>' +
      '<button id="copy-save" hidden>복사</button><button id="apply-save" hidden>적용</button><p id="save-message" role="status"></p></div>';
    el("sheet-content").insertBefore(panel, el("sheet-content").querySelector(".reset-panel"));
  };
  el("sheet-content").addEventListener("click", async function (event) {
    var b = event.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.skillOwner) { owner = b.dataset.skillOwner; UI.refreshSheet(); }
    if (b.dataset.skill && !Game.toggleSkill(owner, b.dataset.skill)) UI.toast("먼저 슬롯의 스킬 하나를 해제하세요");
    if (b.dataset.levelSkill) Game.levelSkill(b.dataset.levelSkill);
    if (b.id === "export-save" || b.id === "import-save") {
      var exporting = b.id === "export-save";
      el("save-editor").hidden = false;
      el("save-json").value = exporting ? Game.exportSave() : "";
      el("save-json").readOnly = exporting;
      el("copy-save").hidden = !exporting; el("apply-save").hidden = exporting;
      el("save-message").textContent = exporting ? "복사한 JSON을 안전한 곳에 보관하세요." : "불러올 JSON을 붙여 넣으세요.";
    }
    if (b.id === "copy-save") {
      try {
        if (!navigator.clipboard) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(el("save-json").value);
        if (el("save-message")) el("save-message").textContent = "복사했습니다.";
      } catch (error) {
        if (el("save-json")) {
          el("save-json").focus(); el("save-json").select();
          el("save-message").textContent = "텍스트를 선택했습니다. 복사 메뉴 또는 Ctrl+C를 사용하세요.";
        }
      }
    }
    if (b.id === "apply-save") {
      var json = el("save-json").value;
      try { JSON.parse(json); } catch (error) { el("save-message").textContent = "올바른 JSON을 입력하세요."; return; }
      if (!Game.validateSave(json)) { el("save-message").textContent = "저장 형식이나 값이 올바르지 않습니다. 현재 진행은 유지됩니다."; return; }
      if (!window.confirm("현재 진행 상황을 이 세이브로 교체할까요?")) return;
      if (Game.importSave(json)) { el("sheet").close(); UI.toast("세이브를 불러왔습니다"); }
      else el("save-message").textContent = "저장 형식이나 값이 올바르지 않습니다. 현재 진행은 유지됩니다.";
    }
  });
  var overlay = document.createElement("dialog");
  overlay.id = "offline-report"; overlay.setAttribute("aria-labelledby", "report-title");
  overlay.innerHTML = '<div class="report-heading"><p class="eyebrow">용병단이 돌아왔습니다</p><h2 id="report-title">원정 보고서</h2><p id="report-duration"></p></div>' +
    '<div class="report-gold"><span>' + UI.icon("gold", "🪙") + '획득 골드</span><strong id="report-gold">0</strong></div><p id="report-stats"></p>' +
    '<p id="report-progress" aria-live="polite">탭하면 모두 공개</p><div id="report-items"></div>' +
    '<div class="harvest-footer"><p>장비함이 가득 차면 자동 판매 규칙이 적용됩니다.</p><button id="harvest-report" class="primary">수확하기</button></div>';
  el("app").appendChild(overlay);
  function revealOne(item) {
    var card = document.createElement("div");
    card.className = "fusion-card";
    var content = item.kind === "skillBook" ? '<span class="item-card book-card"><span class="item-icon">' + UI.icon("skillbook", "▤") + '</span><b>' + mercName(item.owner) + '</b><small>스킬북 ×' + UI.fmt(item.count) + '</small></span>' : UI.itemCard(item);
    card.innerHTML = '<div class="flip-inner"><div class="card-back">◇</div><div class="card-front">' + content + '</div></div>';
    el("report-items").appendChild(card);
    if (DATA.rarityOrder.indexOf(item.rarity) >= 2) { card.classList.add("rarity-upgrade"); UI.lootFlash(true); if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30); }
  }
  function progress() { el("report-progress").textContent = UI.fmt(shown) + ' / ' + UI.fmt(report.items.length) + ' 공개 · 탭하면 모두 공개'; }
  function tick(now) {
    if (!overlay.open) return;
    var elapsed = now - started;
    el("report-gold").textContent = UI.fmt(Math.floor(report.gold * Math.min(1, elapsed / 300)));
    var count = Math.min(report.items.length, Math.max(0, Math.floor((elapsed - 300) / 200) + 1));
    while (shown < count) revealOne(report.items[shown++]);
    progress();
    if (elapsed < 300 || shown < report.items.length) frame = requestAnimationFrame(tick);
    else frame = null;
  }
  function skip() {
    cancelAnimationFrame(frame); frame = null;
    while (shown < report.items.length) revealOne(report.items[shown++]);
    el("report-gold").textContent = UI.fmt(report.gold);
    overlay.classList.add("reveal-skipped"); progress();
  }
  Game.on("offlineReport", function (reward) {
    if (overlay.open) return;
    report = reward; shown = 0; started = performance.now();
    el("report-items").replaceChildren(); overlay.classList.remove("reveal-skipped");
    var minutes = Math.floor(reward.elapsedMs / 60000);
    el("report-duration").textContent = UI.fmt(Math.floor(minutes / 60)) + '시간 ' + UI.fmt(minutes % 60) + '분 동안 용병단이 싸웠습니다';
    el("report-stats").textContent = UI.fmt(reward.kills) + ' 처치 · 용병별 경험치 +' + UI.fmt(reward.xp);
    el("report-gold").textContent = '0';
    overlay.showModal(); frame = requestAnimationFrame(tick);
  });
  overlay.addEventListener("cancel", function (event) { event.preventDefault(); skip(); });
  overlay.addEventListener("click", function (event) {
    if (event.target.closest("#harvest-report")) {
      skip(); overlay.close(); Game.harvest(); report = null;
    } else skip();
  });
  Game.on("skill", function (event) {
    var sprite = el("sprite-" + event.id);
    if (!sprite) return;
    UI.attackSprite(sprite);
    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", sprite.dataset.x); label.setAttribute("y", Number(sprite.dataset.y) - 94);
    label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "skill-label"); label.textContent = event.name;
    el("effect-layer").appendChild(label);
    label.addEventListener("animationend", function () { label.remove(); }, { once: true });
  });
  Game.on("skillBook", function (event) { UI.toast(mercName(event.owner) + ' 스킬북 획득'); });
  UI.init();
})();
