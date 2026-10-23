export const W=1280,H=720,GROUND=550,END=7200;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export const playerMuzzle=p=>{const upgraded=p.weapon==='HEAVY'||p.weapon==='SPREAD';return{x:p.x+18+p.face*(p.aim?12:p.weapon==='HEAVY'?48:36),y:p.aim?p.y-22:p.y+(p.crouch?(upgraded?34:51):(upgraded?18:27)),angle:p.aim?-Math.PI/2:p.face===1?0:Math.PI};};
export const projectileBox=b=>({x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h});
export class FrameClock{
 constructor(){this.accumulator=0;}
 reset(){this.accumulator=0;}
 advance(elapsed,step){this.accumulator+=clamp(elapsed,0,.1);let count=0;while(this.accumulator+1e-9>=1/60&&count<6){step(1/60);this.accumulator-=1/60;count++;}return count;}
}
export class Game{
 constructor({random=Math.random,onEvent=()=>{}}={}){this.random=random;this.onEvent=onEvent;this.reset();}
 emit(type,data={}){this.onEvent({type,...data});}
 reset(mode='arcade'){
  this.state='menu';this.mode=mode;this.t=0;this.score=0;this.kills=0;this.rescued=0;this.camera=0;this.shake=0;this.flash=0;this.section=0;this.banner=0;this.checkpoint=90;
  this.player={x:320,y:GROUND-70,w:36,h:70,vx:0,vy:0,face:1,hp:mode==='practice'?9:5,maxHp:mode==='practice'?9:5,grounded:true,inv:0,gun:0,weapon:'RIFLE',ammo:0,grenades:8,grenadeCd:0,jumpHeld:false,grenadeHeld:false,crouch:false,aim:false};
  this.enemies=[];this.bullets=[];this.grenades=[];this.particles=[];this.popups=[];this.pickups=[];this.crates=[];this.prisoners=[];this.platforms=[];
  this.boss={x:END-650,y:GROUND-190,w:330,h:190,hp:210,maxHp:210,active:false,cd:1.7,burst:0,phase:0,flash:0};
  let id=0;
  for(let x=720;x<END-1000;x+=340+this.random()*160){let type=id%5===3?'turret':id%6===4?'drone':'soldier';this.enemies.push({id:id++,type,x,y:type==='drone'?GROUND-210:GROUND-(type==='turret'?52:64),w:type==='turret'?60:38,h:type==='turret'?52:type==='drone'?32:64,hp:type==='turret'?8:type==='drone'?4:3,cd:1+this.random()*2,face:-1,phase:this.random()*6,flash:0});}
  for(const x of [1350,2550,3800,4900,5900])this.platforms.push({x,y:GROUND-115,w:200,h:22});
  for(const [i,x] of [500,1780,2850,4200,5350,6320].entries())this.crates.push({x,y:GROUND-54,w:54,h:54,hp:3,content:['H','G','S','MED','H','G'][i]});
  for(const x of [1150,3350,5520])this.prisoners.push({x,y:GROUND-56,w:30,h:56,freed:false});
 }
 start(mode='arcade'){this.reset(mode);this.state='playing';this.banner=3;this.emit('start');}
 pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
 particlesAt(x,y,n=12,kind='spark'){for(let i=0;i<n;i++){const a=this.random()*Math.PI*2,s=50+this.random()*220;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,life:.25+this.random()*.65,max:.9,size:2+this.random()*7,kind});}}
 popup(x,y,text,color='#ffe4a3'){this.popups.push({x,y,text,color,life:1.3});}
 damagePlayer(n=1){const p=this.player;if(p.inv>0||this.state!=='playing')return;p.hp-=n;p.inv=2;this.shake=10;this.flash=.15;this.particlesAt(p.x+18,p.y+30,12);this.emit('hurt');if(p.hp<=0){p.hp=0;this.state='over';this.particlesAt(p.x,p.y,40,'fire');this.emit('over');}}
 drop(x,y,type){this.pickups.push({x,y,w:32,h:32,type,life:24});}
 collect(item){const p=this.player;this.score+=100;if(item.type==='H'||item.type==='S'){p.weapon=item.type==='H'?'HEAVY':'SPREAD';p.ammo=item.type==='H'?180:90;this.popup(item.x,item.y,item.type==='H'?'HEAVY MACHINE GUN':'SPREAD SHOT','#ffd167');}else if(item.type==='G'){p.grenades=Math.min(20,p.grenades+5);this.popup(item.x,item.y,'GRENADE +5');}else{p.hp=Math.min(p.maxHp,p.hp+2);this.popup(item.x,item.y,'HP +2','#a9f6b9');}this.emit('pickup');}
 kill(e){if(e.dead)return;e.dead=true;this.kills++;this.score+=e.type==='turret'?300:100;this.particlesAt(e.x+e.w/2,e.y+e.h/2,e.type==='turret'?25:15,e.type==='soldier'?'spark':'fire');this.popup(e.x,e.y,'+'+(e.type==='turret'?300:100));this.emit('kill',{x:e.x+e.w/2,y:e.y+e.h/2,mechanical:e.type!=='soldier'});}
 explosion(x,y,r=150){this.particlesAt(x,y,55,'fire');this.shake=15;this.emit('explode',{x,y});for(const e of this.enemies)if(!e.dead&&Math.hypot(e.x+e.w/2-x,e.y+e.h/2-y)<r){e.hp-=12;e.flash=.15;if(e.hp<=0)this.kill(e);}
  for(const c of this.crates)if(!c.dead&&Math.hypot(c.x+27-x,c.y+27-y)<r){c.dead=true;this.drop(c.x,c.y,c.content);}
  const b=this.boss;if(b.active&&b.hp>0&&Math.hypot(b.x+b.w/2-x,b.y+100-y)<r+120)this.hitBoss(20);
 }
 hitBoss(n){const b=this.boss;if(b.hp<=0)return;b.hp=Math.max(0,b.hp-n);b.flash=.08;if(b.hp===0){this.score+=5000;this.shake=25;this.particlesAt(b.x+160,b.y+80,120,'fire');this.emit('explode',{x:b.x+160,y:b.y+80});this.state='won';this.emit('win');}}
 shoot(){const p=this.player;const {x,y,angle:heading}=playerMuzzle(p);let angles=p.weapon==='SPREAD'?[-.19,0,.19]:[0];for(const a of angles){const angle=heading+a,cos=Math.cos(angle),sin=Math.sin(angle);this.bullets.push({x,y,vx:cos*1000,vy:sin*1000,w:Math.abs(cos)*16+Math.abs(sin)*5,h:Math.abs(sin)*16+Math.abs(cos)*5,enemy:false,dmg:p.weapon==='HEAVY'?2:1,life:1.1});}
  p.gun=p.weapon==='HEAVY'?.075:p.weapon==='SPREAD'?.18:.135;if(p.ammo>0){p.ammo--;if(p.ammo===0)p.weapon='RIFLE';}this.emit('shoot',{heavy:p.weapon==='HEAVY'});this.particlesAt(x,y,2,'muzzle');
 }
 step(dt,input={}){
  if(this.state!=='playing')return;
  dt=Math.min(dt,.034);this.t+=dt;this.banner=Math.max(0,this.banner-dt);this.shake=Math.max(0,this.shake-dt*30);this.flash=Math.max(0,this.flash-dt);
  const p=this.player;p.inv=Math.max(0,p.inv-dt);p.gun=Math.max(0,p.gun-dt);p.grenadeCd=Math.max(0,p.grenadeCd-dt);
  p.crouch=!!input.down&&!input.up&&p.grounded;p.aim=!!input.up;
  let axis=(input.right?1:0)-(input.left?1:0);p.vx=axis*(p.crouch?100:285);if(axis)p.face=axis;
  if(input.jump&&!p.jumpHeld&&p.grounded){p.vy=-650;p.grounded=false;this.emit('jump');this.particlesAt(p.x+18,p.y+70,7,'dust');}p.jumpHeld=!!input.jump;
  if(input.fire&&p.gun===0)this.shoot();
  if(input.grenade&&!p.grenadeHeld&&p.grenades>0&&p.grenadeCd===0){p.grenades--;p.grenadeCd=.5;this.grenades.push({x:p.x+18,y:p.y+20,vx:p.face*440,vy:-490,life:1.1,bounces:0});this.emit('throw');}p.grenadeHeld=!!input.grenade;
  const oldBottom=p.y+p.h;p.x=clamp(p.x+p.vx*dt,Math.max(0,this.camera-50),END-p.w);p.vy+=1680*dt;p.y+=p.vy*dt;p.grounded=false;
  let floor=GROUND;
  if(p.vy>=0)for(const plat of this.platforms)if(p.x+p.w>plat.x&&p.x<plat.x+plat.w&&oldBottom<=plat.y+4&&p.y+p.h>=plat.y)floor=Math.min(floor,plat.y);
  if(p.y+p.h>=floor){p.y=floor-p.h;p.vy=0;p.grounded=true;}
  this.camera=clamp(Math.max(this.camera,p.x-W*.31),0,END-W);
  let section=Math.min(2,Math.floor(p.x/2400));if(section!==this.section){this.section=section;this.banner=3;this.checkpoint=section*2400;this.emit('sector');}
  for(const person of this.prisoners)if(!person.freed&&Math.abs(person.x-p.x)<65){person.freed=true;this.rescued++;this.score+=500;this.drop(person.x,person.y,'H');this.popup(person.x,person.y-30,'RESCUED +500','#b7f6d5');this.emit('rescue');}
  for(const e of this.enemies){if(e.dead||e.x<this.camera-150||e.x>this.camera+W+150)continue;e.flash=Math.max(0,e.flash-dt);e.phase+=dt;e.face=p.x<e.x?-1:1;
   if(e.type==='drone')e.y=GROUND-200+Math.sin(e.phase*2)*50;
   if(e.type==='soldier'&&Math.abs(e.x-p.x)>240)e.x+=e.face*45*dt;
   e.cd-=dt;if(e.cd<=0&&Math.abs(p.x-e.x)<1000){e.cd=e.type==='turret'?2:e.type==='drone'?1.8:2.6;const sx=e.x+e.w/2,sy=e.y+(e.type==='soldier'?27:17);const target=p.y+(p.crouch?48:28),a=Math.atan2(target-sy,p.x+18-sx);const speed=e.type==='turret'?300:245;let spread=e.type==='turret'?[-.14,0,.14]:[0];for(const d of spread)this.bullets.push({x:sx,y:sy,vx:Math.cos(a+d)*speed,vy:Math.sin(a+d)*speed,w:12,h:10,enemy:true,dmg:1,life:5});this.emit('enemyShoot');}
   if(overlap({x:p.x+4,y:p.y+10,w:p.w-8,h:p.h-10},e))this.damagePlayer();
  }
  for(const c of this.crates)if(!c.dead&&overlap({x:p.x,y:p.y,w:p.w,h:p.h},c)){// Supply crates never block progress.
   if(Math.abs(p.x-c.x)<35&&input.down){c.dead=true;this.collect({x:c.x,y:c.y,type:c.content});}
  }
  const boss=this.boss;if(!boss.active&&p.x>END-1550){boss.active=true;this.banner=3;this.emit('boss');}
  if(boss.active&&boss.hp>0){boss.flash=Math.max(0,boss.flash-dt);boss.phase+=dt;boss.cd-=dt;
   if(boss.cd<0){boss.cd=boss.hp<boss.maxHp*.5?1.1:1.65;const a=Math.atan2(p.y+40-(boss.y+65),p.x+18-(boss.x+10));for(let i=-1;i<=1;i++)this.bullets.push({x:boss.x-25,y:boss.y+65,vx:Math.cos(a+i*.16)*320,vy:Math.sin(a+i*.16)*320,w:17,h:14,enemy:true,life:5});if(boss.hp<boss.maxHp*.5)this.bullets.push({x:boss.x,y:GROUND-20,vx:-390,vy:0,w:22,h:18,enemy:true,life:5});this.emit('cannon');this.shake=5;}
   if(overlap(p,{x:boss.x+15,y:boss.y+35,w:boss.w-30,h:boss.h-35})){this.damagePlayer();p.x=Math.min(p.x,boss.x-p.w-5);}
  }
  for(const g of this.grenades){g.life-=dt;g.vy+=1050*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;if(g.y>GROUND-8){g.y=GROUND-8;g.vy=-g.vy*.4;g.vx*=.65;g.bounces++;}if(g.life<=0)this.explosion(g.x,g.y);}
  this.grenades=this.grenades.filter(g=>g.life>0);
  for(const bullet of this.bullets){bullet.life-=dt;bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;if(bullet.enemy){let box={x:p.x+4,y:p.y+(p.crouch?36:8),w:28,h:p.crouch?34:62};if(overlap({x:bullet.x-5,y:bullet.y-4,w:bullet.w,h:bullet.h},box)){this.damagePlayer();bullet.life=0;}}else{
   const box=projectileBox(bullet);
   for(const e of this.enemies)if(!e.dead&&overlap(box,e)){e.hp-=bullet.dmg;e.flash=.09;bullet.life=0;this.particlesAt(bullet.x,bullet.y,4);if(e.hp<=0)this.kill(e);break;}
   if(bullet.life>0)for(const c of this.crates)if(!c.dead&&overlap(box,c)){c.hp-=bullet.dmg;bullet.life=0;this.particlesAt(bullet.x,bullet.y,5,'dust');if(c.hp<=0){c.dead=true;this.drop(c.x+10,c.y,c.content);this.emit('crate',{x:c.x+27,y:c.y+20});}break;}
   if(bullet.life>0&&boss.active&&boss.hp>0&&overlap(box,boss)){bullet.life=0;this.hitBoss(bullet.dmg);this.particlesAt(bullet.x,bullet.y,4);}
  }}
  this.bullets=this.bullets.filter(b=>b.life>0&&b.x>this.camera-200&&b.x<this.camera+W+300&&b.y>-100&&b.y<H+100);
  for(const item of this.pickups){item.life-=dt;if(overlap(p,{...item,y:item.y-10,h:70})){item.life=0;this.collect(item);}}
  this.pickups=this.pickups.filter(i=>i.life>0);
  this.effects(dt);
 }
 effects(dt){for(const part of this.particles){part.life-=dt;part.x+=part.vx*dt;part.y+=part.vy*dt;part.vy+=part.kind==='fire'?-20:450;part.vx*=.98;}this.particles=this.particles.filter(p=>p.life>0).slice(-500);for(const p of this.popups){p.life-=dt;p.y-=35*dt;}this.popups=this.popups.filter(p=>p.life>0);}
}
