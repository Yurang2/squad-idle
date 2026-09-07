"use strict";
// DECISION: Sfx is the sole extra namespace authorized for M4; window.Audio stays untouched.
var Sfx=(function(){
  var context=null, master=null, pad=null, settings={volume:.35,muted:false}, camp=false, active=true, lastHit=-1;
  function safe(fn){try{return fn();}catch(_){return false;}}
  function ramp(param,value,seconds){
    param.cancelScheduledValues(context.currentTime);param.setValueAtTime(param.value,context.currentTime);
    param.linearRampToValueAtTime(value,context.currentTime+seconds);
  }
  function configure(value){
    if(value)settings={volume:Math.max(0,Math.min(1,value.volume)),muted:!!value.muted};
    safe(function(){if(master)ramp(master.gain,active&&!settings.muted?settings.volume:0,.15);});
  }
  function enabled(){return !!context && !!master && context.state==='running' && active && !settings.muted && settings.volume>0;}
  function ambient(){
    if(!context || !master)return;
    if(!pad && camp){
      var gain=context.createGain(), filter=context.createBiquadFilter();
      filter.type='lowpass';filter.frequency.value=420;gain.gain.value=0;
      filter.connect(gain);gain.connect(master);pad={gain:gain,voices:[]};
      [-5,5].forEach(function(detune){var o=context.createOscillator();o.frequency.value=174.61;o.detune.value=detune;o.connect(filter);o.start();pad.voices.push(o);});
    }
    if(pad)ramp(pad.gain.gain,camp&&active?.035:0,.8);
  }
  function unlock(){
    return safe(function(){
      if(!context){
        var Constructor=globalThis.AudioContext || globalThis.webkitAudioContext;
        if(!Constructor)return false;
        context=new Constructor();master=context.createGain();master.gain.value=0;master.connect(context.destination);
      }
      configure(settings);ambient();
      var resumed=context.resume();if(resumed && resumed.catch)resumed.catch(function(){});
      return true;
    }) || false;
  }
  function tone(frequency,start,duration,volume,rise,echo){
    var voice=context.createOscillator(), gain=context.createGain(), at=context.currentTime+start;
    voice.type='sine';voice.frequency.setValueAtTime(frequency,at);
    if(rise)voice.frequency.exponentialRampToValueAtTime(frequency*2,at+duration);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);voice.connect(gain);gain.connect(master);
    var delay, wet;
    if(echo){delay=context.createDelay(.5);wet=context.createGain();delay.delayTime.value=.13;wet.gain.value=.22;gain.connect(delay);delay.connect(wet);wet.connect(master);}
    voice.start(at);voice.stop(at+duration+.4);
    voice.onended=function(){voice.disconnect();gain.disconnect();if(delay){delay.disconnect();wet.disconnect();}};
  }
  function noise(duration,volume,cutoff){
    var length=Math.ceil(context.sampleRate*duration), buffer=context.createBuffer(1,length,context.sampleRate), data=buffer.getChannelData(0);
    // DECISION: Analytic pseudo-noise avoids spending gameplay RNG for sound (and uses no Math.random).
    for(var i=0;i<length;i++){var n=Math.sin((i+1)*12.9898)*43758.5453;data[i]=(n-Math.floor(n))*2-1;}
    var source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),at=context.currentTime;
    source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    source.connect(filter);filter.connect(gain);gain.connect(master);source.start();source.stop(at+duration);
    source.onended=function(){source.disconnect();filter.disconnect();gain.disconnect();};
  }
  function play(name){
    if(!enabled())return false;
    return safe(function(){
      if(name==='hit'){if(context.currentTime-lastHit<.08)return false;lastHit=context.currentTime;noise(.045,.14,1100);}
      if(name==='captureAttempt')tone(330,0,.22,.12,true);
      if(name==='capture') [523.25,783.99].forEach(function(f,i){tone(f,i*.13,.32,.12);});
      if(name==='evolution') [392,523.25,783.99].forEach(function(f,i){tone(f,i*.15,.45,.12,false,true);});
      if(name==='tap')tone(440,0,.055,.065);
      if(name==='sack')noise(.4,.16,750);
      return true;
    }) || false;
  }
  return {unlock:unlock,play:play,configure:configure,isEnabled:enabled,state:function(){return context?context.state:'unavailable';},
    setCamp:function(value){camp=!!value;safe(ambient);},setActive:function(value){active=!!value;configure(settings);safe(ambient);}};
})();
