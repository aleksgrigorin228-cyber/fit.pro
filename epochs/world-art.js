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
function tree(x,y,s,n){oval(x+s,y+4*s,5*s,2*s,'#18281d88');poly([[x,y-10*s],[x-7*s,y+1*s],[x-3*s,y+1*s],[x-8*s,y+8*s],[x+8*s,y+8*s],[x+3*s,y+1*s],[x+7*s,y+1*s]],rnd(n)>.5?'#426b40':'#315638','#1d3928',s);poly([[x,y-10*s],[x+1*s,y+1*s],[x+5*s,y+1*s]],'#78935b55',null);}
function peak(x,y,s,n){poly([[x-16*s,y+9*s],[x-5*s,y-14*s],[x+1*s,y-4*s],[x+9*s,y-18*s],[x+18*s,y+9*s]],'#656b61','#3e4941',s);poly([[x-5*s,y-14*s],[x+1*s,y-4*s],[x-3*s,y+1*s],[x-9*s,y-1*s]],'#d0cdb9','#838579',.7*s);poly([[x+9*s,y-18*s],[x+18*s,y+9*s],[x+4*s,y+5*s]],'#d9d4c1','#7c8074',.7*s);}
function bridge(x,y,w,h,n){const s=Math.min(w,h)/52,ax=x+w*.32,ay=y+h*.68,bx=x+w*.68,by=y+h*.32,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;ln([[ax,ay+2*s],[bx,by+2*s]],'#172c2d88',8*s);ln([[ax,ay],[bx,by]],'#493827',7*s);ln([[ax,ay-.2*s],[bx,by-.2*s]],'#a78253',5*s);for(let k=0;k<=6;k++){const t=k/6,px=ax+dx*t,py=ay+dy*t;ln([[px-nx*2.2*s,py-ny*2.2*s],[px+nx*2.2*s,py+ny*2.2*s]],'#62482f',.85*s);}for(const side of [-1,1]){const ox=nx*3.4*s*side,oy=ny*3.4*s*side;ln([[ax+ox,ay+oy],[bx+ox,by+oy]],'#5a422d',1.5*s);ln([[ax+ox,ay+oy-.55*s],[bx+ox,by+oy-.55*s]],'#c1a06c',.7*s);for(const t of [0,.18,.82,1]){const px=ax+dx*t+ox,py=ay+dy*t+oy;oval(px,py,1.05*s,1.05*s,'#d2b17a');}}ln([[ax,ay],[bx,by]],'#d3b17a',.45*s);}
function hut(x,y,s,n,keep=false){const roof=rnd(n+2)>.5?'#87543d':'#684333';poly([[x-7*s,y-2*s],[x+7*s,y-2*s],[x+7*s,y+7*s],[x-7*s,y+7*s]],keep?'#c2b28e':'#b3a17d','#554d3d',s*.7);poly([[x-9*s,y-2*s],[x,y-10*s],[x+9*s,y-2*s],[x+5*s,y+1*s],[x,y-4*s],[x-5*s,y+1*s]],roof,'#4b362b',s*.7);if(keep){ln([[x,y-10*s],[x,y-16*s]],'#e5d6b1',s);poly([[x-3*s,y-16*s],[x+4*s,y-14*s],[x-3*s,y-12*s]],'#b64d3c',null);}}
function city(r,tile,n,time){const {x,y,w,h}=r,s=Math.min(w,h)/54,ruin=tile.classList.contains('city-ruined'),damage=tile.classList.contains('city-damaged'),stone=ruin?'#68665b':'#b6a783';
 poly([[x+w*.12,y+h*.33],[x+w*.5,y+h*.15],[x+w*.88,y+h*.33],[x+w*.88,y+h*.7],[x+w*.5,y+h*.87],[x+w*.12,y+h*.7]],ruin?'#57574e':'#a99b7b','#4c4c40',s);
 poly([[x+w*.12,y+h*.33],[x+w*.5,y+h*.51],[x+w*.5,y+h*.87],[x+w*.12,y+h*.7]],ruin?'#414840':'#857a63','#3e443b',s*.8);
 poly([[x+w*.5,y+h*.51],[x+w*.88,y+h*.33],[x+w*.88,y+h*.7],[x+w*.5,y+h*.87]],ruin?'#4b4b43':'#91856a','#41443a',s*.8);
 for(let k=0;k<5;k++){const xx=x+w*(.19+k*.15),yy=y+h*(.31+Math.abs(k-2)*.09);poly([[xx,yy],[xx+3*s,yy-2*s],[xx+3*s,yy+2*s],[xx,yy+4*s]],'#c6b995','#585140',.5*s);}
 for(const [tx,ty] of [[.17,.34],[.83,.34],[.17,.69],[.83,.69]]){poly([[x+w*tx-3*s,y+h*ty-2*s],[x+w*tx+3*s,y+h*ty-2*s],[x+w*tx+3*s,y+h*ty+5*s],[x+w*tx-3*s,y+h*ty+5*s]],stone,'#4d493c',.7*s);poly([[x+w*tx-4*s,y+h*ty-2*s],[x+w*tx,y+h*ty-7*s],[x+w*tx+4*s,y+h*ty-2*s]],'#704a37','#40352b',.7*s);}
 hut(x+w*.5,y+h*.43,1.25*s,n,true);hut(x+w*.3,y+h*.55,.8*s,n+3);hut(x+w*.68,y+h*.56,.82*s,n+5);hut(x+w*.42,y+h*.69,.68*s,n+7);
 poly([[x+w*.59,y+h*.42],[x+w*.65,y+h*.39],[x+w*.65,y+h*.51],[x+w*.59,y+h*.54]],'#c9b993','#655d49',.7*s);
 poly([[x+w*.58,y+h*.42],[x+w*.62,y+h*.34],[x+w*.66,y+h*.42]],'#765342','#45352b',.6*s);ln([[x+w*.62,y+h*.34],[x+w*.62,y+h*.29]],'#dfd1a9',.9*s);
 poly([[x+w*.45,y+h*.68],[x+w*.55,y+h*.68],[x+w*.55,y+h*.84],[x+w*.45,y+h*.84]],'#302e27',null);ln([[x+w*.5,y+h*.83],[x+w*.5,y+h*.98]],'#c4a977',2*s);
 const fx=x+w*.5,fy=y+h*.22,flutter=Math.sin(time*2.4+n)*2*s;ln([[fx,fy-5*s],[fx,fy+7*s]],'#e2d4ae',s);poly([[fx,fy-5*s],[fx+9*s,fy-3*s+flutter],[fx,fy+flutter]],tile.classList.contains('owner-rival')?'#a64c42':'#b68a43','#493b2b',.55*s);
 poly([[x+w*.24,y+h*.61],[x+w*.33,y+h*.59],[x+w*.34,y+h*.63],[x+w*.25,y+h*.65]],'#a44e3e','#55382d',.6*s);ln([[x+w*.25,y+h*.65],[x+w*.25,y+h*.69]],'#5a4835',s);ln([[x+w*.33,y+h*.63],[x+w*.33,y+h*.68]],'#5a4835',s);
 if(damage||ruin)for(let k=0;k<(ruin?6:2);k++){const xx=x+w*(.2+rnd(n+k)*.6),yy=y+h*(.35+rnd(n+k+8)*.35);poly([[xx-5*s,yy],[xx,yy-4*s],[xx+5*s,yy+2*s],[xx+2*s,yy+5*s]],'#4a4a40','#292e29',.6*s);ln([[xx-4*s,yy-4*s],[xx+4*s,yy+4*s]],'#2e302b',.7*s);}
 if(tile.classList.contains('under-siege')){const xx=x+w*.08,yy=y+h*.48;poly([[xx,yy],[xx+w*.13,yy-h*.05],[xx+w*.13,yy+h*.25],[xx,yy+h*.29]],'#795b39','#423326',s);for(let k=0;k<3;k++)ln([[xx,yy+h*(.07+k*.07)],[xx+w*.13,yy+h*(.02+k*.07)]],'#c5a16b',s);for(let k=0;k<4;k++)oval(x+w*(.26+k*.035)+Math.sin(time*2+k)*2*s,y+h*.13-k*2*s,2*s+k*s,3*s+k*s,'#45463e55');}
}
function tile(r,tile,i,time){const {x,y,w,h}=r;if(w<2)return;const type=['terrain-forest','terrain-mountain','terrain-river','terrain-water'].find(v=>tile.classList.contains(v))||'terrain-plains',pal={'terrain-plains':['#788d56','#526d42'],'terrain-forest':['#315b3c','#1e432e'],'terrain-mountain':['#77796d','#535c52'],'terrain-river':['#4c7e80','#315b65'],'terrain-water':['#386b83','#20485f']};
g.save();diamondPath(x+1,y+1,w-2,h-2);g.clip();const grad=g.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,pal[type][0]);grad.addColorStop(1,pal[type][1]);g.fillStyle=grad;g.fillRect(x,y,w,h);
for(let k=0;k<24;k++){const xx=x+rnd(i*31+k)*w,yy=y+rnd(i*67+k+5)*h;ln([[xx,yy],[xx+2+rnd(k)*3,yy-1]],'#d4d29b33',.7);}
if(type==='terrain-forest'){for(let k=0;k<8;k++)tree(x+w*(.12+rnd(i*11+k)*.76),y+h*(.15+rnd(i*17+k)*.7),.5+rnd(i+k)*.5,i*9+k);}
else if(type==='terrain-mountain'){peak(x+w*.32,y+h*.56,.9+rnd(i)*.3,i);peak(x+w*.69,y+h*.47,.72+rnd(i+5)*.25,i+5);poly([[x+w*.08,y+h*.88],[x+w*.38,y+h*.67],[x+w*.56,y+h*.83],[x+w*.82,y+h*.7],[x+w,y+h*.91]],'#45574377',null);}
else if(type==='terrain-river'||type==='terrain-water'){g.beginPath();g.moveTo(x-w*.1,y+h*.16);g.bezierCurveTo(x+w*.42,y+h*.34,x+w*.4,y+h*.68,x+w*1.1,y+h*.78);g.lineTo(x+w*1.1,y+h);g.bezierCurveTo(x+w*.4,y+h*.85,x+w*.25,y+h*.54,x-w*.1,y+h*.4);g.closePath();g.fillStyle=type==='terrain-water'?'#285b78':'#478d99';g.fill();ln([[x-w*.05,y+h*.23],[x+w*.35,y+h*.42],[x+w*.5,y+h*.63],[x+w,y+h*.8]],'#d4eee055',1.5);}
else{
 for(let k=0;k<5;k++){const yy=y+h*(.2+k*.12);ln([[x+w*.08,yy],[x+w*.46,yy+h*.065]],'#d8c58b66',1.1);ln([[x+w*.1,yy+2],[x+w*.45,yy+h*.065+2]],'#344d3266',.55);}
 for(let k=0;k<2;k++){const tx=x+w*(.15+rnd(i+k)*.7),ty=y+h*(.22+rnd(i+k+4)*.55);tree(tx,ty,.3,i+k);}
 if(rnd(i+91)>.53){const mx=x+w*.73,my=y+h*.43,rot=time*.35+i;ln([[mx,my+8],[mx,my-9]],'#6d5236',1.5);poly([[mx-4,my-9],[mx+4,my-9],[mx+3,my-4],[mx-3,my-4]],'#b9a17a','#5a4a36',.7);for(let k=0;k<4;k++){const a=rot+k*Math.PI/2;ln([[mx,my-9],[mx+Math.cos(a)*9,my-9+Math.sin(a)*9]],'#e2d5b2',1.4);}}
}
if(type==='terrain-river'&&rnd(i+73)>.32)bridge(x,y,w,h,i);
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