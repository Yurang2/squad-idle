"use strict";
(function(){
  UI.initSound=function(){
    Sfx.configure(Game.getState().sound);
    function gesture(e){if(!e.isTrusted)return;Sfx.unlock();if(e.target.closest('button'))Sfx.play('tap');}
    document.addEventListener('pointerdown',gesture);
    document.addEventListener('keydown',function(e){if(e.key==='Enter' || e.key===' ')gesture(e);});
    ['hit','captureAttempt','capture','evolution'].forEach(function(event){Game.on(event,function(){Sfx.play(event);});});
    Game.on('update',function(s){Sfx.configure(s.sound);});
  };
  UI.renderSoundControls=function(content){
    var sound=Game.getState().sound;
    content.insertAdjacentHTML('afterbegin','<section class="sound-controls"><h3>소리</h3><label for="master-volume">전체 음량 <output id="volume-value">'+UI.fmt(sound.volume*100)+'%</output></label><input id="master-volume" type="range" min="0" max="100" step="1" value="'+sound.volume*100+'"><label class="mute-control"><input id="mute-sound" type="checkbox"'+(sound.muted?' checked':'')+'>음소거</label></section>');
    function change(){
      var volume=Number(document.getElementById('master-volume').value)/100, muted=document.getElementById('mute-sound').checked;
      document.getElementById('volume-value').textContent=UI.fmt(volume*100)+'%';Game.setSound({volume:volume,muted:muted});
    }
    document.getElementById('master-volume').oninput=change;document.getElementById('mute-sound').onchange=change;
  };
})();
