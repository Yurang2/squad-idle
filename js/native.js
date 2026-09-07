"use strict";

UI.native = (function () {
  var initialized = false;
  function isNative() { return !!window.Capacitor?.isNativePlatform(); }
  function plugin(name) {
    if (!isNative()) return null;
    var cap = window.Capacitor;
    return cap.Plugins?.[name] || cap.registerPlugin?.(name);
  }
  function safely(action) {
    try { Promise.resolve(action()).catch(function () {}); } catch (_) { /* Optional device capability. */ }
  }
  function vibrate(duration) {
    if (isNative()) safely(function () { return plugin("Haptics")?.vibrate({ duration: duration }); });
    else if (navigator.userActivation?.hasBeenActive) safely(function () { navigator.vibrate?.(duration); });
  }
  function init() {
    if (initialized || !isNative()) return;
    initialized = true;
    safely(function () {
      return plugin("App")?.addListener("appStateChange", function (state) { UI.setActive(state.isActive); });
    });
    safely(function () {
      return plugin("App")?.addListener("backButton", function () {
        if (!UI.closeOverlay()) safely(function () { return plugin("App")?.minimizeApp(); });
      });
    });
  }
  return { init: init, isNative: isNative, vibrate: vibrate };
})();
