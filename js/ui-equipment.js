"use strict";

(function () {
  var filter = "all", sort = "tier", selected = null, equipFor = null, preview = null;
  var unread = 0, currentSheet = null, revealQueue = [], shown = 0, revealFrame = null, lastReveal = 0, skipped = false;
  var cpTarget = null, cpValue = 0, cpFrame = null;
  var ranks = DATA.rarityOrder;
  var labels = { hp: "HP", atk: "공격력", def: "방어력", critChance: "치명타 확률" };
  function el(id) { return document.getElementById(id); }
  function slot(id) { return DATA.equipmentSlots.find(function (s) { return s.id === id; }); }
  function name(item) { return "T" + UI.fmt(item.tier) + " " + DATA.equipmentRarities[item.rarity].name + " " + slot(item.slot).name; }
  function itemCard(item, extra) {
    return '<span class="item-card rarity-' + item.rarity + ' ' + (extra || "") + '"><span class="item-icon">' + UI.icon(item.slot, slot(item.slot).icon) +
      '</span><b>T' + UI.fmt(item.tier) + '</b><small>' + DATA.equipmentRarities[item.rarity].name + '</small></span>';
  }
  function lines(options) {
    return '<ul class="potential-lines">' + options.map(function (p) {
      var definition = DATA.potentialPool.find(function (d) { return d.id === p.id; });
      return '<li><span>' + definition.name + '</span><b>' + (p.id === "invincibleOnHit" ? UI.fmt(DATA.invincibleChance * 100) : '+' + UI.fmt(p.value * 100)) + '%</b></li>';
    }).join("") + '</ul>';
  }
  function badge() { el("equipment-badge").hidden = unread === 0; el("equipment-badge").textContent = UI.fmt(unread); }
  UI.sheetOpened = function (sheet) {
    currentSheet = sheet;
    if (sheet === "equipment") { unread = 0; badge(); }
  };
  UI.equipmentSignature = function (sheet, state) {
    if (sheet !== "equipment" && sheet !== "fusion") return "";
    return JSON.stringify([filter, sort, selected, equipFor, preview, state.inventory, state.gold, state.squadCoins, state.mercenaries]);
  };
  UI.equipmentSlot = function (merc, definition, state) {
    var item = state.inventory.find(function (i) { return i.uid === merc.equipment[definition.id]; });
    return '<button class="equipment-slot ' + (item ? 'rarity-' + item.rarity : '') + '" data-merc-slot="' + definition.id +
      '" data-merc="' + merc.id + '" ' + (merc.unlocked ? '' : 'disabled') + ' aria-label="' + definition.name + ' ' +
      (item ? name(item) : '빈 슬롯') + '"><span>' + UI.icon(definition.id, definition.icon) + '</span><small>' + definition.name + '</small><em>' +
      (item ? 'T' + UI.fmt(item.tier) + ' · ' + DATA.equipmentRarities[item.rarity].name : '비어 있음') + '</em></button>';
  };
  function detail(item, state) {
    return '<section class="item-detail rarity-' + item.rarity + '" aria-label="장비 상세"><div class="detail-heading">' + itemCard(item) +
      '<div><h3>' + name(item) + '</h3><p>' + (item.equippedBy ? DATA.mercenaries.find(function (m) { return m.id === item.equippedBy; }).name + ' 장착 중' : '장착 가능한 장비') +
      '</p></div><button data-action="back" aria-label="목록으로">←</button></div><dl class="base-stats">' + Object.keys(item.base).map(function (key) {
        return '<div><dt>' + labels[key] + '</dt><dd>+' + UI.fmt(item.base[key] * (key === "critChance" ? 100 : 1)) + (key === "critChance" ? '%' : '') + '</dd></div>';
      }).join("") + '</dl><h4>잠재옵션</h4>' + lines(item.potentials) +
      (preview && preview.uid === item.uid ? '<div class="reroll-preview"><div><h4>재설정 전</h4>' + lines(preview.before) + '</div><div class="reroll-after"><h4>재설정 후 ✦</h4>' + lines(preview.after) + '</div></div>' : '') +
      '<h4>' + (equipFor ? DATA.mercenaries.find(function (m) { return m.id === equipFor; }).name + '에게 장착' : '장착할 용병') + '</h4><div class="equip-actions">' + state.mercenaries.map(function (m, i) {
        return '<button data-equip="' + m.id + '" ' + (!m.unlocked || item.equippedBy === m.id ? 'disabled' : '') +
          ' class="' + (equipFor === m.id ? 'primary' : '') + '">' + DATA.mercenaries[i].name + (m.unlocked ? ' 장착' : ' 미합류') + '</button>';
      }).join("") + '</div><div class="detail-actions">' + (item.equippedBy ? '<button data-action="unequip">해제</button>' : '') +
      '<button data-action="lock">' + (item.locked ? '🔒 잠금 해제' : '잠금') + '</button><button data-action="sell" ' + (item.locked || item.equippedBy ? 'disabled' : '') +
      '>판매 · ' + UI.fmt(DATA.sellPrice(item.tier, item.rarity)) + ' 골드</button><button data-action="reroll" ' + (state.squadCoins < DATA.potentialRerollCost ? 'disabled' : '') +
      '>잠재 재설정 · 코인 ' + UI.fmt(DATA.potentialRerollCost) + '</button></div></section>';
  }
  function inventory(state) {
    var items = state.inventory.filter(function (i) { return filter === "all" || i.slot === filter; }).slice();
    items.sort(function (a, b) {
      var recent = Number(b.uid.slice(5)) - Number(a.uid.slice(5));
      return sort === "recent" ? recent : sort === "rarity" ? ranks.indexOf(b.rarity) - ranks.indexOf(a.rarity) || b.tier - a.tier || recent :
        b.tier - a.tier || ranks.indexOf(b.rarity) - ranks.indexOf(a.rarity) || recent;
    });
    var item = state.inventory.find(function (i) { return i.uid === selected; });
    return '<div class="inventory-heading"><p>전장에서 찾은 가능성</p><strong id="inventory-count">' + UI.fmt(state.inventory.length) + '/' + UI.fmt(DATA.inventoryCap) + '</strong></div>' +
      (equipFor ? '<div class="equip-mode">' + DATA.mercenaries.find(function (m) { return m.id === equipFor; }).name + ' · 이 용병에게 장착<button data-action="end-mode">모드 해제</button></div>' : '') +
      '<div class="inventory-filters" role="group" aria-label="장비 슬롯 필터">' + [{ id: "all", name: "전체" }].concat(DATA.equipmentSlots).map(function (s) {
        return '<button data-filter="' + s.id + '" class="' + (filter === s.id ? 'active' : '') + '" aria-pressed="' + (filter === s.id) + '">' + s.name + '</button>';
      }).join("") + '</div><div class="inventory-sort"><span>' + UI.fmt(items.length) + '개 장비</span><label>정렬 <select id="equipment-sort">' +
      [['tier', '티어↓'], ['rarity', '등급↓'], ['recent', '최근']].map(function (s) { return '<option value="' + s[0] + '" ' + (sort === s[0] ? 'selected' : '') + '>' + s[1] + '</option>'; }).join('') +
      '</select></label></div>' + (item ? detail(item, state) : '') + '<div class="inventory-grid">' + items.map(function (i) {
        return '<button class="inventory-cell rarity-' + i.rarity + (selected === i.uid ? ' selected-item' : '') + '" data-item="' + i.uid + '" aria-label="' + name(i) +
          (i.locked ? ' 잠금' : '') + (i.equippedBy ? ' 장착 중' : '') + '"><span>' + UI.icon(i.slot, slot(i.slot).icon) + '</span><b>T' + UI.fmt(i.tier) +
          '</b>' + (i.locked ? '<em>🔒</em>' : '') + (i.equippedBy ? '<i>장착</i>' : '') + '</button>';
      }).join("") + '</div>' + (!items.length ? '<p class="equipment-empty">적을 처치하면 장비가 떨어집니다.<br>같은 슬롯·티어 세 개를 모아 합성해 보세요.</p>' : '') +
      '<p class="equipment-note">가득 차면 잠금·장착을 제외한 최저 티어 레어를 자동 판매합니다. 판매할 레어가 없으면 새 드롭을 골드로 받습니다.</p>';
  }
  function fusion(state) {
    var rows = '';
    DATA.equipmentSlots.forEach(function (s) {
      for (var tier = 1; tier <= 8; tier++) {
        var count = state.inventory.filter(function (i) { return i.slot === s.id && i.tier === tier && !i.locked && !i.equippedBy; }).length;
        rows += '<tr><th>' + UI.icon(s.id, s.icon) + ' ' + s.name + '</th><td>T' + UI.fmt(tier) + '</td><td>' + UI.fmt(count) + '개</td><td>' + (tier === 8 ? '<small>최대 티어</small>' :
          '<button data-fuse-slot="' + s.id + '" data-tier="' + tier + '" ' + (count < 3 || state.gold < DATA.fusionCost(tier) ? 'disabled' : '') +
          '>합성 ×' + UI.fmt(1) + '<small>' + UI.fmt(DATA.fusionCost(tier)) + ' 골드</small></button>') + '</td></tr>';
      }
    });
    return '<div class="fusion-heading"><div><p>셋을 모아, 한 단계 더.</p><small>보유 골드 ' + UI.fmt(state.gold) + '</small></div><button id="auto-fuse" class="primary">자동 합성</button></div>' +
      '<p class="equipment-note">잠금·장착 장비 제외 · 최저 티어부터 합성<br>최고 재료 등급 유지 · ' + UI.fmt(DATA.fuseUpgradeChance * 100) + '% 확률로 등급 상승</p>' +
      '<table class="fusion-table"><thead><tr><th>슬롯</th><th>티어</th><th>재료</th><th>세 개 합성</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  UI.renderEquipmentSheet = function (sheet, state) { el("sheet-content").innerHTML = sheet === "equipment" ? inventory(state) : fusion(state); };
  UI.updateCP = function (value) {
    if (value === cpTarget) return;
    if (cpTarget === null) { cpTarget = cpValue = value; el("cp").textContent = UI.fmt(value); return; }
    cpTarget = value;
    cancelAnimationFrame(cpFrame);
    var from = cpValue, start = performance.now();
    el("cp").classList.remove("cp-jump");
    void el("cp").offsetWidth;
    el("cp").classList.add("cp-jump");
    function frame(now) {
      var t = Math.min(1, (now - start) / 300);
      cpValue = from + (value - from) * (1 - (1 - t) ** 3);
      el("cp").textContent = UI.fmt(Math.round(cpValue));
      if (t < 1) cpFrame = requestAnimationFrame(frame);
    }
    cpFrame = requestAnimationFrame(frame);
  };
  function flash(strong) {
    // DECISION: Keep the scene's existing feedback hook; also flash the visible top-layer sheet.
    var surfaces = [document.querySelector(".battle-scene"),
      document.querySelector("#offline-report[open]") || document.querySelector("#fusion-reveal[open]")];
    surfaces.filter(Boolean).forEach(function (scene) {
      scene.classList.remove("loot-flash", "loot-flash-strong");
      void scene.offsetWidth;
      scene.classList.add(strong ? "loot-flash-strong" : "loot-flash");
    });
  }
  function drop(item) {
    if (!item.autoSold && currentSheet !== "equipment") { unread++; badge(); }
    if (item.enemyId === null) return; // Already revealed in the expedition report.
    var source = el("sprite-" + item.enemyId);
    var svg = el("battle-svg");
    var point = svg.createSVGPoint();
    point.x = source ? Number(source.dataset.x) : 284;
    point.y = source ? Number(source.dataset.y) - 50 : 190;
    var start = point.matrixTransform(svg.getScreenCTM());
    var target = document.querySelector('[data-tab="equipment"] span').getBoundingClientRect();
    var card = document.createElement("div");
    card.className = "drop-card";
    card.innerHTML = itemCard(item);
    card.style.left = start.x - 25 + "px"; card.style.top = start.y - 30 + "px";
    card.style.setProperty("--drop-x", target.x + target.width / 2 - start.x + "px");
    card.style.setProperty("--drop-y", target.y + target.height / 2 - start.y + "px");
    el("app").appendChild(card);
    card.addEventListener("animationend", function (e) { if (e.target === card) card.remove(); });
    if (ranks.indexOf(item.rarity) >= 2) { flash(false); if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30); }
  }
  var reveal = document.createElement("dialog");
  reveal.id = "fusion-reveal";
  reveal.setAttribute("aria-label", "합성 결과");
  reveal.innerHTML = '<h2>합성의 순간</h2><p id="reveal-progress" aria-live="polite"></p><div id="reveal-cards"></div><button id="reveal-skip">탭하면 모두 공개</button>';
  el("app").appendChild(reveal);
  function revealOne(event) {
    var card = document.createElement("div");
    card.className = "fusion-card" + (event.upgraded ? " rarity-upgrade" : "");
    card.innerHTML = '<div class="flip-inner"><div class="card-back">◇</div><div class="card-front">' + itemCard(event.item) +
      '</div></div><p>' + (event.upgraded ? '✦ 등급 상승!' : slot(event.item.slot).name) + '</p>';
    el("reveal-cards").appendChild(card);
    if (event.upgraded || ranks.indexOf(event.item.rarity) >= 2) flash(true);
  }
  function revealTick(now) {
    if (!reveal.open) { revealFrame = null; return; }
    if (shown < revealQueue.length && now - lastReveal >= 250) {
      revealOne(revealQueue[shown++]); lastReveal = now;
      el("reveal-progress").textContent = UI.fmt(shown) + ' / ' + UI.fmt(revealQueue.length) + ' 공개';
      el("reveal-cards").lastElementChild.scrollIntoView({ block: "nearest" });
    }
    if (shown < revealQueue.length) revealFrame = requestAnimationFrame(revealTick);
    else { revealFrame = null; el("reveal-skip").textContent = '탭하면 모두 공개 · 다시 탭하면 닫기'; }
  }
  function enqueue(event) {
    if (!reveal.open) {
      revealQueue = []; shown = 0; skipped = false; lastReveal = -Infinity;
      el("reveal-cards").replaceChildren(); reveal.classList.remove("reveal-skipped"); reveal.showModal();
    }
    revealQueue.push(event);
    if (revealFrame === null) revealFrame = requestAnimationFrame(revealTick);
  }
  reveal.addEventListener("click", function () {
    if (skipped) { reveal.close(); return; }
    cancelAnimationFrame(revealFrame); revealFrame = null;
    while (shown < revealQueue.length) revealOne(revealQueue[shown++]);
    skipped = true; reveal.classList.add("reveal-skipped");
    el("reveal-progress").textContent = UI.fmt(shown) + '개 합성 완료';
    el("reveal-skip").textContent = '닫기';
  });
  reveal.addEventListener("close", function () { if (!reveal.open) { cancelAnimationFrame(revealFrame); revealFrame = null; } });
  el("sheet").addEventListener("close", function () { if (!el("sheet").open) { currentSheet = null; equipFor = null; } });
  el("sheet-content").addEventListener("change", function (event) {
    if (event.target.id === "equipment-sort") { sort = event.target.value; UI.refreshSheet(); }
  });
  el("sheet-content").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button || button.disabled) return;
    var d = button.dataset, state = Game.getState(), item = state.inventory.find(function (i) { return i.uid === selected; });
    if (d.mercSlot) { filter = d.mercSlot; equipFor = d.merc; selected = null; preview = null; UI.openSheet("equipment"); }
    else if (d.filter) { filter = d.filter; selected = null; preview = null; UI.refreshSheet(); }
    else if (d.item) { selected = d.item; preview = null; UI.refreshSheet(); el("sheet").scrollTop = 0; }
    else if (d.equip && item) { Game.equip(item.uid, d.equip); UI.toast('장착 완료 · CP ' + UI.fmt(Game.getCP())); }
    else if (d.fuseSlot) {
      var materials = state.inventory.filter(function (i) { return i.slot === d.fuseSlot && i.tier === Number(d.tier) && !i.locked && !i.equippedBy; });
      if (!Game.fuse(materials.slice(0, 3).map(function (i) { return i.uid; }))) UI.toast('재료 또는 골드가 부족합니다');
    } else if (button.id === "auto-fuse") { if (!Game.autoFuse().length) UI.toast('합성할 재료 또는 골드가 부족합니다'); }
    else if (d.action === "back") { selected = null; preview = null; UI.refreshSheet(); }
    else if (d.action === "end-mode") { equipFor = null; UI.refreshSheet(); }
    else if (item) {
      if (d.action === "unequip") Game.unequip(item.equippedBy, item.slot);
      if (d.action === "lock") Game.toggleLock(item.uid);
      if (d.action === "sell") {
        var amount = Game.sell([item.uid]);
        if (amount !== false) { selected = null; preview = null; UI.refreshSheet(); UI.toast(UI.fmt(amount) + ' 골드에 판매했습니다'); }
      }
      if (d.action === "reroll") {
        if (!Game.rerollPotentials(item.uid)) UI.toast('스쿼드 코인이 부족합니다');
        else document.querySelector('.reroll-preview').scrollIntoView({ block: 'center' });
      }
    }
  });
  Game.on("itemDrop", drop);
  Game.on("fuseResult", enqueue);
  Game.on("potentialReroll", function (e) { preview = { uid: e.item.uid, before: e.before, after: e.after }; });
  Game.on("inventoryFull", function (e) {
    UI.toast('장비함 가득 참 · ' + name(e.sold) + ' 자동 판매 +' + UI.fmt(e.gold) + ' 골드');
  });
  Game.on("stageStart", function (state) {
    if (state.inventory.length === 0) { unread = 0; selected = null; preview = null; badge(); }
  });
  UI.itemCard = itemCard;
  UI.lootFlash = flash;
})();
