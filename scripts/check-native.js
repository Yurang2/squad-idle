"use strict";
// Adapter regression checks with mocked device capabilities; not a device build test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
async function main() {
  const calls = [], listeners = {};
  let now = 1000, open = null;
  const context = vm.createContext({
    window: {}, navigator: { userActivation: { hasBeenActive: true }, vibrate: ms => calls.push(["browser", ms]) },
    Date: { now: () => now },
    document: {
      querySelector: selector => open && selector.includes("#" + open.id + "[") ? open : null,
      getElementById: id => ({ open: open && open.id === id,
        close: () => { calls.push(["close", id]); open = null; },
        click: () => { calls.push(id === "close-evolution" ? ["close", "evolution-reveal"] : ["harvest"]); open = null; } })
    },
    Game: { pause: () => calls.push(["pause"]), resume: () => calls.push(["resume"]), catchUp: ms => calls.push(["catchUp", ms]) }
  });
  for (const file of ["js/ui.js", "js/native.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  context.UI.native.init(); context.UI.native.vibrate(30);
  assert.deepEqual(calls.splice(0), [["browser", 30]]);
  context.window.Capacitor = { isNativePlatform: () => true, registerPlugin(name) {
    if (name === "Haptics") return { vibrate: options => { calls.push(["haptics", options.duration]); return Promise.reject(new Error("Unavailable actuator")); } };
    return {
      addListener: (event, callback) => { assert.equal(listeners[event], undefined); listeners[event] = callback; return Promise.resolve({ remove() {} }); },
      minimizeApp: () => calls.push(["minimize"])
    };
  } };
  context.UI.native.init(); context.UI.native.init(); context.UI.native.vibrate(30);
  assert.deepEqual(calls.splice(0), [["haptics", 30]]);
  listeners.appStateChange({ isActive: false }); now += 10000; context.UI.setActive(false);
  now += 51000; context.UI.setActive(true); listeners.appStateChange({ isActive: true });
  assert.deepEqual(calls.splice(0), [["pause"], ["catchUp", 61000], ["resume"]]);
  for (const id of ["sheet", "evolution-reveal"]) {
    open = { id, close: () => { calls.push(["close", id]); open = null; } };
    listeners.backButton(); assert.deepEqual(calls.splice(0), [["close", id]]);
  }
  open = { id: "offline-report" }; listeners.backButton();
  assert.deepEqual(calls.splice(0), [["harvest"]]);
  listeners.backButton(); assert.deepEqual(calls.splice(0), [["minimize"]]);
  context.window.Capacitor.registerPlugin = () => { throw new Error("Missing plugin"); };
  context.UI.native.vibrate(30); listeners.backButton();
  await new Promise(resolve => setImmediate(resolve));
  console.log("PASS native/browser haptics, rejected/missing plugins, duplicate lifecycle events, overlay/back/minimize");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
