/* EPOHI 0.8.0 — marching formations, banners and battle moments */
(() => {
 'use strict';
 const wrap=document.querySelector('.map-wrap'), grid=document.getElementById('mapGrid');
 if(!wrap||!grid||window.__epohiArmyVisuals)return;
 window.__epohiArmyVisuals=true;
 const canvas=document.createElement('canvas');canvas.className='army-canvas';canvas.setAttribute('aria-hidden','true');wrap.appendChild(canvas);
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const unitAtlas=new Image();unitAtlas.src='assets/units.svg';
 const KEY='epohi_world_sim_v1',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,mobile=matchMedia('(max-width:700px)').matches;
 let w=1,h=1,dpr=1,tiles=[],centers=[],snapshot=null,visual=null,last=performance.now(),raf=0,elapsed=0,flash=0,flashColor='#e5c47b',clash=0,clashAt=-1,clashColor='#f1d18a',clashType='none',lastEvent='',dust=[];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}}
 function resize(){const r=wrap.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,mobile?1.25:1.7);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);locate()}
 function locate(){const r=wrap.getBoundingClientRect();tiles=Array.from(grid.querySelectorAll('.tile'));centers=tiles.map(el=>{const q=el.getBoundingClientRect();return{x:q.left-r.left+q.width/2,y:q.top-r.top+q.height/2,size:Math.min(q.width,q.height)}})}
 function owner(i){const el=tiles[i];return el?.classList.contains('owner-rival')?'rival':el?.classList.contains('owner-player')?'player':'neutral'}
 function terrain(i){const el=tiles[i];if(!el)return 'plain';return el.classList.contains('terrain-mountain')?'mountain':el.classList.contains('terrain-forest')?'forest':el.classList.contains('terrain-river')?'river':'plain'}
 function speed(i,s){const t=terrain(i),weather=s?.weather||0;return (t==='mountain'?.42:t==='forest'?.68:t==='river'?.55:1)*([1,.78,.86,.58][weather%4]||1)*.7}
 function sample(s,dt){
  if(!s?.army||!centers[s.army.tile]){visual=null;return}
  const a=s.army,path=Array.isArray(a.path)?a.path:[];
  if(!visual||visual.token!==String(a.tile)+':'+String(a.target)+':'+path.join(',')){
   visual={token:String(a.tile)+':'+String(a.target)+':'+path.join(','),index:0,progress:0,tile:a.tile,path:[...path],troops:a.troops||24,units:{...(a.units||{})},phase:rand(0,6.28)};
  }
  visual.troops=a.troops||visual.troops;visual.units={...(a.units||{})};
  if(visual.path.length&&visual.index<visual.path.length){
   const next=visual.path[visual.index],v=speed(next,s);
   visual.progress+=dt*v;
   while(visual.progress>=1&&visual.index<visual.path.length){visual.progress-=1;visual.tile=visual.path[visual.index++];}
  }else{visual.tile=a.tile;visual.index=0;visual.progress=0;visual.path=[];}
 }
 function line(x1,y1,x2,y2,color,width,dash){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;if(dash)ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
 function horseman(x,y,scale,step,team='player'){
  const gait=Math.sin(step),cloth=team==='rival'?'#8d4b40':'#526d4b',metal='#b9b39a';
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  // Horse shadow and body.
  ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(0,4,9.5,3.2,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=team==='rival'?'#6b4031':'#755337';ctx.strokeStyle='#30261d';ctx.lineWidth=1.1;
  ctx.beginPath();ctx.ellipse(0,-2,8.2,4.2,-.08,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Neck, head and bridle.
  ctx.beginPath();ctx.moveTo(5,-4);ctx.lineTo(8,-10);ctx.lineTo(12,-11);ctx.lineTo(13,-8);ctx.lineTo(10,-5);ctx.lineTo(8,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#c7a66f';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(8,-8);ctx.lineTo(12,-7);ctx.stroke();
  // Four animated legs.
  ctx.strokeStyle='#4b3427';ctx.lineWidth=1.7;ctx.lineCap='round';
  for(let i=0;i<4;i++){const front=i<2,phase=step+(i%2)*Math.PI+(front?0:Math.PI*.6),swing=Math.sin(phase)*2.2;
   const lx=(front?5:-5)+(i%2?1:-1);ctx.beginPath();ctx.moveTo(lx,-.5);ctx.lineTo(lx+swing,4.5);ctx.stroke();
  }
  // Saddle and rider.
  ctx.fillStyle='#a77b48';ctx.beginPath();ctx.ellipse(-1,-5,4.2,2.2,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(-4,-9);ctx.lineTo(3,-12);ctx.lineTo(5,-7);ctx.lineTo(1,-4);ctx.lineTo(-3,-5);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d4b994';ctx.beginPath();ctx.arc(0,-14,2.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=metal;ctx.beginPath();ctx.arc(0,-14.6,2.3,Math.PI,Math.PI*2);ctx.lineTo(2.3,-13.8);ctx.lineTo(-2.3,-13.8);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#987b4e';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(3,-10);ctx.lineTo(8,-18+Math.sin(step)*.7);ctx.stroke();
  ctx.strokeStyle='#d7d0b8';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(8,-18);ctx.lineTo(9,-21);ctx.stroke();
  ctx.restore();
 }
 function soldier(x,y,scale,angle,shade,step=0,team='player',unitType=0){
  if(unitType===3){horseman(x,y,scale,step,team);return;}
  if(unitAtlas.complete&&unitAtlas.naturalWidth>0){
   const gait=Math.sin(step),lift=Math.max(0,gait)*.8,frames=team==='rival'?[2,3,5,7]:[0,1,4,6],frame=frames[Math.max(0,Math.min(3,unitType|0))];
   ctx.save();ctx.translate(x,y-lift);ctx.rotate(angle);ctx.globalAlpha=1;
   ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(0,4,5.5,2.1,0,0,Math.PI*2);ctx.fill();
   ctx.drawImage(unitAtlas,frame*64,Math.abs(step)>.01?80:0,64,80,-12*scale,-18*scale,24*scale,29*scale);
   ctx.restore();return;
  }
  const gait=Math.sin(step),lift=Math.max(0,gait)*.8;
  ctx.save();ctx.translate(x,y-lift);ctx.rotate(angle);ctx.scale(scale,scale);
  ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(0,4,5.2,2.1,0,0,Math.PI*2);ctx.fill();
  ctx.lineCap='round';ctx.strokeStyle='#493b2d';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-1.2,-.5);ctx.lineTo(-2.1+gait*1.65,3.5-Math.max(0,gait)*1.1);ctx.moveTo(1.1,-.5);ctx.lineTo(2.2-gait*1.65,3.5-Math.max(0,-gait)*1.1);ctx.stroke();
  ctx.fillStyle='#5f4b36';ctx.fillRect(-2.3+gait*1.65,2.7,2.2,1.1);ctx.fillRect(.9-gait*1.65,2.7,2.2,1.1);
  ctx.fillStyle=team==='rival'?'#713a32':'#465941';ctx.beginPath();ctx.moveTo(-2.6,-6);ctx.lineTo(-4,-1);ctx.lineTo(-2.7,1.5);ctx.lineTo(2.9,1.5);ctx.lineTo(4,-1);ctx.lineTo(2.5,-6);ctx.closePath();ctx.fill();
  ctx.fillStyle=team==='rival'?'#a95a4c':shade;ctx.beginPath();ctx.moveTo(-2.1,-6.5);ctx.lineTo(2.1,-6.5);ctx.lineTo(3.1,-.7);ctx.lineTo(2,1);ctx.lineTo(-2,1);ctx.lineTo(-3.1,-.7);ctx.closePath();ctx.fill();ctx.strokeStyle='#554631';ctx.lineWidth=.65;ctx.stroke();
  ctx.fillStyle='#c8ac70';ctx.fillRect(-2.7,-3.1,5.4,.8);ctx.fillStyle='#55422e';ctx.fillRect(-.65,-3.35,1.3,1.3);
  ctx.strokeStyle='#bca16e';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(-2.4,-5.4);ctx.lineTo(-4.1,-1.1);ctx.moveTo(2.4,-5.4);ctx.lineTo(4.1,-1.1);ctx.stroke();
  ctx.fillStyle='#6f4632';ctx.beginPath();ctx.roundRect(-5.1,-5.2,2.5,6.3,.7);ctx.fill();ctx.strokeStyle='#d0b477';ctx.lineWidth=.7;ctx.stroke();ctx.beginPath();ctx.moveTo(-3.85,-4.4);ctx.lineTo(-3.85,.2);ctx.stroke();
  ctx.fillStyle='#d8bd91';ctx.beginPath();ctx.arc(0,-8.4,2.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#554638';ctx.beginPath();ctx.arc(0,-9,2.25,Math.PI,Math.PI*2);ctx.lineTo(2.2,-8.3);ctx.lineTo(-2.2,-8.3);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c3a568';ctx.beginPath();ctx.moveTo(-2.3,-9.3);ctx.lineTo(0,-11.2);ctx.lineTo(2.3,-9.3);ctx.closePath();ctx.fill();
  const weaponSwing=Math.sin(step+Math.PI)*.8;ctx.strokeStyle='#a98b58';ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(4,-5.4+weaponSwing);ctx.lineTo(5.2,-14.2+weaponSwing);ctx.stroke();ctx.fillStyle='#d8c594';ctx.beginPath();ctx.moveTo(4.7,-14.2+weaponSwing);ctx.lineTo(5.6,-15.6+weaponSwing);ctx.lineTo(5.9,-14.2+weaponSwing);ctx.closePath();ctx.fill();
  ctx.restore();
}
 function banner(x,y,t,phase=0,color='#b68a43'){const wave=Math.sin(phase)*2.1*t,wave2=Math.sin(phase+1.1)*1.6*t;ctx.save();ctx.strokeStyle='#d9c58e';ctx.lineWidth=1.45;ctx.beginPath();ctx.moveTo(x,y-22*t);ctx.lineTo(x,y+4*t);ctx.stroke();ctx.fillStyle=color;ctx.strokeStyle='#54372e';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x+1,y-21*t);ctx.lineTo(x+11*t,y-19*t+wave);ctx.lineTo(x+8*t,y-14*t+wave2);ctx.lineTo(x+1,y-13*t);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#d9b76e';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x+2*t,y-18*t);ctx.lineTo(x+7*t,y-17*t+wave*.6);ctx.stroke();ctx.fillStyle='#e2ca89';ctx.beginPath();ctx.arc(x,y+5*t,1.5*t,0,Math.PI*2);ctx.fill();ctx.restore()}
 function spawnDust(x,y){for(let i=0;i<2;i++)dust.push({x:x+rand(-5,5),y:y+rand(0,4),vx:rand(-8,8),vy:rand(-12,-3),life:1,r:rand(1,2.8)})}
 function visibleRoster(units,total,count){
  const keys=['infantry','spearmen','archers','cavalry'],sum=keys.reduce((n,k)=>n+Math.max(0,Number(units?.[k])||0),0)||total||1;
  const raw=keys.map(k=>count*Math.max(0,Number(units?.[k])||0)/sum),slots=raw.map(Math.floor);let left=count-slots.reduce((a,b)=>a+b,0);
  raw.map((v,i)=>({i,f:v-slots[i]})).sort((a,b)=>b.f-a.f).slice(0,left).forEach(x=>slots[x.i]++);
  const roster=[];slots.forEach((n,i)=>{for(let j=0;j<n;j++)roster.push(i)});return roster;
 }
 function drawFormation(t,dt,s){
  if(!visual)return;
  const a=visual,from=centers[a.tile];if(!from)return;
  const to=a.index<a.path.length?centers[a.path[a.index]]:null;
  let x=from.x,y=from.y;
  if(to){x+=(to.x-from.x)*a.progress;y+=(to.y-from.y)*a.progress}
  const scale=clamp(from.size/38,.55,1.25),moving=!!to,shade='#d9cba1',facing=to?Math.atan2(to.y-from.y,to.x-from.x)+Math.PI/2:0;
  if(moving&&Math.random()<.22)spawnDust(x,y);
  // Route markers and a restrained marching line.
  if(to){
   ctx.save();ctx.globalAlpha=.26;line(from.x,from.y,to.x,to.y,'#f0d99a',2,[3,7]);ctx.restore();
  }
  // Soft ground shadow and formation footprint.
  ctx.save();ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(x,y+5*scale,13*scale,6*scale,0,0,Math.PI*2);ctx.fill();
  const count=clamp(Math.round(a.troops/5),4,12),cols=3,roster=visibleRoster(a.units,a.troops,count);
  for(let i=0;i<count;i++){
   const row=Math.floor(i/cols),col=i%cols,offsetX=(col-1)*6.5*scale+(row%2?2:0),offsetY=(row-1)*5.5*scale;
   const bob=moving?Math.sin(t*10+i*1.7)*1.4:Math.sin(t*2+i)*.35;
   soldier(x+offsetX,y+offsetY+bob,scale*.9,moving?facing+Math.sin(t*7+i)*.025:0,shade,moving?t*9+i*1.7:0,'player',roster[i]??0);
  }
  banner(x-9*scale,y-3*scale,scale,a.phase+t*.8,'#d2ad64');
  ctx.restore();
  // Command aura and troop count, only visible when zooming/hovering or while moving.
  if(moving||grid.querySelector('.tile.selected')){
   ctx.save();ctx.globalAlpha=.78;ctx.font='600 9px system-ui';ctx.textAlign='center';ctx.fillStyle='#f0dfb3';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(String(a.troops),x,y+19*scale);ctx.restore();
  }
 }
 function drawSiegeEngines(s,t){
  const sieges=Array.isArray(s?.sieges)?s.sieges:[];
  sieges.forEach((siege,index)=>{
   const p=centers[siege.tile];if(!p)return;
   const progress=Math.max(0,Math.min(3,Number(siege.progress)||0)),scale=clamp(p.size/58,.55,1.05);
   const x=p.x+((index%2)?-1:1)*p.size*.23,y=p.y+p.size*.22;
   ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
   // Wheeled wooden siege ram and protective roof.
   ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,7,18,5,0,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#493322';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-14,2);ctx.lineTo(14,2);ctx.stroke();
   [-10,10].forEach(wx=>{ctx.fillStyle='#5b402b';ctx.beginPath();ctx.arc(wx,5,3.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c2a16a';ctx.lineWidth=.8;ctx.stroke();ctx.beginPath();ctx.moveTo(wx-2,5);ctx.lineTo(wx+2,5);ctx.moveTo(wx,3);ctx.lineTo(wx,7);ctx.stroke();});
   ctx.fillStyle='#725438';ctx.strokeStyle='#c19a5d';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-10,-10);ctx.lineTo(10,-10);ctx.lineTo(13,0);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='#d0b37a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,-7);ctx.lineTo(9,-7);ctx.moveTo(-6,-10);ctx.lineTo(-6,0);ctx.moveTo(6,-10);ctx.lineTo(6,0);ctx.stroke();
   ctx.strokeStyle='#4b3324';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-12,-3);ctx.lineTo(12,-3);ctx.stroke();
   ctx.fillStyle='#d1b27a';ctx.beginPath();ctx.arc(0,-3,2.1,0,Math.PI*2);ctx.fill();
   // A catapult arm rises as the siege progresses; its stone shot follows a short arc.
   const launch=(t*.72+progress*.31)%1,arm=-.25-Math.sin(launch*Math.PI)*.42;
   ctx.save();ctx.translate(13,-9);ctx.rotate(arm);ctx.strokeStyle='#9a7448';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-17);ctx.stroke();
   ctx.fillStyle='#c0a16a';ctx.beginPath();ctx.arc(0,-18,2.3,0,Math.PI*2);ctx.fill();ctx.restore();
   // Visible stone flight during the siege cycle.
   const shotPhase=(t*.46+progress*.19)%1;
   if(shotPhase>.56&&shotPhase<.98){
    const q=(shotPhase-.56)/.42,sx=-3+q*23,sy=-13-Math.sin(q*Math.PI)*13;
    ctx.fillStyle='rgba(18,17,14,.28)';ctx.beginPath();ctx.ellipse(sx+2,sy+4,3.8,1.6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5b5141';ctx.strokeStyle='#c1a57a';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(sx,sy,2.8,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(222,198,150,.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx-5,sy+2);ctx.lineTo(sx-1,sy+1);ctx.stroke();
   }
   ctx.restore();
   if(progress>0){
    ctx.save();ctx.globalAlpha=.65;ctx.fillStyle='#e0c18a';ctx.font='600 8px system-ui';ctx.textAlign='center';ctx.fillText('ОСАДА '+Math.floor(progress)+'/3',p.x,p.y-p.size*.35);ctx.restore();
   }
  });
 }
 function drawBattle(s,t,dt){
  const ev=s?.events?.[0]||'';
  if(ev&&ev!==lastEvent){
   lastEvent=ev;
   if(/Победа|перешла под ваш контроль/i.test(ev)){flash=1;flashColor='#e9cf8a';clash=1.35;clashColor='#f1d18a';clashType='victory'}
   else if(/поражение|рассеяно/i.test(ev)){flash=1;flashColor='#a84b43';clash=1.2;clashColor='#dc7766';clashType='defeat'}
   else if(/Отряд прибыл|окружён|осада/i.test(ev)){clash=.9;clashColor='#d6ba7b';clashType='siege'}
   else if(/Пожар/i.test(ev)){flash=.6;flashColor='#ef8746'}
   if(clash>0)clashAt=Number.isInteger(s?.army?.target)?s.army.target:(Number.isInteger(s?.army?.tile)?s.army.tile:(Number.isInteger(s?.selected)?s.selected:-1));
  }
  flash=Math.max(0,flash-dt*.75);clash=Math.max(0,clash-dt*1.35);
  if(flash>0){ctx.save();const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*.7);g.addColorStop(0,flashColor+'18');g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=flash;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore();}
  if(clash>0){const p=centers[clashAt]||(visual?centers[visual.tile]:null);if(p){
   const alpha=Math.min(1,clash),age=1.35-clash,retreat=clashType==='victory'?age*7:clashType==='defeat'?-age*2:0;
   // Rival shield line: small individual figures make a battle readable at map scale.
   ctx.save();ctx.globalAlpha=alpha*.92;
   const guards=[[-8,-8],[0,-12],[8,-8],[0,-3]];
   guards.forEach(([ox,oy],i)=>{const spread=retreat+(clashType==='defeat'?Math.sin(t*6+i)*1.2:0);soldier(p.x+ox+spread,p.y+oy,Math.max(.42,Math.min(.65,p.size/68)),Math.sin(t*5+i)*.05,'#caa985',t*8+i*1.8,'rival',i===0?3:i%3);});
   banner(p.x+11,p.y-6,.45,t*1.5,'#a64c42');
   // Three archer volleys cross the clash in staggered flight paths.
   if(clashType==='victory'||clashType==='defeat'){
    for(let k=0;k<3;k++){
     const phase=age*1.25+k*.19;
     if(phase>=0&&phase<=1){
      const q=phase,ax=p.x-17+q*34,ay=p.y+9-q*18-Math.sin(q*Math.PI)*7+k*2.1;
      const tailX=ax-5,tailY=ay+3;
      ctx.save();ctx.globalAlpha=alpha*(.85-q*.25);ctx.strokeStyle='#d5bd8c';ctx.lineWidth=1.1;ctx.lineCap='round';ctx.shadowColor='#1a1712';ctx.shadowBlur=2;
      ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(ax,ay);ctx.stroke();
      ctx.fillStyle='#d8d2bd';ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-3,ay-2);ctx.lineTo(ax-2,ay+2);ctx.closePath();ctx.fill();
      ctx.restore();
     }
    }
   }
   ctx.restore();
   // Crossing blade arcs and quick impact sparks.
   ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=alpha;ctx.strokeStyle=clashColor;ctx.lineWidth=2;ctx.lineCap='round';ctx.shadowColor=clashColor;ctx.shadowBlur=8;
   const swing=Math.sin(t*15)*.23;ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(9,7+swing*8);ctx.moveTo(10,-8);ctx.lineTo(-8,8-swing*8);ctx.stroke();
   ctx.rotate(t*1.8);ctx.beginPath();ctx.arc(0,0,8+Math.sin(t*13)*3,0,Math.PI*1.7);ctx.stroke();
   for(let k=0;k<7;k++){const a=k*Math.PI*2/7+t*1.4,r=11+Math.sin(t*10+k)*2;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*(r+4),Math.sin(a)*(r+4));ctx.stroke();}
   ctx.restore();
  }}
  if(s?.army&&s.army.path?.length&&visual?.index>=visual.path.length){
   const p=centers[s.army.target];if(p){ctx.save();ctx.strokeStyle='rgba(232,202,130,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,8+Math.sin(t*9)*3,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
 }
 function frame(now){
  if(document.hidden){raf=0;return}
  const dt=Math.min(.05,(now-last)/1000||0);last=now;elapsed+=dt;
  if(Math.floor(now/260)!==Math.floor((now-dt*1000)/260)){snapshot=read();locate();}
  sample(snapshot,dt);ctx.clearRect(0,0,w,h);drawFormation(elapsed,dt,snapshot);drawSiegeEngines(snapshot,elapsed);drawBattle(snapshot,elapsed,dt);
  dust=dust.filter(p=>p.life>0);
  ctx.save();dust.forEach(p=>{p.life-=dt*1.25;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=3*dt;ctx.globalAlpha=Math.max(0,p.life)*.32;ctx.fillStyle='#d9c9a1';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()});ctx.restore();
  raf=requestAnimationFrame(frame);
 }
 new ResizeObserver(resize).observe(wrap);
 new MutationObserver(locate).observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else if(!reduced&&!raf){last=performance.now();raf=requestAnimationFrame(frame)}});
 window.addEventListener('storage',e=>{if(e.key===KEY)snapshot=read()});
 resize();snapshot=read();
 if(!reduced)raf=requestAnimationFrame(frame);else{sample(snapshot,0);drawFormation(0,0,snapshot)}
})();
