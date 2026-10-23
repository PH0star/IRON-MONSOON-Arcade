import{W,H,GROUND,clamp,playerMuzzle}from'./engine.mjs';
import{equippedHeroPose,drawAtlasFrame}from'./hero-weapons.js';

export const MODERN_ASSETS=Object.freeze({
 background:'jungle.png',hero:'raven-atlas.png',heroUp:'raven-up.png',heroHeavy:'raven-heavy-atlas.png',heroSpread:'raven-spread-atlas.png',enemy:'enemy-atlas.png',
 hostage:'hostage.png',equipment:'equipment-atlas.png',drone:'gunship.png',boss:'goliath.png',effects:'explosion-atlas.png'
});

export async function loadModernAssets(onProgress=()=>{}){
 return loadAssetPack('modern',MODERN_ASSETS,onProgress);
}

export async function loadAssetPack(directory,manifest,onProgress=()=>{}){
 let complete=0;const total=Object.keys(manifest).length+1;
 const progress=()=>onProgress(++complete,total);
 const jobs=Object.entries(manifest).map(([key,file])=>new Promise((resolve,reject)=>{
  const img=new Image();img.decoding='async';img.onload=async()=>{try{await img.decode();progress();resolve([key,img]);}catch(error){reject(error);}};
  img.onerror=()=>reject(new Error('無法載入高清素材：'+file));img.src=new URL('./assets/'+directory+'/'+file,import.meta.url).href;
 }));
 jobs.push(fetch(new URL('./assets/'+directory+'/metadata.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('無法載入高清素材設定');return r.json();}).then(meta=>{progress();return['meta',meta];}));
 const entries=await Promise.all(jobs);return Object.fromEntries(entries);
}

export class ModernRenderer{
 constructor(context,assets,reduced=false){this.c=context;this.a=assets;this.reduced=reduced;this.clock=0;this.bursts=[];this.lastGameTime=0;this.textureCache=new Map();this.backdrop=this.prepareBackdrop();this.tracers={friendly:this.prepareTracer(false),enemy:this.prepareTracer(true)};this.embers=Array.from({length:30},(_,i)=>({x:(i*117.9)%W,y:(i*83.7)%530,s:.8+(i%3)*.4}));}
 surface(w,h){if(typeof document==='undefined')return null;const s=document.createElement('canvas');s.width=w;s.height=h;return s;}
 prepareBackdrop(){const img=this.a.background,s=this.surface(img.naturalWidth||img.width,img.naturalHeight||img.height);if(!s)return img;const c=s.getContext('2d',{alpha:false});c.filter='saturate(.76) brightness(.81)';c.drawImage(img,0,0);return s;}
 prepareTracer(enemy){const s=this.surface(176,48);if(!s)return null;const c=s.getContext('2d');c.scale(2,2);const color=enemy?'#ff985b':'#cbfff1';const glow=c.createRadialGradient(35,12,0,35,12,29);glow.addColorStop(0,enemy?'#ff7e3933':'#b5fbe52b');glow.addColorStop(1,'#00000000');c.fillStyle=glow;c.fillRect(0,0,88,24);const gr=c.createLinearGradient(8,12,73,12);gr.addColorStop(0,enemy?'#ff551400':'#7de9ed00');gr.addColorStop(.8,color);gr.addColorStop(1,'#ffffff');c.strokeStyle=gr;c.lineWidth=enemy?3.8:2.7;c.lineCap='round';c.beginPath();c.moveTo(8,12);c.lineTo(73,12);c.stroke();return s;}
 resetEffects(){this.bursts=[];}
 onEvent(e,g){if(e.type==='start')this.resetEffects();if(e.type==='explode')this.burst(e.x,e.y,170,.85);else if(e.type==='kill')this.burst(e.x,e.y,e.mechanical?94:40,e.mechanical?.65:.25);else if(e.type==='crate')this.burst(e.x,e.y,42,.3);}
 burst(x,y,size,life){if(!Number.isFinite(x)||!Number.isFinite(y))return;this.bursts.push({x,y,size,life,max:life});this.bursts=this.bursts.slice(-16);}
 pathRect(x,y,w,h,r=4){this.c.beginPath();this.c.roundRect(x,y,w,h,r);}
 fillRect(x,y,w,h,color,r=0){this.c.fillStyle=color;if(r){this.pathRect(x,y,w,h,r);this.c.fill();}else this.c.fillRect(x,y,w,h);}
 gradient(x,y,w,h,colors){const gr=this.c.createLinearGradient(x,y,x+w,y+h);colors.forEach((s,i)=>gr.addColorStop(i/(colors.length-1),s));return gr;}
 image(key,crop,x,y,w,h){const img=this.a[key],tw=key==='effects'?384:Math.max(1,Math.ceil(w*2)),th=key==='effects'?384:Math.max(1,Math.ceil(h*2));const id=[key,crop.x,crop.y,crop.w,crop.h,tw,th].join(':');let texture=this.textureCache.get(id);if(!texture){texture=this.surface(tw,th);if(texture){const c=texture.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';drawAtlasFrame(c,img,crop,0,0,tw,th);this.textureCache.set(id,texture);}}if(texture)this.c.drawImage(texture,x,y,w,h);else drawAtlasFrame(this.c,img,crop,x,y,w,h);}
 label(text,x,y,size=12,color='#e8f6ea',align='center'){const c=this.c;c.save();c.font=`700 ${size}px Arial, sans-serif`;c.textAlign=align;c.shadowColor='#091913';c.shadowBlur=4;c.fillStyle=color;c.fillText(text,x,y);c.restore();}
 draw(g,dt){const c=this.c;this.clock+=dt;if(g.t<this.lastGameTime)this.resetEffects();this.lastGameTime=g.t;
  if(g.state==='playing'||g.state==='won'||g.state==='over'){for(const b of this.bursts)b.life-=dt;this.bursts=this.bursts.filter(b=>b.life>0);}
  const menu=g.state==='menu',cam=menu?300+Math.sin(this.clock*.04)*55:g.camera;
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  if(!menu&&!this.reduced&&g.shake>0)c.translate(Math.sin(this.clock*91)*g.shake*.25,Math.cos(this.clock*67)*g.shake*.18);
  this.background(cam,g.section);
  if(menu){this.boss(905,GROUND-190,{phase:this.clock,hp:210,maxHp:210,cd:0},true);this.actor({x:710,y:GROUND-70,face:1,inv:0,weapon:'RIFLE'},true,{t:this.clock});this.crate({x:803,y:GROUND-54,content:'H'});this.drone({x:843,y:GROUND-275,w:38,h:32,phase:this.clock,face:-1,flash:0});}
  else{
   c.save();const zoom=1.14;c.translate(W*.31*(1-zoom),GROUND*(1-zoom));c.scale(zoom,zoom);c.translate(-cam,0);
   for(const p of g.platforms)if(p.x>cam-260&&p.x<cam+W+200)this.platform(p);
   for(const p of g.prisoners)if(!p.freed&&p.x>cam-100&&p.x<cam+W+100)this.hostage(p);
   for(const p of g.crates)if(!p.dead&&p.x>cam-100&&p.x<cam+W+100)this.crate(p);
   for(const e of g.enemies){if(e.dead||e.x<cam-140||e.x>cam+W+140)continue;this.shadow(e.x+e.w/2,GROUND,e.type==='drone'?28:25);if(e.type==='soldier')this.actor(e,false,{t:e.phase,walk:Math.abs(e.x-g.player.x)>240});else if(e.type==='turret')this.turret(e);else this.drone(e);}
   if(g.boss.x>cam-430&&g.boss.x<cam+W+430)this.boss(g.boss.x,g.boss.y,g.boss);
   this.actor(g.player,true,{t:g.t,walk:Math.abs(g.player.vx)>0,air:!g.player.grounded,crouch:g.player.crouch,aim:g.player.aim,shoot:g.player.gun>.025});
   for(const b of g.bullets)this.projectile(b);
   for(const gr of g.grenades){c.save();c.translate(gr.x,gr.y);c.rotate(g.t*9);const crop=this.a.meta.equipment.frames[3];this.image('equipment',crop,-6,-10,12,20);c.restore();}
   for(const item of g.pickups)this.pickup(item);
   this.particles(g.particles);this.explosions();
   for(const p of g.popups){c.save();c.globalAlpha=clamp(p.life,0,1);this.label(p.text,p.x,p.y,13,p.color);c.restore();}
   c.restore();
   if(g.flash>0){const edge=c.createRadialGradient(W/2,H/2,200,W/2,H/2,760);edge.addColorStop(0,(this.damageColor||'#ef6035')+'00');edge.addColorStop(1,(this.damageColor||'#ef6035')+'80');c.fillStyle=edge;c.fillRect(0,0,W,H);}
  }
  this.atmosphere(cam);c.restore();
 }
 background(cam,sector){const c=this.c;this.fillRect(0,0,W,H,'#243a35');const img=this.backdrop,offset=(cam*.14)%W;
  for(let i=0;i<2;i++){const x=i*W-offset;if(x>=W||x+W<=0)continue;c.save();c.translate(x,3);if(i%2){c.translate(W,0);c.scale(-1,1);}c.drawImage(img,0,0,W,H);c.restore();}
  const haze=c.createLinearGradient(0,0,0,GROUND);haze.addColorStop(0,'#193c4d22');haze.addColorStop(.7,'#789a9a08');haze.addColorStop(1,'#061b1835');c.fillStyle=haze;c.fillRect(0,0,W,GROUND);
  if(sector===1)this.fillRect(0,0,W,H,'#2d6f7720');if(sector===2)this.fillRect(0,0,W,H,'#74492618');
  c.fillStyle=this.gradient(0,GROUND-2,0,18,['#a8a981','#626d52','#273d33','#102a23']);c.fillRect(0,GROUND-2,W,18);
  this.fillRect(0,GROUND-2,W,1,'#e8d5a6aa');
  for(let i=0;i<32;i++){const x=((i*53-cam*.9)%W+W)%W;this.fillRect(x,GROUND+2,37,1,'#bac1a426');c.fillStyle='#081e1880';c.beginPath();c.ellipse(x+16,GROUND+6,8,1.2,0,0,Math.PI*2);c.fill();}
  // Smooth foreground leaves share the same material and lighting direction as the scene.
  c.save();c.globalAlpha=.65;for(let i=0;i<7;i++){const x=((i*251-cam*.5)%1600+1600)%1600-140;for(let j=0;j<5;j++){c.fillStyle=j%2?'#233d2e':'#354d35';c.beginPath();c.ellipse(x+j*10,H-j*6,22,5,-.7-j*.15,0,Math.PI*2);c.fill();}}c.restore();
 }
 atmosphere(cam){const c=this.c;if(this.reduced)return;c.save();for(const p of this.embers){const x=(p.x+this.clock*(3+p.s)-cam*.05+W*10)%W,y=p.y+Math.sin(this.clock*.3+p.x)*7;c.globalAlpha=.1+(Math.sin(this.clock+p.x)+1)*.055;c.fillStyle='#ffe9b9';c.beginPath();c.arc(x,y,p.s,0,Math.PI*2);c.fill();}c.restore();}
 shadow(x,y,r=25){const c=this.c;c.save();c.translate(x,y+3);c.scale(1,.2);const gr=c.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,'#03130fbb');gr.addColorStop(1,'#03130f00');c.fillStyle=gr;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.restore();}
 actor(p,hero,{t=0,walk=false,air=false,crouch=false,aim=false,shoot=false}={}){const c=this.c,cx=p.x+18,feet=p.y+(hero?70:p.h||64),bob=this.reduced?0:walk?Math.sin(t*20)*1.1:Math.sin(t*2)*.35;
  this.shadow(cx,GROUND,hero?27:23);
  if(hero){c.save();c.strokeStyle='#91ead6aa';c.lineWidth=1.4;c.beginPath();c.ellipse(cx,feet+2,18,4,0,0,Math.PI*2);c.stroke();c.restore();}
  const equipped=hero&&equippedHeroPose('modern',p,{t,walk,air,crouch,aim,shoot});
  c.save();c.translate(cx,feet+(equipped?0:bob));c.scale(p.face||1,1);
  if(hero&&p.inv>0)c.globalAlpha=.86+Math.sin(this.clock*22)*.1;
  c.shadowColor=hero?'#99f5dfaa':'#061713aa';c.shadowBlur=hero?4:2;if(!hero&&p.flash>0)c.filter='brightness(2)';
  if(equipped){const{key,crop,x,y,w,h}=equipped;this.image(key,crop,x,y,w,h);}
  else if(hero&&aim){const crop=this.a.meta.heroUp.crop;const h=92,w=h*crop.w/crop.h;this.image('heroUp',crop,12-w*.68,-h,w,h);}
  else{const key=hero?'hero':'enemy',meta=this.a.meta[key];const frame=crouch?5:air?4:walk?1+Math.floor(t*10)%3:0,crop=meta.frames[frame];const scale=(hero?82:74)/meta.frames[0].h;const h=crop.h*scale,w=crop.w*scale;const dx=-w*.46;this.image(key,crop,dx,-h-(air?8:0),w,h);}
  c.restore();
  if(hero){this.label('1P',cx,feet-(aim?110:crouch?76:100),9,'#aff6e4');this.weapon(p,shoot);}
 }
 weapon(p,shoot){const m=playerMuzzle(p);
  if(shoot)this.muzzle(m.x,m.y,m.angle,p.weapon==='HEAVY'?1.15:1);
 }
 muzzle(x,y,angle,scale=1){const c=this.c;c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.globalCompositeOperation='screen';const gr=c.createRadialGradient(6,0,0,6,0,28);gr.addColorStop(0,'#ffffef');gr.addColorStop(.18,'#fff7bc');gr.addColorStop(.4,'#ffc561d9');gr.addColorStop(1,'#f77c1900');c.fillStyle=gr;c.beginPath();c.ellipse(10,0,27,13,0,0,Math.PI*2);c.fill();c.fillStyle='#fffbe1';c.beginPath();c.moveTo(0,-2);c.lineTo(25,0);c.lineTo(0,2);c.closePath();c.fill();c.restore();}
 projectile(b){const c=this.c;c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.globalCompositeOperation='screen';const texture=b.enemy?this.tracers.enemy:this.tracers.friendly;if(texture)c.drawImage(texture,-34,-8,45,16);else{const color=b.enemy?'#ff985b':'#cbfff1';c.strokeStyle=this.gradient(-28,0,35,0,[b.enemy?'#ff551400':'#7de9ed00',color,'#ffffff']);c.lineWidth=b.enemy?3.8:2.7;c.lineCap='round';c.beginPath();c.moveTo(-28,0);c.lineTo(7,0);c.stroke();}c.restore();}
 crate(p){const c=this.c,crop=this.a.meta.equipment.frames[5];this.shadow(p.x+27,p.y+54,29);this.image('equipment',crop,p.x-3,p.y+3,60,51);this.fillRect(p.x+16,p.y+19,24,20,'#0d2924d9',3);this.label(p.content==='MED'?'+':p.content,p.x+28,p.y+34,15,p.content==='MED'?'#b5f6c5':'#d4f6da');}
 pickup(p){const c=this.c,y=p.y+(this.reduced?0:Math.sin(this.clock*4)*4),x=p.x;const color=p.type==='MED'?'#9df0ad':p.type==='G'?'#f1c87a':'#a4ecde';c.save();c.shadowColor=color;c.shadowBlur=10;this.fillRect(x-6,y-3,46,38,'#0f2928de',5);c.shadowBlur=0;c.strokeStyle=color+'99';c.lineWidth=1;this.pathRect(x-6,y-3,46,38,5);c.stroke();const idx=p.type==='MED'?6:p.type==='G'?3:p.type==='S'?2:1,crop=this.a.meta.equipment.frames[idx],w=p.type==='G'?13:32,h=Math.min(24,w*crop.h/crop.w);this.image('equipment',crop,x+17-w/2,y+12-h/2,w,h);this.label(p.type==='MED'?'+':p.type,x+17,y+30,10,color);c.restore();}
 hostage(p){const crop=this.a.meta.hostage.crop,h=83,w=h*crop.w/crop.h,feet=p.y+56;this.shadow(p.x+15,feet,21);this.c.save();this.c.shadowColor='#d6d2ac66';this.c.shadowBlur=2;this.image('hostage',crop,p.x+15-w/2,feet-h+(this.reduced?0:Math.sin(this.clock*2)*.4),w,h);this.c.restore();this.label('RESCUE',p.x+15,feet-h-12,9,'#f4e2b4');this.c.strokeStyle='#e0c590aa';this.c.lineWidth=1;this.c.beginPath();this.c.moveTo(p.x+11,feet-h-7);this.c.lineTo(p.x+15,feet-h-4);this.c.lineTo(p.x+19,feet-h-7);this.c.stroke();}
 platform(p){const c=this.c;c.fillStyle=this.gradient(p.x,p.y,0,23,['#a3b6a3','#536f60','#203b33']);this.pathRect(p.x,p.y,p.w,22,3);c.fill();this.fillRect(p.x+3,p.y+2,p.w-6,2,'#e9ebc6aa');this.fillRect(p.x+7,p.y+16,p.w-14,4,'#102d27');for(let x=p.x+10;x<p.x+p.w-5;x+=28){c.fillStyle='#c5d1b4';c.beginPath();c.arc(x,p.y+8,1.5,0,Math.PI*2);c.fill();}for(const x of[p.x+9,p.x+p.w-18]){c.fillStyle=this.gradient(x,p.y+22,10,0,['#17352a','#5c7660','#203c30']);c.fillRect(x,p.y+22,10,GROUND-p.y-22);}}
 turret(e){const c=this.c,crop=this.a.meta.equipment.frames[7];c.save();c.translate(e.x+30,e.y+52);c.scale(e.face||-1,1);if(e.flash>0)c.filter='brightness(2)';this.image('equipment',crop,-33,-58,82,58);c.restore();}
 drone(e){const c=this.c,crop=this.a.meta.drone.crop,w=112,h=w*crop.h/crop.w;c.save();c.translate(e.x+e.w/2,e.y+e.h/2);c.scale(e.face===1?-1:1,1);if(e.flash>0)c.filter='brightness(2)';c.shadowColor='#081b1699';c.shadowBlur=4;this.image('drone',crop,-w/2,-h/2,w,h);c.shadowBlur=0;c.filter='none';if(!this.reduced){c.strokeStyle='#e3ca9caa';c.lineWidth=1;for(const [x,y]of[[-20,-h*.34],[30,-h*.29]]){const dx=Math.cos(this.clock*60+x)*16,dy=Math.sin(this.clock*60+x)*2.5;c.beginPath();c.moveTo(x-dx,y-dy);c.lineTo(x+dx,y+dy);c.stroke();}}c.restore();}
 boss(x,y,b,preview=false){const c=this.c,crop=this.a.meta.boss.crop;c.save();c.translate(x,y+(this.reduced?0:Math.sin(b.phase*2)*.6));this.shadow(165,190,185);if(b.flash>0)c.filter='brightness(1.8)';this.image('boss',crop,-75,190-191,425,191);c.filter='none';if(!preview&&b.active&&b.cd>1.55)this.muzzle(-75,60,Math.PI,2);if(b.hp<b.maxHp*.4){for(let i=0;i<7;i++){c.globalAlpha=.16;const r=13+i*2,xx=260+Math.sin(this.clock+i)*10,yy=42-i*10-(this.clock*17)%20;const gr=c.createRadialGradient(xx,yy,0,xx,yy,r);gr.addColorStop(0,'#0b1713');gr.addColorStop(1,'#0b171300');c.fillStyle=gr;c.beginPath();c.arc(xx,yy,r,0,Math.PI*2);c.fill();}c.globalAlpha=1;}c.restore();}
 particles(parts){const c=this.c;c.save();for(const p of parts){if(p.kind==='fire')continue;c.globalAlpha=clamp(p.life/.55,0,.9);if(p.kind==='dust'){const gr=c.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*1.7);gr.addColorStop(0,'#d3bf9855');gr.addColorStop(1,'#9e8b5d00');c.fillStyle=gr;c.beginPath();c.arc(p.x,p.y,p.size*1.7,0,Math.PI*2);c.fill();}else{c.strokeStyle=p.kind==='muzzle'?'#fff6bc':'#f8c68b';c.lineWidth=1.3;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.018,p.y-p.vy*.018);c.stroke();}}c.restore();}
 explosions(){const c=this.c,frames=this.a.meta.effects.frames;for(const b of this.bursts){const t=1-b.life/b.max,frame=Math.min(7,Math.floor(t*8)),size=b.size*(.6+Math.min(1,t*4)*.55);c.save();c.globalAlpha=Math.min(1,b.life*4);this.image('effects',frames[frame],b.x-size/2,b.y-size/2,size,size);if(t<.4){c.strokeStyle='#ffe0a2'+Math.round((1-t/.4)*100).toString(16).padStart(2,'0');c.lineWidth=1.5;c.beginPath();c.ellipse(b.x,b.y,size*(.3+t),size*(.2+t*.6),0,0,Math.PI*2);c.stroke();}c.restore();}}
}
