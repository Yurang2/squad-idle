"use strict";
(function () {
  var captureFrame=0, cardFrame=0;
  UI.icon=function(name) {
    var paths={
      camp:'<path d="m3 20 9-16 9 16H3zm9-16v16m-5 0 5-8 5 8"/>',
      wood:'<path d="m9 3-6 9h4l-4 5h7v4h4v-4h7l-4-5h4l-6-9z"/>',
      stone:'<path d="m3 16 4-10 10-2 4 12-7 5-11-5zm4-10 7 15m7-5L7 6"/>',
      essence:'<path d="m12 2 7 10-7 10-7-10 7-10zm0 0v20m-7-10h14"/>',
      enhanceStone:'<path d="m5 6 7-4 7 4 2 10-9 6-9-6L5 6zm0 0 7 16 7-16M5 6h14"/>',
      accessory:'<path d="M4 4c0 12 16 12 16 0M9 16l3-3 3 3-3 5-3-5z"/>',
      gold:'<circle cx="12" cy="12" r="8"/><path d="M12 7v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9"/>',
      lantern:'<path d="M8 8h8l2 12H6L8 8zm1 0V5a3 3 0 0 1 6 0v3M5 20h14M9 12v4m6-4v4"/>',
      compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3z"/>',
      paw:'<ellipse cx="7" cy="7" rx="2" ry="3"/><ellipse cx="16" cy="6" rx="2" ry="3"/><ellipse cx="21" cy="12" rx="1.5" ry="2.5"/><ellipse cx="3" cy="13" rx="1.5" ry="2.5"/><path d="M7 15q5-8 10 0c6 8-16 8-10 0z"/>',
      book:'<path d="M12 5v16M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 2-4-4-9-2V4z"/>',
      settings:'<circle cx="12" cy="12" r="4"/><path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3z"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>'
    };
    return '<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.lantern)+'</svg>';
  };
  UI.sceneBackground=function(region) {
    var layer=document.getElementById("background-layer");
    if(layer.dataset.region===String(region))return; layer.dataset.region=region;
    // DECISION: Three sparse layers follow STYLE v2; old detailed/chibi backgrounds are retired.
    var distant=[
      '<path d="M0 145q60-40 120-8t130-4 125-5v90H0z" fill="#E6D8DF"/>',
      '<path d="m0 165 72-87 48 54 74-74 100 89 42-60 39 62v70H0z" fill="#DCCFD8"/>',
      '<path d="M0 135h74v19h50v-37h72v27h57v-42h72v46h50v74H0z" fill="#E6D8DF"/>'
    ][region];
    layer.innerHTML='<rect width="375" height="330" fill="url(#dawn)"/>'+distant+
      '<path d="M0 200q95-20 190 0t185-4v134H0z" fill="#FBE8DF"/><path d="M0 255q130-25 220-7t155-2v84H0z" fill="#FEF4E7"/>'+
      '<path d="M17 291h35m211 16h42M208 180h36" fill="none" stroke="#DCCFD8" stroke-width="1"/>';
  };
  function afterFrames(duration,fn,kind) {
    var started=performance.now();
    function frame(now) {
      if(now-started>=duration){fn();return;}
      if(kind==="pose")captureFrame=requestAnimationFrame(frame); else cardFrame=requestAnimationFrame(frame);
    }
    if(kind==="pose")captureFrame=requestAnimationFrame(frame); else cardFrame=requestAnimationFrame(frame);
  }
  UI.initArt=function() {
    Object.values(DATA.assets).forEach(function(src){var img=new Image();img.src=src;});
    Game.on("captureAttempt",function() {
      cancelAnimationFrame(captureFrame);
      var tamer=document.getElementById("tamer-image"); tamer.setAttribute("href",DATA.assets.tamerCapture);tamer.classList.add("capturing");
      afterFrames(120,function(){tamer.setAttribute("href",DATA.assets.tamer);tamer.classList.remove("capturing");},"pose");
    });
    Game.on("capture",function(e) {
      var target=document.getElementById("sprite-"+e.id);
      if(target) {
        var glow=UI.svgNode("circle",{cx:target.dataset.x,cy:Number(target.dataset.y)-25,r:37,class:"lantern-glow"});
        document.getElementById("effect-layer").appendChild(glow);glow.addEventListener("animationend",function(){glow.remove();},{once:true});
      }
      var species=DATA.species[e.monster.speciesId], rarity=DATA.rarities[e.monster.rarity];
      var card=document.getElementById("capture-reveal");cancelAnimationFrame(cardFrame);
      card.innerHTML='<div class="capture-card" style="border-color:'+rarity.color+'"><span>새로운 동료</span><img src="'+species.art+'" alt=""><strong>'+species.name+'</strong><small>'+rarity.name+'</small></div>';
      afterFrames(1800,function(){card.replaceChildren();},"card");
    });
    Game.on("captureFail",function(){UI.toast("랜턴 빛을 벗어났어요. 잠시 후 다시 시도합니다.");});
    Game.on("skill",function(e) {
      var unit=document.getElementById("sprite-"+e.id);
      var text=UI.svgNode("text",{x:unit?unit.dataset.x:60,y:unit?Number(unit.dataset.y)-72:97,"text-anchor":"middle",class:"skill-label"},e.name);
      document.getElementById("effect-layer").appendChild(text);text.addEventListener("animationend",function(){text.remove();},{once:true});
    });
  };
})();
