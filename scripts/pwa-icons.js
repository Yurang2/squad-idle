"use strict";
const fs=require('node:fs'),path=require('node:path'),png=require('./png');
const root=path.resolve(__dirname,'..'), source=png.read(path.join(root,'assets/camp/campfire.png'));
fs.mkdirSync(path.join(root,'assets/pwa'),{recursive:true});
// Premultiplied-alpha area samples preserve the existing campfire's transparent edges.
for(const size of [192,512]){
  const data=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const color=[0,0,0];let alpha=0;
    for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
      const px=Math.min(source.width-1,Math.floor((x+(sx+.5)/4)/size*source.width));
      const py=Math.min(source.height-1,Math.floor((y+(sy+.5)/4)/size*source.height));
      const j=(py*source.width+px)*4,a=source.data[j+3]/255;alpha+=a;
      for(let k=0;k<3;k++)color[k]+=source.data[j+k]*a;
    }
    const i=(y*size+x)*4;
    [254,244,231].forEach((base,k)=>{data[i+k]=Math.round(color[k]/16+base*(1-alpha/16));});data[i+3]=255;
  }
  png.write(path.join(root,`assets/pwa/icon-${size}.png`),size,size,data);
}
console.log('PWA campfire icons: 192 / 512');
