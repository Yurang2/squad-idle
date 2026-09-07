"use strict";
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const files=['data','data-monsters','data-art','data-progression','data-camp','battle','game','game-monsters','game-progression','game-camp','game-expedition','game-save','game-onboarding'];
function runtime(){
  const storage=new Map(),timers=new Map();let id=0;
  const c=vm.createContext({console,Date,setInterval:(f,ms)=>{timers.set(++id,{f,ms});return id;},clearInterval:i=>timers.delete(i),
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
  files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c,{filename:f+'.js'}));
  return {...c,storage,timers};
}
module.exports={runtime,files};
