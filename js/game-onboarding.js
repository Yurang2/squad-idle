"use strict";
Game.registerOnboarding(function (host) {
  function current() {
    var o=host.state().onboarding, next=o.completedSteps.length+1;
    return next<=6 && o.triggeredSteps.includes(next) ? next : null;
  }
  function observe(event) {
    var s=host.state(), o=s.onboarding;
    if(o.completedSteps.length===6)return;
    function trigger(n){if(!o.triggeredSteps.includes(n))o.triggeredSteps.push(n);}
    if(event==='stageStart')trigger(1);
    if(event==='captureAttempt' || event==='capture') {
      trigger(1);trigger(2);
      // DECISION: The first live capture replaces the battle introduction even without a tap.
      if(!o.completedSteps.length)o.completedSteps.push(1);
    }
    if(event==='capture')trigger(3);
    if(event==='campVisit')trigger(5);
    if(event==='gardenAssigned')trigger(6);
    if(['capture','update','stageStart'].includes(event)) {
      var groups={};s.roster.forEach(function(m){var key=m.speciesId+':'+m.evo;groups[key]=(groups[key]||0)+1;});
      if(Object.keys(groups).some(function(k){return Number(k.split(':')[1])<3 && groups[k]>=3;}))trigger(4);
    }
    o.triggeredSteps.sort(function(a,b){return a-b;});
  }
  function complete(step) {
    if(step!==current())return false;
    host.state().onboarding.completedSteps.push(step);
    // DECISION: Offline explanation follows the garden guide even if no idle worker is available yet.
    if(step===5)observe('gardenAssigned');
    host.changed();return true;
  }
  function skip() {
    host.state().onboarding={completedSteps:[1,2,3,4,5,6],triggeredSteps:[1,2,3,4,5,6]};
    host.changed();
  }
  function visit(tab) { if(tab==='camp'){observe('campVisit');host.changed();} }
  function sound(settings) {
    if(!settings || typeof settings.muted!=='boolean' || !Number.isFinite(settings.volume) || settings.volume<0 || settings.volume>1)return false;
    host.state().sound={muted:settings.muted,volume:settings.volume};host.changed();return true;
  }
  return {observe:observe,api:{onboardingStep:current,completeOnboarding:complete,skipOnboarding:skip,visitTab:visit,setSound:sound}};
});
