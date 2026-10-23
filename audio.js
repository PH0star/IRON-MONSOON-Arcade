export class ArcadeAudio{
 constructor(){this.ctx=null;this.muted=false;this.music=true;this.sfx=true;this.playing=false;this.step=0;this.next=0;this.timer=null;}
 async unlock(){try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:.52;this.master.connect(this.ctx.destination);this.musicBus=this.ctx.createGain();this.musicBus.gain.value=.44;this.musicBus.connect(this.master);this.fxBus=this.ctx.createGain();this.fxBus.gain.value=.65;this.fxBus.connect(this.master);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.6,this.ctx.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}if(this.ctx.state==='suspended')await this.ctx.resume();if(!this.timer){this.next=this.ctx.currentTime+.05;this.timer=setInterval(()=>this.schedule(),50);}}catch{}}
 tone(freq,time,length=.1,type='square',volume=.1,bus=this.musicBus,slide){if(!this.ctx||!bus)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),time+length);g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g);g.connect(bus);o.start(time);o.stop(time+length+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 hiss(time,length,volume=.1,cut=1200){if(!this.ctx)return;let src=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();src.buffer=this.noise;f.type='lowpass';f.frequency.value=cut;g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+length);src.connect(f);f.connect(g);g.connect(this.fxBus);src.start(time);src.stop(time+length);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};}
 setMute(v){this.muted=v;if(this.master)this.master.gain.setTargetAtTime(v?0:.52,this.ctx.currentTime,.02);}
 schedule(){if(!this.ctx)return;if(!this.playing||!this.music||this.muted){this.next=this.ctx.currentTime+.05;return;}while(this.next<this.ctx.currentTime+.14){this.musicStep(this.step++,this.next);this.next+=60/138/4;}}
 musicStep(step,t){const i=step%64,chord=[0,0,-2,3][Math.floor(i/16)];const hz=n=>440*2**((n-69)/12);const bass=[40,40,52,40,43,40,47,43];if(i%2===0)this.tone(hz(bass[(i/2|0)%8]+chord),t,.15,'sawtooth',.15);
  if(i%8===0){this.tone(125,t,.18,'sine',.55,this.musicBus,38);}if(i%8===4){this.tone(180,t,.08,'triangle',.11);if(this.musicBus){const b=this.fxBus;this.fxBus=this.musicBus;this.hiss(t,.09,.13,2800);this.fxBus=b;}}
  if(i%2===0){const b=this.fxBus;this.fxBus=this.musicBus;this.hiss(t,.025,.035,7000);this.fxBus=b;}
  const melody=[76,0,76,79,78,0,74,0,76,0,83,0,81,79,78,74,76,0,76,79,78,0,74,0,71,74,76,0,74,0,71,0];if(i%2===0){let n=melody[(i/2|0)%32];if(n)this.tone(hz(n+chord),t,.16,'square',.045);}
 }
 effect(type){if(!this.ctx||!this.sfx||this.muted)return;const t=this.ctx.currentTime,b=this.fxBus;
  if(type==='shoot'){this.hiss(t,.045,.1,3500);this.tone(140,t,.05,'sawtooth',.1,b,45);}
  else if(type==='enemyShoot')this.tone(95,t,.05,'square',.025,b,45);
  else if(type==='explode'||type==='cannon'){this.hiss(t,type==='explode'?.5:.23,.65,900);this.tone(110,t,.36,'sawtooth',.32,b,26);}
  else if(type==='jump')this.tone(170,t,.15,'square',.045,b,440);
  else if(type==='hurt'){this.hiss(t,.17,.3,1300);this.tone(320,t,.22,'sawtooth',.15,b,60);}
  else if(type==='pickup'||type==='rescue'){[523,659,784,1047].forEach((f,i)=>this.tone(f,t+i*.055,.13,'square',.13,b));}
  else if(type==='start'||type==='sector'||type==='boss'){[220,330,440,660].forEach((f,i)=>this.tone(f,t+i*.12,.22,'square',.1,b));}
  else if(type==='kill'||type==='crate')this.hiss(t,.1,.18,1400);
  else if(type==='throw')this.tone(300,t,.12,'triangle',.06,b,550);
  else if(type==='win'){[523,659,784,1047,784,1047,1319].forEach((f,i)=>this.tone(f,t+i*.15,.3,'square',.14,b));}
  else if(type==='over'){[330,294,262,196,131].forEach((f,i)=>this.tone(f,t+i*.19,.3,'square',.14,b));}
 }
}
