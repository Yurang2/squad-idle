"use strict";

(function () {
  var failed = new Set(), counters = new Map();
  var regions = DATA.artRegions;
  UI.artRegion = function (index) { return regions[index]; };
  UI.assetPath = function (key) { return failed.has(key) ? null : DATA.assets[key]; };
  UI.assetError = function (node) {
    failed.add(node.dataset.asset);
    node.removeAttribute("href"); node.removeAttribute("src"); node.style.display = "none";
    var fallback = node.parentNode?.querySelector(".asset-fallback");
    if (fallback) fallback.style.display = "";
  };
  UI.assetLoaded = function (node) {
    var fallback = node.parentNode?.querySelector(".asset-fallback");
    if (fallback) fallback.style.display = "none";
  };
  UI.icon = function (key, fallback) {
    var path = UI.assetPath("icon." + key);
    return '<span class="asset-icon" aria-hidden="true"><span class="asset-fallback">' + fallback + '</span>' +
      (path ? '<img alt="" src="' + path + '" data-asset="icon.' + key + '" onload="UI.assetLoaded(this)" onerror="UI.assetError(this)">' : '') + '</span>';
  };
  UI.portrait = function (id, fallback) {
    var key = "merc." + id + ".idle", path = UI.assetPath(key);
    return '<svg viewBox="-48 -92 96 100" aria-hidden="true"><g class="asset-fallback">' + fallback + '</g>' +
      (path ? '<image x="-48" y="-91.2" width="96" height="96" href="' + path + '" data-asset="' + key +
        '" onload="UI.assetLoaded(this)" onerror="UI.assetError(this)"/>' : '') + '</svg>';
  };
  UI.spriteImage = function (parent, key, size) {
    var path = UI.assetPath(key);
    if (!path) return null;
    var image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("class", "sprite-image"); image.dataset.asset = key;
    image.setAttribute("x", -size / 2); image.setAttribute("y", -size * .95);
    image.setAttribute("width", size); image.setAttribute("height", size);
    image.addEventListener("error", function () { UI.assetError(image); });
    image.addEventListener("load", function () { UI.assetLoaded(image); });
    parent.appendChild(image); image.setAttribute("href", path);
    return image;
  };
  UI.sceneBackground = function (region) {
    var parent = document.getElementById("scene-background"), key = "bg." + regions[region].bg;
    if (parent.dataset.asset === key) return;
    parent.dataset.asset = key;
    parent.querySelector("image")?.remove();
    parent.querySelector(".asset-fallback").style.display = "";
    var image = UI.spriteImage(parent, key, 390);
    if (image) {
      image.setAttribute("x", 0); image.setAttribute("y", 0);
      image.setAttribute("width", 390); image.setAttribute("height", 340);
      image.setAttribute("preserveAspectRatio", "xMidYMid slice"); image.setAttribute("class", "region-image");
    }
  };
  UI.attackSprite = function (sprite) {
    var image = sprite.querySelector(".sprite-image");
    if (!image || !image.dataset.asset.startsWith("merc.")) return;
    var idle = image.dataset.asset.replace(".attack", ".idle"), attack = idle.replace(".idle", ".attack");
    if (!UI.assetPath(attack)) return;
    cancelAnimationFrame(image.attackFrame);
    image.dataset.asset = attack; image.setAttribute("href", UI.assetPath(attack));
    var start = performance.now();
    function frame(now) {
      if (!image.isConnected) return;
      if (now - start < 120) { image.attackFrame = requestAnimationFrame(frame); return; }
      image.dataset.asset = idle;
      if (UI.assetPath(idle)) { image.style.display = ""; image.setAttribute("href", UI.assetPath(idle)); }
    }
    image.attackFrame = requestAnimationFrame(frame);
  };
  UI.countUp = function (id, value) {
    var node = document.getElementById(id), counter = counters.get(id);
    if (!counter) { counters.set(id, { target: value, value: value }); node.textContent = UI.fmt(value); return; }
    if (counter.target === value) return;
    cancelAnimationFrame(counter.frame);
    var from = counter.value, start = performance.now(); counter.target = value;
    function frame(now) {
      var t = Math.min(1, (now - start) / 300);
      counter.value = from + (value - from) * (1 - (1 - t) ** 3);
      node.textContent = UI.fmt(Math.round(counter.value));
      if (t < 1) counter.frame = requestAnimationFrame(frame);
    }
    counter.frame = requestAnimationFrame(frame);
  };
  UI.levelUp = function (event) {
    var sprite = document.getElementById("sprite-" + event.id);
    if (!sprite) return;
    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", sprite.dataset.x); label.setAttribute("y", Number(sprite.dataset.y) - 104);
    label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "level-up-label");
    label.textContent = "LEVEL UP!"; document.getElementById("effect-layer").appendChild(label);
    label.addEventListener("animationend", function () { label.remove(); }, { once: true });
  };
  document.querySelectorAll("[data-icon]").forEach(function (node) { node.innerHTML = UI.icon(node.dataset.icon, node.textContent); });
  // DECISION: Warm attack frames before the first combat tick; failed frames are never retried this session.
  DATA.mercenaries.forEach(function (merc) {
    var key = "merc." + merc.id + ".attack", path = UI.assetPath(key);
    if (!path) return;
    var frame = new Image(); frame.onerror = function () { failed.add(key); }; frame.src = path;
  });
})();
