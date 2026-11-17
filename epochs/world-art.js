/* EPOHI detailed illustrated world renderer */
(()=>{
'use strict';
const wrap=document.querySelector('.map-wrap'),grid=document.getElementById('mapGrid');if(!wrap||!grid)return;
const cv=document.createElement('canvas');cv.className='world-art-canvas';cv.setAttribute('aria-hidden','true');wrap.insertBefore(cv,grid);
const g=cv.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let tiles=[],rects=[],W=1,H=1,D=1,raf=0,last=0;
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
function poly(p,fill,stroke='#354438',sw=1){g.beginPath();p.forEach((v,i)=>i?g.lineTo(v[0],v[1]):g.moveTo(v[0],v[1]));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.stroke();}}
function ln(p,col,w=1){g.beginPath();p.forEach((v,i)=>i?g.lineTo(v[0],v[1]):g.moveTo(v[0],v[1]));g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.stroke();}
function oval(x,y,rx,ry,col){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=col;g.fill();}
function diamondPath(x,y,w,h){g.beginPath();g.moveTo(x+w*.5,y);g.lineTo(x+w,y+h*.5);g.lineTo(x+w*.5,y+h);g.lineTo(x,y+h*.5);g.closePath();}
function tree(x,y,s,n,time=0){
 const sway=Math.sin(time*1.25+n*.31)*.8*s,kind=Math.floor(rnd(n+11)*3),greens=['#315638','#3e6840','#496f43'],base=greens[kind];
 oval(x+s,y+4*s,6*s,2.1*s,'#18281d88');
 if(kind===0){
  poly([[x+sway,y-11*s],[x-7*s+sway*.4,y+1*s],[x-3*s+sway*.5,y+1*s],[x-8*s+sway*.25,y+8*s],[x+8*s+sway*.25,y+8*s],[x+3*s+sway*.5,y+1*s],[x+7*s+sway*.4,y+1*s]],base,'#1d3928',s);
  poly([[x+sway,y-11*s],[x+1*s+sway,y+1*s],[x+5*s+sway,y+1*s]],'#78935b55',null);
 }else{
  ln([[x,y+5*s],[x-sway*.2,y-4*s]],'#694a30',Math.max(.8,2*s));
  ln([[x,y+1*s],[x-4*s+sway*.2,y-3*s]],'#694a30',Math.max(.6,1.15*s));
  ln([[x,y-1*s],[x+4*s+sway*.2,y-5*s]],'#694a30',Math.max(.6,1.15*s));
  const lobes=[[-4,-5,5.1,4.4],[2,-7,5.4,4.7],[0,-2,6.4,4.7],[-5,-1,3.7,3.6],[5,-2,3.9,3.5]];
  lobes.forEach(([ox,oy,rx,ry],k)=>oval(x+ox*s+sway*(.25+k*.1),y+oy*s,rx*s,ry*s,k%2?base:(kind===1?'#426c3e':'#557747')));
  oval(x-1.3*s+sway,y-7*s,2.4*s,1.2*s,'#a0a96b55');
  oval(x+4*s+sway,y-2*s,1.7*s,1*s,'#9caf6a55');
 }
}
function peak(x,y,s,n){poly([[x-16*s,y+9*s],[x-5*s,y-14*s],[x+1*s,y-4*s],[x+9*s,y-18*s],[x+18*s,y+9*s]],'#656b61','#3e4941',s);poly([[x-5*s,y-14*s],[x+1*s,y-4*s],[x-3*s,y+1*s],[x-9*s,y-1*s]],'#d0cdb9','#838579',.7*s);poly([[x+9*s,y-18*s],[x+18*s,y+9*s],[x+4*s,y+5*s]],'#d9d4c1','#7c8074',.7*s);}
function bridge(x,y,w,h,n){const s=Math.min(w,h)/52,ax=x+w*.32,ay=y+h*.68,bx=x+w*.68,by=y+h*.32,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;ln([[ax,ay+2*s],[bx,by+2*s]],'#172c2d88',8*s);ln([[ax,ay],[bx,by]],'#493827',7*s);ln([[ax,ay-.2*s],[bx,by-.2*s]],'#a78253',5*s);for(let k=0;k<=6;k++){const t=k/6,px=ax+dx*t,py=ay+dy*t;ln([[px-nx*2.2*s,py-ny*2.2*s],[px+nx*2.2*s,py+ny*2.2*s]],'#62482f',.85*s);}for(const side of [-1,1]){const ox=nx*3.4*s*side,oy=ny*3.4*s*side;ln([[ax+ox,ay+oy],[bx+ox,by+oy]],'#5a422d',1.5*s);ln([[ax+ox,ay+oy-.55*s],[bx+ox,by+oy-.55*s]],'#c1a06c',.7*s);for(const t of [0,.18,.82,1]){const px=ax+dx*t+ox,py=ay+dy*t+oy;oval(px,py,1.05*s,1.05*s,'#d2b17a');}}ln([[ax,ay],[bx,by]],'#d3b17a',.45*s);}
function hut(x,y,s,n,keep=false){const roof=rnd(n+2)>.5?'#87543d':'#684333';poly([[x-7*s,y-2*s],[x+7*s,y-2*s],[x+7*s,y+7*s],[x-7*s,y+7*s]],keep?'#c2b28e':'#b3a17d','#554d3d',s*.7);poly([[x-9*s,y-2*s],[x,y-10*s],[x+9*s,y-2*s],[x+5*s,y+1*s],[x,y-4*s],[x-5*s,y+1*s]],roof,'#4b362b',s*.7);if(keep){ln([[x,y-10*s],[x,y-16*s]],'#e5d6b1',s);poly([[x-3*s,y-16*s],[x+4*s,y-14*s],[x-3*s,y-12*s]],'#b64d3c',null);}}
function roadLinked(a,b){
 const low=Math.min(a,b),high=Math.max(a,b),sameRow=Math.floor(low/9)===Math.floor(high/9),col=low%9,row=Math.floor(low/9),chance=rnd(low*31+high*17+9);
 return sameRow?(row%2===0||chance>.79):(col%3===1||chance>.84);
}
function drawRoads(x,y,w,h,i){
 const row=Math.floor(i/9),col=i%9,cx=x+w*.5,cy=y+h*.5,links=[];
 const candidates=[
  {j:col>0?i-1:-1,p:[x+w*.25,y+h*.25]},
  {j:col<8?i+1:-1,p:[x+w*.75,y+h*.75]},
  {j:row>0?i-9:-1,p:[x+w*.75,y+h*.25]},
  {j:row<6&&i+9<tiles.length?i+9:-1,p:[x+w*.25,y+h*.75]}
 ];
 for(const edge of candidates){if(edge.j<0||!tiles[edge.j]||tiles[edge.j].classList.contains('terrain-water'))continue;if(roadLinked(i,edge.j))links.push(edge.p);}
 if(!links.length)return;
 const width=Math.max(1,Math.min(w,h)*.055);
 for(const p of links){const points=[[cx,cy],p];ln(points,'#29271fbb',width*2.25);ln(points,'#a68b5e',width*1.35);ln(points,'#d7c18b88',Math.max(.55,width*.28));}
 // Flattened stones and wheel grooves break up the perfect line.
 if(links.length>1){oval(cx,cy,width*.95,width*.45,'#b69a6a');}
}
function city(r,tile,n,time){const {x,y,w,h}=r,s=Math.min(w,h)/54,ruin=tile.classList.contains('city-ruined'),damage=tile.classList.contains('city-damaged'),stone=ruin?'#68665b':'#b6a783';
 poly([[x+w*.12,y+h*.33],[x+w*.5,y+h*.15],[x+w*.88,y+h*.33],[x+w*.88,y+h*.7],[x+w*.5,y+h*.87],[x+w*.12,y+h*.7]],ruin?'#57574e':'#a99b7b','#4c4c40',s);
 poly([[x+w*.12,y+h*.33],[x+w*.5,y+h*.51],[x+w*.5,y+h*.87],[x+w*.12,y+h*.7]],ruin?'#414840':'#857a63','#3e443b',s*.8);
 poly([[x+w*.5,y+h*.51],[x+w*.88,y+h*.33],[x+w*.88,y+h*.7],[x+w*.5,y+h*.87]],ruin?'#4b4b43':'#91856a','#41443a',s*.8);
 for(let k=0;k<5;k++){const xx=x+w*(.19+k*.15),yy=y+h*(.31+Math.abs(k-2)*.09);poly([[xx,yy],[xx+3*s,yy-2*s],[xx+3*s,yy+2*s],[xx,yy+4*s]],'#c6b995','#585140',.5*s);}
 // Crenellated rear curtain wall and a more legible fortified gate.
 if(!ruin){
  for(let side=0;side<2;side++)for(let k=0;k<5;k++){const t=k/5,px=x+w*(side===0?.17+t*.31:.50+t*.33),py=y+h*(side===0?.33-t*.18:.15+t*.18);poly([[px,py-2.4*s],[px+2.1*s,py-3.2*s],[px+2.1*s,py+.4*s],[px,py+1.2*s]],'#d0c19d','#645b48',.35*s);}
  // Gatehouse roof and raised portcullis.
  poly([[x+w*.425,y+h*.61],[x+w*.5,y+h*.54],[x+w*.575,y+h*.61],[x+w*.55,y+h*.64],[x+w*.5,y+h*.61],[x+w*.45,y+h*.64]],'#664633','#3b3026',.7*s);
  poly([[x+w*.47,y+h*.63],[x+w*.53,y+h*.63],[x+w*.53,y+h*.76],[x+w*.47,y+h*.76]],'#292a24','#a28b60',.55*s);
  for(let k=0;k<4;k++)ln([[x+w*(.478+k*.014),y+h*.64],[x+w*(.478+k*.014),y+h*.745]],'#9e8a65',.55*s);
  // Stone walkway and a pair of lit sconces.
  ln([[x+w*.5,y+h*.76],[x+w*.5,y+h*.91]],'#c7aa75',1.8*s);
  for(const ox of [-1,1]){const tx=x+w*(.5+ox*.09),ty=y+h*.7,glow=.55+.35*Math.sin(time*5+n+ox);ln([[tx,ty+3*s],[tx,ty-2*s]],'#60442c',.9*s);oval(tx,ty-3*s,1.4*s,2*s,'rgba(244,164,76,'+glow+')');}
 }
 for(const [tx,ty] of [[.17,.34],[.83,.34],[.17,.69],[.83,.69]]){poly([[x+w*tx-3*s,y+h*ty-2*s],[x+w*tx+3*s,y+h*ty-2*s],[x+w*tx+3*s,y+h*ty+5*s],[x+w*tx-3*s,y+h*ty+5*s]],stone,'#4d493c',.7*s);poly([[x+w*tx-4*s,y+h*ty-2*s],[x+w*tx,y+h*ty-7*s],[x+w*tx+4*s,y+h*ty-2*s]],'#704a37','#40352b',.7*s);}
 hut(x+w*.5,y+h*.43,1.25*s,n,true);hut(x+w*.3,y+h*.55,.8*s,n+3);hut(x+w*.68,y+h*.56,.82*s,n+5);hut(x+w*.42,y+h*.69,.68*s,n+7);
 // Roof ridges, timber braces and glowing windows distinguish the inner quarters.
 for(const [px,py,sz] of [[.3,.55,.8],[.68,.56,.82],[.42,.69,.68]]){
  ln([[x+w*(px-.1*sz),y+h*(py-.1*sz)],[x+w*px,y+h*(py-.24*sz)],[x+w*(px+.1*sz),y+h*(py-.1*sz)]],'#d0a978',.65*s);
  const light=.22+.22*(.5+.5*Math.sin(time*2.3+n+px*8));
  oval(x+w*(px-.025),y+h*(py+.025),.8*s,1.15*s,'rgba(246,196,113,'+light+')');
 }
 poly([[x+w*.59,y+h*.42],[x+w*.65,y+h*.39],[x+w*.65,y+h*.51],[x+w*.59,y+h*.54]],'#c9b993','#655d49',.7*s);
 poly([[x+w*.58,y+h*.42],[x+w*.62,y+h*.34],[x+w*.66,y+h*.42]],'#765342','#45352b',.6*s);ln([[x+w*.62,y+h*.34],[x+w*.62,y+h*.29]],'#dfd1a9',.9*s);
 poly([[x+w*.45,y+h*.68],[x+w*.55,y+h*.68],[x+w*.55,y+h*.84],[x+w*.45,y+h*.84]],'#302e27',null);ln([[x+w*.5,y+h*.83],[x+w*.5,y+h*.98]],'#c4a977',2*s);
 const fx=x+w*.5,fy=y+h*.22,flutter=Math.sin(time*2.4+n)*2*s;ln([[fx,fy-5*s],[fx,fy+7*s]],'#e2d4ae',s);poly([[fx,fy-5*s],[fx+9*s,fy-3*s+flutter],[fx,fy+flutter]],tile.classList.contains('owner-rival')?'#a64c42':'#b68a43','#493b2b',.55*s);
 poly([[x+w*.24,y+h*.61],[x+w*.33,y+h*.59],[x+w*.34,y+h*.63],[x+w*.25,y+h*.65]],'#a44e3e','#55382d',.6*s);
 // Striped awning and market stalls.
 for(let k=0;k<4;k++){const ax=x+w*(.245+k*.022),ay=y+h*.61;ln([[ax,ay],[ax+w*.018,ay-h*.008]],k%2?'#e2c98d':'#70473a',.75*s);}
 for(let k=0;k<3;k++){const bx=x+w*(.25+k*.038),by=y+h*.67;poly([[bx,by],[bx+2.5*s,by-1*s],[bx+2.5*s,by+1.2*s],[bx,by+2*s]],'#806b45','#423a2b',.4*s);}ln([[x+w*.25,y+h*.65],[x+w*.25,y+h*.69]],'#5a4835',s);ln([[x+w*.33,y+h*.63],[x+w*.33,y+h*.68]],'#5a4835',s);
 // Working chimneys: slow, layered smoke remains visible without obscuring the skyline.
 if(!ruin){for(let k=0;k<3;k++){const drift=Math.sin(time*1.35+k*1.6+n)*1.35*s,fade=.19-k*.045;oval(x+w*.62+drift,y+h*.285-k*3.7*s,(1.1+k*.42)*s,(1.05+k*.34)*s,'rgba(54,61,53,'+fade+')');}
   // A tiny forge glow and rising sparks give the settlement a sense of activity.
   const forgeX=x+w*.29,forgeY=y+h*.65;oval(forgeX,forgeY,2.5*s,1.25*s,'#e49a4f99');for(let k=0;k<3;k++){const rise=(time*3.2+k*2.3+n*.07)%7;oval(forgeX+Math.sin(time*2+k)*1.6*s,forgeY-rise*s,.55*s,.8*s,'#edc27a99');}
 }
 if(damage||ruin)for(let k=0;k<(ruin?6:2);k++){const xx=x+w*(.2+rnd(n+k)*.6),yy=y+h*(.35+rnd(n+k+8)*.35);poly([[xx-5*s,yy],[xx,yy-4*s],[xx+5*s,yy+2*s],[xx+2*s,yy+5*s]],'#4a4a40','#292e29',.6*s);ln([[xx-4*s,yy-4*s],[xx+4*s,yy+4*s]],'#2e302b',.7*s);}
 if(tile.classList.contains('under-siege')){
   const xx=x+w*.08,base=y+h*.76,tw=w*.14,th=h*.34,shake=Math.sin(time*4+n)*.6*s;
   // Mobile wooden siege tower with braced frame, covered roof and rolling wheels.
   poly([[xx,base-th],[xx+tw*.5,base-th-h*.045],[xx+tw,base-th],[xx+tw,base],[xx,base]],'#76583a','#3d3025',.8*s);
   poly([[xx-tw*.1,base-th],[xx+tw*.5,base-th-h*.08],[xx+tw*1.1,base-th]],'#49372a','#30271e',.8*s);
   for(let k=0;k<3;k++){const yy=base-th+h*(.1+k*.095);ln([[xx+tw*.12,yy],[xx+tw*.88,yy]],'#c49a61',1.1*s);}
   ln([[xx+tw*.12,base-th],[xx+tw*.12,base]],'#d0a36b',1.8*s);ln([[xx+tw*.88,base-th],[xx+tw*.88,base]],'#d0a36b',1.8*s);
   ln([[xx+tw*.12,base-th*.66],[xx+tw*.88,base-th*.34]],'#b88d57',1.1*s);ln([[xx+tw*.88,base-th*.66],[xx+tw*.12,base-th*.34]],'#b88d57',1.1*s);
   for(const wx of [xx+tw*.2,xx+tw*.8]){oval(wx,base+shake,2.7*s,2.7*s,'#342b22');oval(wx,base+shake,1*s,1*s,'#c29a60');}
   // A low covered ram approaches the gate.
   const rx=x+w*.27,ry=y+h*.72;poly([[rx,ry-3*s],[rx+w*.12,ry-3*s],[rx+w*.14,ry+2*s],[rx,ry+2*s]],'#5e442e','#34291e',.7*s);ln([[rx+2*s,ry-4*s],[rx+w*.13,ry-4*s]],'#b18b59',1.7*s);
   // A counterweight trebuchet cycles through loading, release and projectile flight.
   const cx=x+w*.72,cy=y+h*.78,cycle=(time*.58+n*.19)%5.1,launch=cycle>3.15&&cycle<4.2,flight=launch?(cycle-3.15)/1.05:0,armAngle=cycle<3.15?-.95-(cycle/3.15)*.12:-1.07+Math.min(1,(cycle-3.15)/.36)*.72,armLength=w*.16,tipX=cx+Math.cos(armAngle)*armLength,tipY=cy+Math.sin(armAngle)*armLength;
   poly([[cx-w*.105,cy+2*s],[cx+w*.1,cy+2*s],[cx+w*.085,cy+6*s],[cx-w*.09,cy+6*s]],'#5b422d','#34291f',.7*s);
   for(const wheelX of [cx-w*.075,cx+w*.07]){oval(wheelX,cy+7*s,3*s,3*s,'#352a20');oval(wheelX,cy+7*s,1.25*s,1.25*s,'#c3a06a');}
   ln([[cx-w*.065,cy+2*s],[cx-w*.015,cy-13*s]],'#765536',2.4*s);ln([[cx+w*.065,cy+2*s],[cx+w*.01,cy-13*s]],'#765536',2.4*s);
   ln([[cx-w*.02,cy-2*s],[cx+w*.02,cy-2*s]],'#c9a36b',2*s);
   ln([[cx,cy-9*s],[tipX,tipY]],'#815d38',3*s);ln([[cx,cy-9*s],[tipX,tipY]],'#d0a16a',.8*s);
   // Sling cords and a visible stone at the end of the throwing arm.
   const slingX=tipX-Math.cos(armAngle)*4*s,slingY=tipY-Math.sin(armAngle)*4*s;
   ln([[tipX,tipY],[slingX-2*s,slingY+3*s],[slingX+2*s,slingY+3*s],[tipX,tipY]],'#cdb783',.7*s);
   oval(cx+Math.cos(armAngle+Math.PI/2)*3*s,cy-9*s+Math.sin(armAngle+Math.PI/2)*3*s,3.5*s,2.3*s,'#5b4430');
   if(launch){const px=cx+(x+w*.48-cx)*flight,py=(cy-h*.12)+(y+h*.43-(cy-h*.12))*flight-Math.sin(flight*Math.PI)*h*.25;oval(px,py,2.2*s,1.8*s,'#413c34');oval(px-.7*s,py-.7*s,.7*s,.65*s,'#c3b49a');}
   for(let k=0;k<3;k++){const puff=(time*1.6+k*1.4+n)%4;oval(x+w*(.28+k*.035)+Math.sin(time*1.7+k)*2*s,y+h*.13-puff*2*s,(2+k*.65)*s,(3+k*.8)*s,'rgba(62,65,57,'+(.23-k*.035)+')');}
   for(let k=0;k<3;k++){const spark=(time*4+k*2+n)%6;oval(x+w*.43+Math.sin(time*3+k)*2*s,y+h*.43-spark*s,.7*s,1*s,'#e69b53bb');}
 }
}
function tile(r,tile,i,time){const {x,y,w,h}=r;if(w<2)return;const type=['terrain-forest','terrain-mountain','terrain-river','terrain-water'].find(v=>tile.classList.contains(v))||'terrain-plains',pal={'terrain-plains':['#788d56','#526d42'],'terrain-forest':['#315b3c','#1e432e'],'terrain-mountain':['#77796d','#535c52'],'terrain-river':['#4c7e80','#315b65'],'terrain-water':['#386b83','#20485f']};
g.save();diamondPath(x+1,y+1,w-2,h-2);g.clip();const grad=g.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,pal[type][0]);grad.addColorStop(1,pal[type][1]);g.fillStyle=grad;g.fillRect(x,y,w,h);
for(let k=0;k<24;k++){const xx=x+rnd(i*31+k)*w,yy=y+rnd(i*67+k+5)*h;ln([[xx,yy],[xx+2+rnd(k)*3,yy-1]],'#d4d29b33',.7);}
if(type==='terrain-forest'){for(let k=0;k<8;k++)tree(x+w*(.12+rnd(i*11+k)*.76),y+h*(.15+rnd(i*17+k)*.7),.5+rnd(i+k)*.5,i*9+k,time);}
else if(type==='terrain-mountain'){peak(x+w*.32,y+h*.56,.9+rnd(i)*.3,i);peak(x+w*.69,y+h*.47,.72+rnd(i+5)*.25,i+5);poly([[x+w*.08,y+h*.88],[x+w*.38,y+h*.67],[x+w*.56,y+h*.83],[x+w*.82,y+h*.7],[x+w,y+h*.91]],'#45574377',null);}
else if(type==='terrain-river'||type==='terrain-water'){g.beginPath();g.moveTo(x-w*.1,y+h*.16);g.bezierCurveTo(x+w*.42,y+h*.34,x+w*.4,y+h*.68,x+w*1.1,y+h*.78);g.lineTo(x+w*1.1,y+h);g.bezierCurveTo(x+w*.4,y+h*.85,x+w*.25,y+h*.54,x-w*.1,y+h*.4);g.closePath();g.fillStyle=type==='terrain-water'?'#285b78':'#478d99';g.fill();ln([[x-w*.05,y+h*.23],[x+w*.35,y+h*.42],[x+w*.5,y+h*.63],[x+w,y+h*.8]],'#d4eee055',1.5);for(let k=0;k<4;k++){const u=(time*.12+k*.23+i*.017)%1,gx=x+w*(.08+u*.78),gy=y+h*(.23+u*.52+Math.sin(time*1.1+k+i)*.035);ln([[gx,gy],[gx+w*.045,gy-h*.012]],'#d9f0dc88',Math.max(.6,w*.012));}}
else{
 for(let k=0;k<5;k++){const yy=y+h*(.2+k*.12),sway=Math.sin(time*1.7+k*.82+i*.3)*Math.min(1.15,w*.018);ln([[x+w*.08,yy],[x+w*.46,yy+h*.065+sway]],'#d8c58b77',1.1);ln([[x+w*.1,yy+2],[x+w*.45,yy+h*.065+2+sway]],'#344d3266',.55);}
 for(let k=0;k<2;k++){const tx=x+w*(.15+rnd(i+k)*.7),ty=y+h*(.22+rnd(i+k+4)*.55);tree(tx,ty,.3,i+k,time);}
 if(rnd(i+91)>.53){const mx=x+w*.73,my=y+h*.43,rot=time*.35+i;ln([[mx,my+8],[mx,my-9]],'#6d5236',1.5);poly([[mx-4,my-9],[mx+4,my-9],[mx+3,my-4],[mx-3,my-4]],'#b9a17a','#5a4a36',.7);for(let k=0;k<4;k++){const a=rot+k*Math.PI/2;ln([[mx,my-9],[mx+Math.cos(a)*9,my-9+Math.sin(a)*9]],'#e2d5b2',1.4);}}
}
if(type==='terrain-river'&&((i>=9&&roadLinked(i,i-9))||(i+9<tiles.length&&roadLinked(i,i+9))))bridge(x,y,w,h,i);
drawRoads(x,y,w,h,i);
if(type!=='terrain-water'&&type!=='terrain-river')ln([[x+w*.02,y+h*.91],[x+w*.35,y+h*.73],[x+w*.67,y+h*.78],[x+w*.98,y+h*.56]],'#c4ab7955',Math.max(1,w*.025));
if(tile.classList.contains('city'))city(r,tile,i,time);
if(tile.classList.contains('owner-player')){diamondPath(x+1,y+1,w-2,h-2);g.fillStyle='#d7bb7738';g.fill();g.strokeStyle='#e6c982dd';g.lineWidth=1.5;g.stroke();}
if(tile.classList.contains('owner-rival')){diamondPath(x+1,y+1,w-2,h-2);g.fillStyle='#b45e5538';g.fill();g.strokeStyle='#d58c7bdd';g.lineWidth=1.5;g.stroke();}
if(tile.classList.contains('frontier')){diamondPath(x+2,y+2,w-4,h-4);g.strokeStyle='#e5d18dbb';g.lineWidth=1.2;g.setLineDash([4,3]);g.stroke();g.setLineDash([]);}
if(tile.classList.contains('selected')){diamondPath(x+2,y+2,w-4,h-4);g.strokeStyle='#f0d48b';g.lineWidth=2.2;g.stroke();}
g.restore();g.save();diamondPath(x+.7,y+.7,w-1.4,h-1.4);g.strokeStyle='rgba(18,29,20,.72)';g.lineWidth=1.15;g.stroke();g.restore();}
function arrangeIso(){tiles=[...grid.querySelectorAll('.tile')];const cols=9,rows=Math.ceil(tiles.length/cols),span=cols+rows;if(!tiles.length)return;grid.classList.add('isometric-map');tiles.forEach((el,i)=>{const c=i%cols,r=Math.floor(i/cols);el.style.position='absolute';el.style.left=((rows+c-r-1)/span*100)+'%';el.style.top=((c+r)/span*100)+'%';el.style.width=(200/span)+'%';el.style.height=(200/span)+'%';});}
function measure(){arrangeIso();const b=wrap.getBoundingClientRect();W=Math.max(1,b.width);H=Math.max(1,b.height);D=Math.min(devicePixelRatio||1,2);cv.width=W*D;cv.height=H*D;cv.style.width=W+'px';cv.style.height=H+'px';rects=tiles.map(t=>{const r=t.getBoundingClientRect();return{x:r.left-b.left,y:r.top-b.top,w:r.width,h:r.height};});}
function paint(t){g.setTransform(D,0,0,D,0,0);g.clearRect(0,0,W,H);tiles.forEach((el,i)=>tile(rects[i],el,i,t/1000));}
function frame(t){if(t-last>40){last=t;paint(t);}raf=requestAnimationFrame(frame);}
const obs=new MutationObserver(()=>{measure();paint(performance.now());});obs.observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
addEventListener('resize',()=>{measure();paint(performance.now());},{passive:true});measure();paint(0);if(!reduce)raf=requestAnimationFrame(frame);addEventListener('pagehide',()=>cancelAnimationFrame(raf));
})();