"use strict";
var Game = (function () {
  var state, listeners = {}, timer = null, autosave = null, catchingUp = false, savedAt = 0;
  var storageKey = "squad_v1", monsters, expedition, validator, progression;
  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function () { listeners[event] = listeners[event].filter(function (f) { return f !== fn; }); };
  }
  function emit(event, payload) {
    if (!catchingUp) (listeners[event] || []).forEach(function (fn) { fn(payload); });
  }
  function fresh(seed) {
    return { schemaVersion: DATA.schemaVersion, rngSeed: (seed === undefined ? DATA.defaultSeed : seed) >>> 0,
      gold: 0, coins: 0, materials: { enhanceStone: 0 }, accessories: [], nextAccessoryUid: 1,
      tamerXP: 0, roster: ["dewslime", "mistfox"].map(function (id, i) {
        return { uid: "monster-" + (i + 1), speciesId: id, rarity: "rare", level: 1, xp: 0,
          traits: [], enhance: 0, evo: 1, party: i, camp: null, locked: false, accessory: null };
      }), nextMonsterUid: 3, dex: Object.fromEntries(Object.keys(DATA.species).map(function (id) {
        return [id, { seen: id === "dewslime" || id === "mistfox", caught: id === "dewslime" || id === "mistfox" }];
      })), unlockedStages: [0], clearedStages: [], currentStage: 0, mode: "challenge", transitionTicks: 0,
      stats: { goldPerSec: 0, killsPerSec: 0, elapsedMs: 0, samples: [] }, statsKey: 0, stageStats: {},
      pendingReport: null, battle: null };
  }
  function rng() {
    state.rngSeed = (Math.imul(state.rngSeed, 1664525) + 1013904223) >>> 0;
    return state.rngSeed / 4294967296;
  }
  function getState() { return JSON.parse(JSON.stringify(state)); }
  function getCP() {
    return Math.round(state.roster.filter(function (m) { return m.party !== null; }).reduce(function (total, m) {
      var stats = monsters.stats(m);
      return total + Object.keys(DATA.cpWeights).reduce(function (sum, key) { return sum + stats[key] * DATA.cpWeights[key]; }, 0);
    }, 0));
  }
  function updateStats() {
    var stats = state.stats;
    stats.samples = stats.samples.filter(function (s) { return s.at > stats.elapsedMs - DATA.statsWindowMs; });
    var seconds = Math.max(DATA.tickMs, Math.min(stats.elapsedMs, DATA.statsWindowMs)) / 1000;
    stats.goldPerSec = stats.samples.reduce(function (sum, s) { return sum + s.gold; }, 0) / seconds;
    stats.killsPerSec = stats.samples.length / seconds;
  }
  function grantKill(event) {
    var gold = Math.round(DATA.goldPerKill(state.currentStage) * (1 + (progression ? progression.bonus("goldPct") : 0)));
    state.gold += gold; state.stats.samples.push({ at: state.stats.elapsedMs, gold: gold });
    monsters.grantXP(DATA.balance.xpPerKill * (event.boss ? DATA.balance.bossXpMultiplier : 1));
    if (progression) progression.drop(event);
  }
  function markSeen() {
    state.battle.enemies.forEach(function (u) { state.dex[u.speciesId].seen = true; });
  }
  function handleBattle(event, payload) {
    if (event === "kill") grantKill(payload);
    if (event === "capture") {
      monsters.receive(payload.monster);
      // DECISION: A capture earns the same gold/XP as a defeat; it never also emits kill.
      grantKill({ boss: false });
    }
    if (event === "wave") markSeen();
    if (event === "stageClear") {
      var index = payload.stageIndex;
      if (!state.clearedStages.includes(index)) {
        state.clearedStages.push(index);
        state.coins += DATA.stages[index].boss ? DATA.firstClearCoins.boss : DATA.firstClearCoins.normal;
      }
      if (index + 1 < DATA.stages.length && !state.unlockedStages.includes(index + 1)) state.unlockedStages.push(index + 1);
      state.transitionTicks = DATA.resultTicks;
    }
    if (event === "stageFail") state.transitionTicks = DATA.resultTicks;
    emit(event, payload);
  }
  function beginStage() {
    if (state.statsKey !== state.currentStage) {
      state.stageStats[state.statsKey] = state.stats;
      state.stats = state.stageStats[state.currentStage] || { goldPerSec: 0, killsPerSec: 0, elapsedMs: 0, samples: [] };
      state.statsKey = state.currentStage;
    }
    state.battle = Battle.start(state.currentStage, state.roster.filter(function (m) { return m.party !== null; }), null,
      state.battle ? state.battle.tamer : null);
    state.transitionTicks = 0; markSeen();
    emit("stageStart", getState()); emit("wave", { wave: 1, total: 3, stageIndex: state.currentStage });
  }
  function step() {
    if (state.pendingReport) return;
    state.stats.elapsedMs += DATA.tickMs;
    if (state.battle.status === "fighting") {
      Battle.tick(state.battle, handleBattle);
      if (state.battle.status !== "fighting" && !catchingUp) save();
    } else {
      state.transitionTicks = Math.max(0, state.transitionTicks - 1);
      if (!state.transitionTicks) {
        if (state.battle.status === "clear" && state.mode === "challenge") state.currentStage = Math.min(DATA.stages.length - 1, state.currentStage + 1);
        beginStage(); if (!catchingUp) save();
      }
    }
    updateStats();
    if (!catchingUp) emit("update", getState());
  }
  function catchUp(elapsedMs) {
    if (state.pendingReport || (Number.isFinite(elapsedMs) && elapsedMs >= DATA.offline.thresholdMs)) return expedition.report(elapsedMs);
    var ticks = Number.isFinite(elapsedMs) ? Math.floor(Math.max(0, Math.min(elapsedMs, DATA.catchUpMaxMs)) / DATA.tickMs) : 0;
    // DECISION: Short absences use the same simulator too, with capture success thinned to 50% offline.
    catchingUp = true; monsters.setOffline(true);
    try { for (var i = 0; i < ticks; i++) step(); }
    finally { catchingUp = false; monsters.setOffline(false); }
    save(); emit("stageStart", getState()); emit("update", getState()); return ticks;
  }
  function selectStage(index) {
    if (state.pendingReport || !Number.isInteger(index) || !state.unlockedStages.includes(index)) return false;
    state.currentStage = index; beginStage(); changed(); return true;
  }
  function setMode(mode) {
    if (state.pendingReport || !["repeat", "challenge"].includes(mode)) return false;
    state.mode = mode; changed(); return true;
  }
  function save() {
    savedAt = Date.now();
    var json = JSON.stringify({ schemaVersion: DATA.schemaVersion, savedAt: savedAt, state: state });
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(storageKey, json);
      emit("saved", {});
    } catch (_) { emit("storageError", { message: "저장 공간을 사용할 수 없습니다. 설정에서 진행을 내보내 주세요." }); }
    return json;
  }
  function migrate(data) {
    // DECISION: v1–v3 equipment/mercenary saves cannot represent monster identities; explicitly start fresh.
    if (!data || ![4, 5].includes(data.schemaVersion) || data.state.schemaVersion !== data.schemaVersion) throw new Error("몬스터 조련단은 새 저장 형식을 사용합니다.");
    if (data.schemaVersion === 4) {
      var s = data.state;
      s.schemaVersion = data.schemaVersion = 5;
      s.materials = { enhanceStone: 0 }; s.accessories = []; s.nextAccessoryUid = 1; s.coins = 0;
      // DECISION: Preserve v4 traits, XP and combat exactly; no retroactive first-clear coins.
      s.roster.concat(s.pendingReport ? s.pendingReport.monsters : []).forEach(function (m) {
        m.evo = m.evo === undefined ? 1 : m.evo; m.enhance = m.enhance === undefined ? 0 : m.enhance;
        m.locked = false; m.accessory = null;
      });
      if (s.pendingReport) { s.pendingReport.materials = { enhanceStone: 0 }; s.pendingReport.accessories = []; }
    }
    return data;
  }
  function validateSave(source) {
    try { var data = migrate(JSON.parse(source)); return Number.isFinite(data.savedAt) && data.savedAt >= 0 && validator(data.state); }
    catch (_) { return false; }
  }
  function load(source) {
    try {
      var json = source === undefined ? (typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null) : source;
      if (!json) return false;
      var data = migrate(JSON.parse(json));
      if (!validateSave(json)) throw new Error("손상된 저장 데이터");
      state = data.state; savedAt = data.savedAt;
      emit("stageStart", getState()); emit("update", getState());
      if (state.pendingReport) emit("offlineReport", getState().pendingReport);
      return true;
    } catch (_) { emit("storageError", { message: "이전 버전 또는 손상된 저장입니다. 현재 몬스터 탐험을 유지합니다." }); return false; }
  }
  function pause() {
    if (timer !== null) clearInterval(timer);
    if (autosave !== null) clearInterval(autosave);
    timer = null; autosave = null; save();
  }
  function resume() {
    if (timer === null) timer = setInterval(step, DATA.tickMs);
    if (autosave === null) autosave = setInterval(save, DATA.autosaveMs);
  }
  function changed() { save(); emit("update", getState()); }
  function reset(seed) { state = fresh(seed); beginStage(); changed(); }
  function init() {
    if (load()) catchUp(Math.max(0, Date.now() - savedAt));
    else { beginStage(); save(); }
    emit("update", getState());
  }
  function host() { return { state: function () { return state; }, emit: emit, save: save, beginStage: beginStage, changed: changed,
    monsters: function () { return monsters; }, progression: function () { return progression; } }; }
  state = fresh();
  return { on: on, rng: rng, getState: getState, getCP: getCP, step: step, catchUp: catchUp,
    selectStage: selectStage, setMode: setMode, save: save, load: load, validateSave: validateSave, reset: reset,
    init: init, pause: pause, resume: resume,
    registerMonsters: function (factory) { monsters = factory(host()); Object.assign(Game, monsters.api); delete Game.registerMonsters; beginStage(); },
    registerExpedition: function (factory) { expedition = factory(host()); Object.assign(Game, expedition.api); delete Game.registerExpedition; },
    registerProgression: function (factory) { progression = factory(host()); Object.assign(Game, progression.api); delete Game.registerProgression; },
    registerValidation: function (factory) { validator = factory(host()); delete Game.registerValidation; }
  };
})();
