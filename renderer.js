import{W,H,GROUND,END,clamp,playerMuzzle}from'./engine.mjs';
import{WEAPON_ATLASES,equippedHeroPose,drawAtlasFrame}from'./hero-weapons.js';
const playerMap=[
'...........kkkkkk.............',
'.........kkhhhhhhkk...........',
'........khhhhhhhhhhk..........',
'.......khhhHHHHhhhhhk.........',
'.......khHHHHHHHHhhhhk........',
'......kHHHHHHHHHHHHHHk........',
'......kooooooookkkkkkkk.......',
'.......koooossssseesk.........',
'......kooookssssssek..........',
'.....koooooksssssssk..........',
'.....koook..ksssssksk.........',
'....koook...kkssssk...........',
'....kkk...ktttttttkk..........',
'.........kTTTTTTTTTtk.........',
'........kTTaaTTTTTttk.........',
'.......kTTaaaTTTTTttk.........',
'.......kssaaTTTTTTttsk........',
'......kssssaaTTTTTsssskkkkkk...',
'......kssssskTTTTTTssssgggggkk.',
'.......kssskgggggggggggggggggk',
'........kkkggGGGGGGGGGGGGGgkkk',
'..........kkkggGGGggggkkkkkk..',
'..........ktttggggkttk........',
'..........ktttttttttk.........',
'..........kkkkkkkkkkk.........',
'.........kbbbybbybbbbk........',
'.........kpppppppppppk........',
'.........kpPPPPPPppppk........',
'.........kpPPPPkpppppk........',
'.........kpPPPk.kppppk........',
'.........kppppk.kppppk........',
'.........kppppk.kppppk........',
'.........kppppk.kppppk........',
'.........kppppk.kppppk........',
'........kdddddk.kdddddk.......',
'........kdddDdk.kdddDDk.......',
'........kkkkkkk.kkkkkkk.......'];
const palettes={hero:{k:'#192821',h:'#59674c',H:'#8b9870',o:'#db7949',s:'#efbb82',e:'#252f26',t:'#666c4c',T:'#b8b897',a:'#8d8f66',g:'#3d4c43',G:'#879489',b:'#3d3f2c',y:'#d2b66c',p:'#5b674a',P:'#899375',d:'#2f3b34',D:'#4d5849'},enemy:{k:'#182721',h:'#485c50',H:'#72816a',o:'#3a4940',s:'#a8b5a1',e:'#eb6344',t:'#455b46',T:'#6b8360',a:'#a3a77d',g:'#273e39',G:'#59776e',b:'#333c2b',y:'#a09d66',p:'#3f5644',P:'#647c59',d:'#253c31',D:'#415c48'}};
function makeSprite(map,palette){const c=document.createElement('canvas');c.width=map[0].length;c.height=map.length;const g=c.getContext('2d');map.forEach((line,y)=>[...line].forEach((v,x)=>{if(palette[v]){g.fillStyle=palette[v];g.fillRect(x,y,1,1);}}));return c;}
const sprites={hero:makeSprite(playerMap,palettes.hero),enemy:makeSprite(playerMap,palettes.enemy)};
export class Renderer{
 constructor(canvas,bg){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.bg=bg;this.heroImage=new Image();this.heroImage.src='assets/raven-atlas.png';this.weaponImages=Object.fromEntries(Object.values(WEAPON_ATLASES.pixel).map(a=>{const img=new Image();img.src='assets/'+a.file;return[a.key,img];}));this.ready=Promise.all([this.heroImage,...Object.values(this.weaponImages)].map(img=>img.decode()));this.ready.catch(()=>{});this.tankImage=new Image();this.tankImage.src='assets/goliath.png';this.hostageImage=new Image();this.hostageImage.src='assets/hostage-v1.png';this.droneImage=new Image();this.droneImage.src='assets/gunship-v1.png';this.visualStyle='pixel';this.scale=1;this.modules=new Map();this.moduleLoads=new Map();this.c.imageSmoothingEnabled=false;this.clock=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.specks=Array.from({length:45},(_,i)=>({x:(i*139.21)%1280,y:(i*77.13)%520,s:1+i%3}));}
 async prepareVisual(style,onProgress){if(style==='pixel'||this.modules.has(style))return;if(!['modern','cyber'].includes(style))throw new Error('未知的視覺模組');if(!this.moduleLoads.has(style)){const module=style==='cyber'?import('./cyber-renderer.js'):import('./modern-renderer.js');this.moduleLoads.set(style,module.then(async m=>{const assets=await(style==='cyber'?m.loadCyberAssets(onProgress):m.loadModernAssets(onProgress));const R=style==='cyber'?m.CyberRenderer:m.ModernRenderer;this.modules.set(style,new R(this.c,assets,this.reduced));}).catch(error=>{this.moduleLoads.delete(style);throw error;}));}await this.moduleLoads.get(style);}
 activateVisual(style){if(!['pixel','modern','cyber'].includes(style))throw new Error('未知的視覺模組');if(style!=='pixel'&&!this.modules.has(style))throw new Error('高清素材尚未完成載入');this.visualStyle=style;this.modules.get(style)?.resetEffects();this.resize();}
 resize(){const hd=this.visualStyle!=='pixel',scale=hd?Math.min(2,Math.max(1.5,window.devicePixelRatio||1,this.canvas.clientWidth/W)):1;const width=Math.round(W*scale),height=Math.round(H*scale);if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}this.scale=scale;this.c.imageSmoothingEnabled=hd;if(hd)this.c.imageSmoothingQuality='high';}
 onEvent(e,g){this.modules.get(this.visualStyle)?.onEvent(e,g);}
 rect(x,y,w,h,color){this.c.fillStyle=color;this.c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 text(text,x,y,size=15,color='#f7d280',align='center'){const c=this.c;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillStyle='#10211b';c.fillText(text,x+2,y+2);c.fillStyle=color;c.fillText(text,x,y);}
 draw(g,dt){this.c.setTransform(this.scale,0,0,this.scale,0,0);const module=this.modules.get(this.visualStyle);if(module){module.draw(g,dt);return;}this.clock+=dt;const c=this.c,menu=g.state==='menu';const cam=menu?300+Math.sin(this.clock*.05)*65:g.camera;
  c.save();if(!menu&&!this.reduced&&g.shake>0)c.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake*.6);
  this.background(cam,g.section);
  if(menu){this.tank(905,GROUND-190,{phase:this.clock,hp:210,maxHp:210},true);this.soldier(710,GROUND-70,1,'hero',{t:this.clock,walk:false});this.crate(805,GROUND-54,'H');this.crate(767,GROUND-45,'G',.8);}
  else{
   c.save();c.translate(-Math.floor(cam),0);
   for(const plat of g.platforms){if(plat.x<cam-250||plat.x>cam+W+250)continue;this.platform(plat);}
   for(const person of g.prisoners){if(person.freed||person.x<cam-80||person.x>cam+W+80)continue;this.prisoner(person.x,person.y);}
   for(const cr of g.crates)if(!cr.dead&&cr.x>cam-100&&cr.x<cam+W+100)this.crate(cr.x,cr.y,cr.content);
   for(const e of g.enemies){if(e.dead||e.x<cam-100||e.x>cam+W+100)continue;this.shadow(e.x+e.w/2,GROUND,e.type==='turret'?38:26);if(e.type==='soldier')this.soldier(e.x,e.y,e.face,'enemy',{t:e.phase,walk:Math.abs(e.x-g.player.x)>240,flash:e.flash});else if(e.type==='turret')this.turret(e);else this.drone(e);}
   if(g.boss.x>cam-400&&g.boss.x<cam+W+400)this.tank(g.boss.x,g.boss.y,g.boss);
   const p=g.player;this.shadow(p.x+18,GROUND,24);if(p.inv<=0||Math.floor(p.inv*12)%2)this.soldier(p.x,p.y,p.face,'hero',{t:g.t,walk:Math.abs(p.vx)>0,air:!p.grounded,crouch:p.crouch,aim:p.aim,shoot:p.gun>.07,weapon:p.weapon});
   for(const b of g.bullets){if(b.enemy){this.rect(b.x-7,b.y-5,b.w,b.h,'#4c3423');this.rect(b.x-5,b.y-3,b.w-3,b.h-4,'#fa723b');this.rect(b.x-2,b.y-2,5,4,'#ffe5ab');}else this.playerProjectile(b);}
   for(const gr of g.grenades){c.save();c.translate(gr.x,gr.y);c.rotate(g.t*12);this.rect(-6,-7,12,15,'#1a2b20');this.rect(-4,-5,8,10,'#8e9a50');this.rect(-2,-10,6,4,'#d9c784');c.restore();}
   for(const item of g.pickups){const y=item.y+Math.sin(this.clock*5)*5;this.pickup(item.x,y,item.type);}
   for(const p of g.particles){const alpha=clamp(p.life/.5,0,1);c.globalAlpha=alpha;if(p.kind==='fire'){this.rect(p.x-p.size/2,p.y-p.size/2,p.size*2,p.size*2,p.life>.5?'#fff0a1':p.life>.3?'#ffb547':'#bb512e');}else this.rect(p.x,p.y,p.size,p.size,p.kind==='muzzle'?'#fff5a3':p.kind==='dust'?'#bbaf81':'#ffd37d');}c.globalAlpha=1;
   for(const p of g.popups){c.globalAlpha=clamp(p.life,0,1);this.text(p.text,p.x,p.y,15,p.color);}c.globalAlpha=1;
   c.restore();
   if(g.flash>0)this.rect(0,0,W,H,'#f3533533');
  }
  this.atmosphere(cam);c.restore();
 }
 background(cam,sector){const c=this.c;this.rect(0,0,W,H,'#3c4d3f');if(this.bg?.complete&&this.bg.naturalWidth){let offset=(cam*.16)%W;for(let i=-1;i<2;i++){let x=i*W-offset;c.save();c.translate(x,9);if(i%2){c.translate(W,0);c.scale(-1,1);}c.drawImage(this.bg,0,0,W,H);c.restore();}}
  if(sector===1)this.rect(0,0,W,H,'#4362521c');if(sector===2)this.rect(0,0,W,H,'#bc6a301b');
  this.rect(0,GROUND-3,W,4,'#b7b176');this.rect(0,GROUND+1,W,9,'#515a3e');this.rect(0,GROUND+10,W,9,'#27382b');
  for(let i=0;i<45;i++){const x=((i*47-(cam*.9)%47)+W)%W;this.rect(x,GROUND+2,28,3,i%2?'#6c7851':'#83905a');this.rect(x+8,GROUND+10,18,2,'#1a2e24');}
  // Near foliage and riveted footing give the painted world a second scrolling plane.
  for(let i=0;i<6;i++){const x=((i*271-cam*.55)%1550+1550)%1550-100;this.rect(x,H-24,75,24,'#14271be6');for(let j=0;j<5;j++){this.rect(x+j*14,H-26-j*3,22,6,'#30452de6');this.rect(x+j*12,H-18-j*6,13,5,'#496039bb');}}
 }
 atmosphere(cam){const c=this.c;if(this.reduced)return;for(const s of this.specks){const x=(s.x+this.clock*(6+s.s)-cam*.07+W*10)%W,y=s.y+Math.sin(this.clock*.2+s.x)*8;c.globalAlpha=.15+Math.sin(this.clock+s.x)*.12;this.rect(x,y,s.s,s.s,'#fff5b7');}c.globalAlpha=1;}
 shadow(x,y,r){const c=this.c;c.fillStyle='#0d201780';c.beginPath();c.ellipse(x,y+3,r,5,0,0,Math.PI*2);c.fill();}
 playerProjectile(b){const c=this.c;c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));this.rect(-20,-2,24,4,'#ac774b66');this.rect(-7,-2,16,4,'#fff6bc');this.rect(8,-1,5,2,'#fff');c.restore();}
 muzzleFlash(x,y,face,aim,crouch,weapon='RIFLE'){const c=this.c,m=playerMuzzle({x,y,face,aim,crouch,weapon});c.save();c.translate((m.x-x-18)*face,m.y-y-70);if(aim)c.rotate(-Math.PI/2);this.rect(0,-7,10,14,'#f5aa42');this.rect(5,-4,17,8,'#ffe9a0');this.rect(12,-2,15,4,'#fff8d5');c.restore();}
 soldier(x,y,face,kind,{t=0,walk=false,air=false,crouch=false,aim=false,shoot=false,flash=0,weapon='RIFLE'}={}){const c=this.c;c.save();c.translate(Math.round(x+18),Math.round(y+70));c.scale(face,1);let bob=walk?Math.sin(t*22)*1.5:Math.sin(t*2)*.6;
  if(kind==='hero'&&weapon!=='RIFLE'){const p={x,y,face,weapon,aim,crouch},pose=equippedHeroPose('pixel',p,{t,walk,air,crouch,aim,shoot});if(pose){const img=this.weaponImages[pose.key];if(img?.complete&&img.naturalWidth)drawAtlasFrame(c,img,pose.crop,pose.x,pose.y,pose.w,pose.h);if(shoot)this.muzzleFlash(x,y,face,aim,crouch,weapon);c.restore();return;}}
  if(this.heroImage.complete&&this.heroImage.naturalWidth){const img=this.heroImage,cw=img.naturalWidth/4,ch=img.naturalHeight/2;let frame=aim?6:crouch?5:air?4:walk?1+Math.floor(t*11)%3:shoot?7:0;let row=frame>3?1:0,col=frame%4;let sy=row?ch*.94:0,sh=row?ch*1.06:ch;const s=(kind==='hero'?82:72)/(ch*.89),baseline=row?ch*.98:ch*.93;c.translate(0,bob);if(kind==='enemy')c.filter=flash>0?'brightness(2.5)':'hue-rotate(65deg) saturate(.4) brightness(.8)';c.drawImage(img,col*cw,sy,cw,sh,-cw*s*.46,-baseline*s,cw*s,sh*s);if(shoot&&!crouch&&frame!==7)this.muzzleFlash(x,y,face,aim,crouch);c.restore();return;}
  if(flash>0)c.filter='brightness(3)';if(crouch){c.translate(0,12);c.scale(1,.7);}c.translate(0,bob);
  // Individual lower-leg offsets create a six-pose run cycle without blurry scaling.
  const sprite=sprites[kind],scale=2.15,ox=-32,oy=-79;
  c.drawImage(sprite,0,0,29,27,ox,oy,29*scale,27*scale);
  const stride=walk?Math.sin(t*22)*9:air?8:0;
  c.save();c.translate(-stride,air?-4:0);c.drawImage(sprite,0,27,16,10,ox,oy+27*scale,16*scale,10*scale);c.restore();
  c.save();c.translate(stride,air?-6:0);c.drawImage(sprite,16,27,13,10,ox+16*scale,oy+27*scale,13*scale,10*scale);c.restore();
  if(aim){c.save();c.translate(8,-51);c.rotate(-Math.PI/2);this.rect(-5,-5,40,9,'#223d32');this.rect(2,-3,35,3,'#a3b0a0');this.rect(25,-5,17,5,'#2c4339');c.restore();}
  if(shoot)this.muzzleFlash(x,y,face,aim,crouch);c.restore();}
 crate(x,y,type,scale=1){const c=this.c;c.save();c.translate(x,y);c.scale(scale,scale);this.rect(0,0,54,54,'#1c2e24');this.rect(3,3,48,48,'#7c7750');this.rect(6,6,42,42,'#5c6441');this.rect(6,6,42,5,'#a3a16b');this.rect(7,42,40,5,'#424f31');this.rect(7,13,5,29,'#929466');this.rect(42,13,5,29,'#929466');this.rect(13,16,27,23,'#293f2c');this.text(type==='MED'?'+':type,27,34,22,'#eee0a1');for(const [a,b]of[[5,5],[46,5],[5,46],[46,46]])this.rect(a,b,3,3,'#272e22');c.restore();}
 pickup(x,y,type){const c=this.c;this.shadow(x+16,y+45,20);c.save();c.translate(x,y);this.rect(-5,-5,42,42,'#f8d38222');this.rect(0,0,32,32,'#182f24');this.rect(2,2,28,28,type==='MED'?'#547352':'#8d733c');this.rect(4,4,24,2,'#f8d584');this.rect(4,26,24,2,'#414e2e');this.text(type==='MED'?'+':type,16,24,25,type==='MED'?'#e3f5cb':'#ffebad');c.restore();}
 prisoner(x,y){const c=this.c;c.save();c.translate(x,y);this.shadow(15,56,21);if(this.hostageImage.complete&&this.hostageImage.naturalWidth){const breath=this.reduced?0:Math.sin(this.clock*2.5)*.6;c.drawImage(this.hostageImage,259,104,578,1346,-1,56-74+breath,32,74);this.text('HELP!',15,-33+Math.sin(this.clock*4)*2,12,'#fbe4a7');c.restore();return;}this.rect(7,0,18,15,'#dbb78c');this.rect(6,0,20,5,'#ddd2a4');this.rect(4,16,23,24,'#aeb691');this.rect(0,18,5,23,'#d3b48a');this.rect(27,18,5,23,'#d3b48a');this.rect(9,39,8,17,'#616a50');this.rect(20,39,8,17,'#616a50');this.rect(0,27,32,4,'#3f4937');this.text('HELP!',15,-15+Math.sin(this.clock*4)*3,12,'#fbe4a7');c.restore();}
 platform(p){this.rect(p.x-3,p.y,p.w+6,7,'#aeb88a');this.rect(p.x,p.y+7,p.w,15,'#384e3c');this.rect(p.x+5,p.y+14,p.w-10,4,'#1d3528');for(let x=p.x+8;x<p.x+p.w;x+=28)this.rect(x,p.y+9,5,4,'#7f9271');this.rect(p.x+8,p.y+22,10,GROUND-p.y-22,'#283f2dbb');this.rect(p.x+p.w-18,p.y+22,10,GROUND-p.y-22,'#283f2dbb');}
 turret(e){const c=this.c;c.save();c.translate(e.x+30,e.y+52);c.scale(e.face,1);this.rect(-30,-9,60,9,'#172c23');this.rect(-25,-24,50,17,'#456245');this.rect(-20,-28,40,6,'#8b9c69');this.rect(-20,-40,38,16,'#5c7853');this.rect(-14,-43,25,5,'#9dab7d');this.rect(12,-38,44,9,'#233f32');this.rect(16,-38,35,3,'#83977a');this.rect(49,-39,9,11,'#283c31');this.rect(-9,-34,9,5,'#e98d50');this.rect(-21,-19,5,5,'#b5ad76');c.restore();}
 drone(e){const c=this.c;c.save();c.translate(e.x+e.w/2,e.y+e.h/2);if(this.droneImage.complete&&this.droneImage.naturalWidth){c.scale(e.face===1?-1:1,1);if(e.flash>0)c.filter='brightness(2.5)';c.drawImage(this.droneImage,75,83,1669,737,-51,-23,102,45);c.filter='none';if(!this.reduced){c.strokeStyle='#efdb9e99';c.lineWidth=1;for(const rx of [-26,25]){const a=this.clock*58+rx,dx=Math.cos(a)*17,dy=Math.sin(a)*3;c.beginPath();c.moveTo(rx-dx,-16-dy);c.lineTo(rx+dx,-16+dy);c.stroke();}}c.restore();return;}this.rect(-19,-12,38,21,'#213c34');this.rect(-14,-9,28,14,'#849786');this.rect(-8,-6,16,11,'#3c584c');this.rect(-4,-4,8,7,'#eab062');this.rect(-34,-7,15,6,'#354f42');this.rect(19,-7,15,6,'#354f42');this.rect(-42,-12,28,3,Math.sin(this.clock*50)>0?'#b4bd9188':'#657c5e88');this.rect(14,-12,28,3,'#b4bd9199');this.rect(-3,8,6,12,'#233c31');c.restore();}
 tank(x,y,b,preview=false){const c=this.c;c.save();c.translate(Math.round(x),Math.round(y+Math.sin(b.phase*2)*1));if(b.flash>0)c.filter='brightness(1.8)';
  if(this.tankImage.complete&&this.tankImage.naturalWidth){this.shadow(165,190,177);c.drawImage(this.tankImage,-70,-11,410,200);if(!preview&&b.active&&b.cd>1.5){this.rect(-85,49,23,17,'#ffb54e');this.rect(-105,54,35,7,'#fff3b3');}if(b.hp<b.maxHp*.4){for(let i=0;i<7;i++){const xx=230+Math.sin(this.clock*3+i)*15,yy=26-i*13-(this.clock*20)%20;this.rect(xx,yy,15+i*3,12+i*3,'#24342b88');}this.rect(263,56,9,13,'#f4ac51');}c.restore();return;}
  // Articulated heavy armor, pixel bevels, running treads, cannon recoil and glowing vents.
  this.shadow(165,190,180);this.rect(-18,137,363,41,'#152b25');this.rect(-12,127,351,59,'#24372d');this.rect(-3,132,333,47,'#59634b');this.rect(-8,145,343,21,'#1d3029');
  for(let i=0;i<9;i++){const xx=10+i*36;this.rect(xx,137,28,37,'#121f1c');this.rect(xx+3,141,22,28,'#7d8160');this.rect(xx+7,145,14,20,'#344a38');this.rect(xx+11,150,6,10,'#aaa477');}
  for(let i=0;i<26;i++){const xx=-8+i*13+Math.floor(b.phase*18)%13;this.rect(xx,129,7,5,'#99a37a');this.rect(xx,178,7,5,'#7c8966');}
  this.rect(-3,103,332,34,'#203b2e');this.rect(6,82,312,43,'#677954');this.rect(18,76,289,12,'#9ba176');this.rect(1,104,326,5,'#a2aa7d');this.rect(28,91,263,7,'#77885c');this.rect(23,110,279,12,'#3d5a3e');
  for(let i=0;i<5;i++){this.rect(65+i*42,87,29,28,'#485d3e');this.rect(67+i*42,89,25,4,'#a5aa79');this.rect(67+i*42,110,25,4,'#2b4431');this.rect(78+i*42,96,5,6,'#7d8b5f');}
  this.rect(17,93,28,26,'#c1b383');this.rect(21,97,20,18,'#ddc498');this.rect(24,101,13,6,'#765c3c');this.rect(294,94,14,15,'#d6b16a');
  this.rect(86,47,175,36,'#2c4834');this.rect(101,17,143,40,'#657c55');this.rect(113,9,112,13,'#89976a');this.rect(108,22,128,5,'#a9ac7b');this.rect(113,29,56,20,'#536c48');this.rect(179,28,44,19,'#344e38');this.rect(187,33,29,9,'#e5b260');this.rect(191,35,18,4,'#ffcd79');
  const recoil=b.active&&b.cd>1.4?7:0;this.rect(-52+recoil,38,171,19,'#20392c');this.rect(-47+recoil,39,161,6,'#8b9b6c');this.rect(-47+recoil,52,161,5,'#425d3d');this.rect(-70+recoil,33,27,29,'#263e2e');this.rect(-69+recoil,35,15,24,'#84926b');this.rect(-73+recoil,41,6,12,'#101e17');
  this.rect(147,-6,47,17,'#263e2d');this.rect(151,-8,39,5,'#a6aa79');this.rect(208,-18,4,31,'#2b4532');this.rect(209,-19,32,11,'#b57844');this.rect(214,-16,22,5,'#dba564');
  this.rect(268,56,15,31,'#344d36');this.rect(271,51,9,13,'#192f24');for(let i=0;i<4;i++)this.rect(270,63+i*5,10,2,'#dda169');
  this.text('G-07',244,121,13,'#e6dbac');for(const[a,bb]of[[13,85],[300,85],[22,124],[307,124],[103,25],[230,25]])this.rect(a,bb,3,3,'#d3c897');
  if(!preview&&b.hp<b.maxHp*.4){for(let i=0;i<5;i++){const xx=200+Math.sin(this.clock*3+i)*20,yy=10-i*14-(this.clock*25)%20;this.rect(xx,yy,17+i*4,12+i*4,'#28332d70');}this.rect(260,74,9,11,'#f4ab4d');}
  c.restore();}
}
