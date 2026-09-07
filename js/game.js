"use strict";

var Game = (function () {
  var state;
  var listeners = {};
  var timer = null;
  var autosave = null;
  var catchingUp = false;
  var savedAt = 0;
  var storageKey = "squad_v1";
  var equipment;
  var expedition;

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function () { listeners[event] = listeners[event].filter(function (f) { return f !== fn; }); };
  }
  function emit(event, payload) {
    if (catchingUp) return;
    (listeners[event] || []).forEach(function (fn) { fn(payload); });
  }
  function fresh(seed) {
    return { schemaVersion: DATA.schemaVersion, rngSeed: (seed === undefined ? DATA.defaultSeed : seed) >>> 0,
      gold: 0, squadCoins: 0, mercenaries: DATA.mercenaries.map(function (m) {
        return { id: m.id, level: 1, xp: 0, unlocked: m.unlockStage === null,
          skills: DATA.defaultSkills[m.id].slice(), skillLevels: Object.fromEntries(DATA.skills.filter(function (s) { return s.owner === m.id; }).map(function (s) { return [s.id, 1]; })),
          equipment: { weapon: null, hat: null, gloves: null, shoes: null } };
      }), unlockedStages: [0], clearedStages: [], currentStage: 0, mode: "challenge",
      stats: { goldPerSec: 0, killsPerSec: 0, elapsedMs: 0, samples: [] },
      difficulty: "normal", chaosUnlockedStages: [0], chaosClearedStages: [], normalStage: 0, chaosStage: 0,
      skillBooks: { warrior: 0, archer: 0, mage: 0 }, pendingReport: null, stageStats: {},
      inventory: [], overflow: 0, nextItemUid: 1, battle: null, transitionTicks: 0 };
  }
  function rng() {
    state.rngSeed = (Math.imul(state.rngSeed, 1664525) + 1013904223) >>> 0;
    return state.rngSeed / 4294967296;
  }
  function getState() { return JSON.parse(JSON.stringify(state)); }
  function mercenaryStats(id) {
    var merc = state.mercenaries.find(function (m) { return m.id === id; });
    return merc ? (equipment ? equipment.stats(merc) : DATA.mercenaryStats(id, merc.level)) : null;
  }
  function getCP() {
    return Math.round(state.mercenaries.filter(function (m) { return m.unlocked; }).reduce(function (total, m) {
      var stats = mercenaryStats(m.id);
      return total + Object.keys(DATA.cpWeights).reduce(function (sum, key) { return sum + stats[key] * DATA.cpWeights[key]; }, 0);
    }, 0));
  }
  function updateStats() {
    var stats = state.stats;
    stats.samples = stats.samples.filter(function (sample) { return sample.at > stats.elapsedMs - DATA.statsWindowMs; });
    var seconds = Math.max(DATA.tickMs, Math.min(stats.elapsedMs, DATA.statsWindowMs)) / 1000;
    stats.goldPerSec = stats.samples.reduce(function (sum, sample) { return sum + sample.gold; }, 0) / seconds;
    stats.killsPerSec = stats.samples.length / seconds;
  }
  function grantKill(event) {
    var gold = Math.round(DATA.goldPerKill(state.currentStage) * (state.difficulty === "chaos" ? DATA.chaos.gold : 1) * (1 + (equipment ? equipment.bonus("goldPct") : 0)));
    state.gold += gold;
    state.stats.samples.push({ at: state.stats.elapsedMs, gold: gold });
    state.mercenaries.forEach(function (merc) {
      if (!merc.unlocked) return;
      // DECISION: Every recruited mercenary receives full kill XP, even if downed.
      merc.xp += DATA.balance.xpPerKill * (event.type === "boss" ? DATA.balance.bossXpMultiplier : 1);
      var oldLevel = merc.level;
      while (merc.xp >= DATA.xpToNext(merc.level)) {
        merc.xp -= DATA.xpToNext(merc.level);
        merc.level += 1;
      }
      if (merc.level !== oldLevel) {
        // DECISION: New level stats apply next attempt; current combat HP is not refreshed by leveling.
        emit("levelUp", { id: merc.id, level: merc.level });
      }
    });
    if (equipment) equipment.drop(event, false);
    if (expedition) expedition.bookDrop();
    if (!catchingUp) save();
  }
  function handleBattle(event, payload) {
    if (event === "kill") grantKill(payload);
    if (event === "stageClear") {
      var index = payload.stageIndex;
      var clears = state.difficulty === "chaos" ? state.chaosClearedStages : state.clearedStages;
      var unlocks = state.difficulty === "chaos" ? state.chaosUnlockedStages : state.unlockedStages;
      if (!clears.includes(index)) {
        clears.push(index);
        state.squadCoins += DATA.stages[index].firstClearCoins * (state.difficulty === "chaos" ? DATA.chaos.firstClearCoins : 1);
      } else if (DATA.stages[index].boss) state.squadCoins += DATA.balance.bossRepeatCoins;
      if (index < DATA.stages.length - 1 && !unlocks.includes(index + 1)) unlocks.push(index + 1);
      state.mercenaries.forEach(function (merc) {
        var definition = DATA.mercenaries.find(function (m) { return m.id === merc.id; });
        if (!merc.unlocked && state.clearedStages.includes(definition.unlockStage)) {
          merc.unlocked = true;
          emit("mercenaryUnlock", { id: merc.id });
        }
      });
    }
    if (event === "stageClear" || event === "stageFail") state.transitionTicks = DATA.resultTicks;
    emit(event, payload);
  }
  function beginStage() {
    var key = state.difficulty + ":" + state.currentStage;
    if (state.statsKey !== key) {
      if (state.statsKey) state.stageStats[state.statsKey] = state.stats;
      state.stats = state.stageStats[key] || { goldPerSec: 0, killsPerSec: 0, elapsedMs: 0, samples: [] };
      state.statsKey = key;
    }
    state.battle = Battle.start(state.currentStage, state.mercenaries.filter(function (m) { return m.unlocked; }).map(function (m) {
      return Object.assign({}, m, { stats: mercenaryStats(m.id) });
    }), null, state.difficulty);
    state.transitionTicks = 0;
    emit("stageStart", getState());
    emit("wave", { wave: 1, total: 3, stageIndex: state.currentStage });
  }
  function step() {
    if (state.pendingReport) return;
    state.stats.elapsedMs += DATA.tickMs;
    if (state.battle.status === "fighting") {
      Battle.tick(state.battle, handleBattle);
      if (state.battle.status !== "fighting" && !catchingUp) save();
    } else {
      state.transitionTicks = Math.max(0, state.transitionTicks - 1);
      if (state.transitionTicks === 0) {
        if (state.battle.status === "clear" && state.mode === "challenge") {
          state.currentStage = Math.min(DATA.stages.length - 1, state.currentStage + 1);
        }
        beginStage();
        if (!catchingUp) save();
      }
    }
    updateStats();
    if (!catchingUp && listeners.update && listeners.update.length) emit("update", getState());
  }
  function catchUp(elapsedMs) {
    if (expedition && (state.pendingReport || (Number.isFinite(elapsedMs) && elapsedMs >= DATA.offline.thresholdMs))) return expedition.report(elapsedMs);
    var ticks = Number.isFinite(elapsedMs) ? Math.floor(Math.max(0, Math.min(elapsedMs, DATA.catchUpMaxMs)) / DATA.tickMs) : 0;
    catchingUp = true;
    try { for (var i = 0; i < ticks; i += 1) step(); }
    finally { catchingUp = false; }
    save();
    emit("stageStart", getState());
    emit("update", getState());
    return ticks;
  }
  function selectStage(index) {
    var unlocks = state.difficulty === "chaos" ? state.chaosUnlockedStages : state.unlockedStages;
    if (state.pendingReport || !Number.isInteger(index) || !unlocks.includes(index)) return false;
    state.currentStage = index;
    beginStage();
    save();
    emit("update", getState());
    return true;
  }
  function setMode(mode) {
    if (mode !== "repeat" && mode !== "challenge") return false;
    state.mode = mode;
    save();
    emit("update", getState());
    return true;
  }
  function save() {
    savedAt = Date.now();
    var json = JSON.stringify({ schemaVersion: DATA.schemaVersion, savedAt: savedAt, state: state });
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(storageKey, json);
      emit("saved", {});
    } catch (error) { emit("storageError", { message: "저장 공간을 사용할 수 없습니다. 이번 진행은 이 창에서만 유지됩니다." }); }
    return json;
  }
  function migrate(data) {
    if (data && data.schemaVersion === 1 && data.state && data.state.schemaVersion === 1) {
      data.schemaVersion = data.state.schemaVersion = 2;
      data.state.inventory = [];
      data.state.overflow = 0;
      data.state.nextItemUid = 1;
      data.state.mercenaries.forEach(function (m) { m.equipment = { weapon: null, hat: null, gloves: null, shoes: null }; });
    }
    if (data && data.schemaVersion === 2 && data.state && data.state.schemaVersion === 2 && expedition) expedition.migrate(data);
    if (!data || data.schemaVersion !== DATA.schemaVersion) throw new Error("지원하지 않는 저장 버전");
    return data;
  }
  function validate(candidate) {
    function natural(n) { return Number.isSafeInteger(n) && n >= 0; }
    function stage(n) { return natural(n) && n < DATA.stages.length; }
    function finite(n) { return Number.isFinite(n) && n >= 0; }
    if (!candidate || candidate.schemaVersion !== DATA.schemaVersion || !natural(candidate.gold) || !natural(candidate.squadCoins) ||
      !natural(candidate.rngSeed) || candidate.rngSeed > 4294967295 || !stage(candidate.currentStage) ||
      !["repeat", "challenge"].includes(candidate.mode) || !natural(candidate.transitionTicks) || candidate.transitionTicks > DATA.resultTicks) return false;
    if (!Array.isArray(candidate.unlockedStages) || !candidate.unlockedStages.includes(0) ||
      !(candidate.difficulty === "chaos" ? candidate.chaosUnlockedStages : candidate.unlockedStages).includes(candidate.currentStage) || !candidate.unlockedStages.every(stage) ||
      !Array.isArray(candidate.clearedStages) || !candidate.clearedStages.every(stage)) return false;
    if (!Array.isArray(candidate.mercenaries) || candidate.mercenaries.length !== 3 || !candidate.mercenaries.every(function (m, i) {
      return m.id === DATA.mercenaries[i].id && natural(m.level) && m.level >= 1 && m.level <= 10000 &&
        natural(m.xp) && m.xp < DATA.xpToNext(m.level) && typeof m.unlocked === "boolean";
    }) || !candidate.mercenaries[0].unlocked) return false;
    if (!equipment || !equipment.validate(candidate)) return false;
    if (!expedition || !expedition.validate(candidate)) return false;
    var stats = candidate.stats;
    if (!stats || !finite(stats.goldPerSec) || !finite(stats.killsPerSec) || !natural(stats.elapsedMs) ||
      !Array.isArray(stats.samples) || !stats.samples.every(function (s) { return natural(s.at) && s.at <= stats.elapsedMs && natural(s.gold); })) return false;
    var sim = candidate.battle;
    if (!sim || sim.stageIndex !== candidate.currentStage || !natural(sim.ticks) || sim.ticks > 600 ||
      !natural(sim.waveIndex) || sim.waveIndex > 2 || !["fighting", "clear", "fail"].includes(sim.status)) return false;
    function unit(u, side, index) {
      var definition = side === "enemy" ? null : DATA.mercenaries.find(function (m) { return m.id === u.id; });
      var wave = DATA.stages[sim.stageIndex].waves[sim.waveIndex];
      return u && typeof u.id === "string" && u.side === side && natural(u.position) && finite(u.hp) && finite(u.maxHp) &&
        u.maxHp > 0 && u.hp <= u.maxHp && finite(u.atk) && finite(u.def) && finite(u.attackSpeed) && u.attackSpeed > 0 &&
        finite(u.critChance) && u.critChance <= 1 && finite(u.critDamage) && Number.isFinite(u.cooldown) && Array.isArray(u.skills) &&
        (side === "enemy" ? u.position === index && u.type === wave[index] && u.id === "enemy-" + sim.waveIndex + "-" + index :
          definition && u.type === u.id && u.position === definition.position && candidate.mercenaries[definition.position].unlocked);
    }
    return Array.isArray(sim.units) && sim.units.length >= 1 && sim.units.length <= 3 &&
      new Set(sim.units.map(function (u) { return u.id; })).size === sim.units.length &&
      sim.units.every(function (u, i) { return unit(u, "mercenary", i) && (i === 0 || sim.units[i - 1].position < u.position); }) &&
      Array.isArray(sim.enemies) && sim.enemies.length === DATA.stages[sim.stageIndex].waves[sim.waveIndex].length &&
      sim.enemies.every(function (u, i) { return unit(u, "enemy", i); });
  }
  function validateSave(source) {
    try {
      var data = migrate(JSON.parse(source));
      return validate(data.state) && Number.isFinite(data.savedAt) && data.savedAt >= 0;
    } catch (error) { return false; }
  }
  function load(source) {
    try {
      var json = source === undefined ? (typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null) : source;
      if (!json) return false;
      var data = migrate(JSON.parse(json));
      if (!validate(data.state) || !Number.isFinite(data.savedAt) || data.savedAt < 0) throw new Error("손상된 저장 데이터");
      state = data.state;
      savedAt = data.savedAt;
      emit("stageStart", getState());
      emit("update", getState());
      if (state.pendingReport) emit("offlineReport", getState().pendingReport);
      return true;
    } catch (error) { emit("storageError", { message: "저장을 읽지 못했습니다. 현재 게임을 유지합니다." }); return false; }
  }
  function pause() {
    if (timer !== null) clearInterval(timer);
    if (autosave !== null) clearInterval(autosave);
    timer = null;
    autosave = null;
    save();
  }
  function resume() {
    if (timer === null) timer = setInterval(step, DATA.tickMs);
    if (autosave === null) autosave = setInterval(save, DATA.autosaveMs);
  }
  function reset(seed) {
    state = fresh(seed);
    beginStage();
    save();
    emit("update", getState());
  }
  function init() {
    if (load()) catchUp(Math.max(0, Date.now() - savedAt));
    else beginStage();
    emit("update", getState());
  }
  state = fresh();
  beginStage();
  return { on: on, rng: rng, getState: getState, getCP: getCP, step: step, catchUp: catchUp,
    mercenaryStats: mercenaryStats,
    registerExpedition: function (factory) {
      expedition = factory({ state: function () { return state; }, emit: emit, save: save, beginStage: beginStage,
        equipment: function () { return equipment; }, changed: function () { save(); emit("update", getState()); } });
      Object.assign(Game, expedition.api);
      delete Game.registerExpedition;
    },
    registerEquipment: function (factory) {
      equipment = factory({ state: function () { return state; }, emit: emit, save: save,
        changed: function () { save(); emit("equipmentChange", getState()); emit("update", getState()); } });
      Object.assign(Game, equipment.api);
      delete Game.registerEquipment;
    },
    selectStage: selectStage, setMode: setMode, save: save, load: load, validateSave: validateSave, reset: reset,
    init: init, pause: pause, resume: resume };
})();

// v2 network interface only. No requests, credentials, telemetry, or score submission in v1.
var Cloud = {
  save: async function () { throw new Error("v2"); },
  load: async function () { throw new Error("v2"); },
  submitScore: async function () { throw new Error("v2"); }
};
