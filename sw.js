"use strict";
importScripts('./sw-shell.js');
// DECISION: Scope-specific caches coexist with other GitHub Pages apps on the same origin.
const PREFIX='monster-tamer:'+self.registration.scope+':';
const CACHE=PREFIX+'0.8.0-m4-1';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(self.APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET' || !url.href.startsWith(self.registration.scope))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(request,{ignoreSearch:true});
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok && response.type==='basic')await cache.put(request,response.clone());
      return response;
    }catch(error){
      if(request.mode==='navigate')return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  }));
});
