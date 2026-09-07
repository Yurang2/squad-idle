"use strict";
Game.registerExpedition(function (host) {
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function report(elapsedMs) {
    var s = host.state();
    // DECISION: Pending reports freeze combat/time; save rolled monsters and RNG together to prevent rerolls.
    if (s.pendingReport) { host.emit("offlineReport", copy(s.pendingReport)); return copy(s.pendingReport); }
    elapsedMs = Math.floor(Math.max(0, Math.min(Number.isFinite(elapsedMs) ? elapsedMs : 0, DATA.offline.maxMs)));
    var seconds = elapsedMs / 1000, stats = s.stats;
    // DECISION: Require 30 seconds of samples so one opening capture cannot imply ten captures per second for hours.
    var measured = stats.elapsedMs >= 30000 && stats.samples.length > 0 && stats.killsPerSec > 0;
    var rate = measured ? stats.killsPerSec : DATA.offline.fallbackKillsPerSec;
    var kills = rate * seconds * DATA.offline.efficiency;
    var goldRate = measured ? stats.goldPerSec : rate * DATA.goldPerKill(s.currentStage);
    var stage = DATA.stages[s.currentStage], species = stage.waves.flat();
    var bossShare = stage.boss ? 1 / species.length : 0;
    var captures = [], room = DATA.rosterCap - s.roster.length;
    // DECISION: Estimate capture windows at 20% HP, bounded by both encounters and the real 8s cooldown.
    // Unlike gold/XP's retained 70% efficiency, capture probability alone is exactly half the online probability.
    var attempts = Math.floor(Math.min(rate * seconds * (1 - bossShare), seconds / DATA.capture.cooldown));
    var eligible = stage.boss ? stage.waves.slice(0, 2).flat() : species;
    for (var i = 0; i < attempts && captures.length < room; i++) {
      var id = eligible[Math.floor(Game.rng() * eligible.length)];
      var boost = i % 3 === 0 ? 1.5 : 1;
      var chance = Battle.captureProbability(id, 0.2, Game.getRank(), boost) * DATA.offline.captureRate;
      if (Game.rng() < chance) captures.push(Game.rollMonster(id));
    }
    s.pendingReport = { elapsedMs: elapsedMs, gold: Math.floor(goldRate * seconds * DATA.offline.efficiency + 1e-8),
      xp: Math.floor(kills * DATA.balance.xpPerKill * (1 + bossShare * (DATA.balance.bossXpMultiplier - 1)) + 1e-8),
      monsters: captures, stageIndex: s.currentStage };
    host.save(); host.emit("offlineReport", copy(s.pendingReport)); return copy(s.pendingReport);
  }
  function harvest() {
    var s = host.state(), reward = s.pendingReport;
    if (!reward) return false;
    s.pendingReport = null; s.gold += reward.gold; host.monsters().grantXP(reward.xp);
    reward.monsters.forEach(function (m) { host.monsters().receive(m); });
    host.beginStage(); host.changed(); host.emit("harvest", copy(reward)); return copy(reward);
  }
  function exportSave() { return Game.save(); }
  function importSave(source) {
    if (!Game.validateSave(source) || !Game.load(source)) return false;
    // DECISION: Import restores exact state but starts its wall clock now; importing cannot mint offline rewards.
    host.changed(); return true;
  }
  return { report: report, api: { harvest: harvest, exportSave: exportSave, importSave: importSave } };
});
