"use strict";
(function(){
  // Native packages already bundle the shell; a SW is only needed on HTTP(S) websites.
  if(!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()))return;
  window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(function(){});});
})();
