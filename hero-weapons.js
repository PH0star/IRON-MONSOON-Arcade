import{playerMuzzle}from'./engine.mjs';
import{WEAPON_ATLASES}from'./weapon-atlases.js';
export{WEAPON_ATLASES};

// Each weapon owns a complete, re-gripped character animation. Never layer an
// equipment pickup over the rifle baked into the original hero artwork.
export function equippedHeroPose(style,p,{t=0,walk=false,air=false,crouch=false,aim=false,shoot=false}={}){
 const atlas=WEAPON_ATLASES[style]?.[p.weapon];if(!atlas)return null;
 return heroPoseFromAtlas(atlas,p,{t,walk,air,crouch,aim,shoot});
}

export function heroPoseFromAtlas(atlas,p,{t=0,walk=false,air=false,crouch=false,aim=false,shoot=false}={}){
 const frame=aim?6:crouch?5:air?4:walk?1+Math.floor(t*10)%3:shoot?7:0,crop=atlas.frames[frame];
 const muzzle=playerMuzzle({...p,face:1}),feet=p.y+70;
 // Lock scale to the standing artwork. A tucked jump has less distance from
 // muzzle to feet; fitting that distance per frame would enlarge the body.
 const reference=atlas.frames[0],standingMuzzle=playerMuzzle({x:0,y:0,face:1,weapon:p.weapon});
 const scale=atlas.scale||(70-standingMuzzle.y)/(reference.h-reference.muzzle[1]);
 // Align the gun by translation only; never resize the body to fit a pose.
 return{key:atlas.key,frame,crop,x:muzzle.x-(p.x+18)-crop.muzzle[0]*scale,y:muzzle.y-feet-crop.muzzle[1]*scale,w:crop.w*scale,h:crop.h*scale};
}

// Standard atlas clipping also retains barrels extending past a nominal cell.
export function drawAtlasFrame(c,img,crop,x,y,w,h){
 if(crop.clips){c.save();c.beginPath();for(const[rx,ry,rw,rh]of crop.clips)c.rect(x+rx/crop.w*w,y+ry/crop.h*h,rw/crop.w*w,rh/crop.h*h);c.clip();}
 c.drawImage(img,crop.x,crop.y,crop.w,crop.h,x,y,w,h);
 if(crop.clips)c.restore();
}
