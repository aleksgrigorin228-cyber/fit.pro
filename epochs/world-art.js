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
function tree(x,y,s,n){oval(x+s,y+4*s,5*s,2*s,'#18281d88');poly([[x,y-10*s],[x-7*s,y+1*s],[x-3*s,y+1*s],[x-8*s,y+8*s],[x+8*s,y+8*s],[x+3*s,y+1*s],[x+7*s,y+1*s]],rnd(n)>.5?'#426b40':'#315638','#1d3928',s);poly([[x,y-10*s],[x+1*s,y+1*s],[x+5*s,y+1*s]],'#78935b55',null);}
function peak(x,y,s,n){poly([[x-16*s,y+9*s],[x-5*s,y-14*s],[x+1*s,y-4*s],[x+9*s,y-18*s],[x+18*s,y+9*s]],'#656b61','#3e4941',s);poly([[x-5*s,y-14*s],[x+1*s,y-4*s],[x-3*s,y+1*s],[x-9*s,y-1*s]],'#d0cdb9','#838579',.7*s);poly([[x+9*s,y-18*s],[x+18*s,y+9*s],[x+4*s,y+5*s]],'#d9d4c1','#7c8074',.7*s);}
function hut(x,y,s,n,keep=false){const roof=rnd(n+2)>.5?'#87543d':'#684333';poly([[x-7*s,y-2*s],[x+7*s,y-2*s],[x+7*s,y+7*s],[x-7*s,y+7*s]],keep?'#c2b28e':'#b3a17d','#554d3d',s*.7);poly([[x-9*s,y-2*s],[x,y-10*s],[x+9*s,y-2*s],[x+5*s,y+1*s],[x,y-4*s],[x-5*s,y+1*s]],roof,'#4b362b',s*.7);if(keep){ln([[x,y-10*s],[x,y-16*s]],'#e5d6b1',s);poly([[x-3*s,y-16*s],[x+4*s,y-14*s],[x-3*s,y-12*s]],'#b64d3c',null);}}
function city(r,tile,n,time){const {x,y,w,h}=r,s=Math.min(w,h)/54,ruin=tile.classList.contains('city-ruined'),damage=tile.classList.contains('city-damaged');
poly([[x+w*.12,y+h*.33],[x+w*.5,y+h*.15],[x+w*.88,y+h*.33],[x+w*.88,y+h*.7],[x+w*.5,y+h*.87],[x+w*.12,y+h*.7]],ruin?'#57574e':'#a99b7b','#4c4c40',s);
poly([[x+w*.12,y+h*.33],[x+w*.5,y+h*.51],[x+w*.5,y+h*.87],[x+w*.12,y+h*.7]],ruin?'#414840':'#857a63','#3e443b',s*.8);
poly([[x+w*.5,y+h*.51],[x+w*.88,y+h*.33],[x+w*.88,y+h*.7],[x+w*.5,y+h*.87]],ruin?'#4b4b43':'#91856a','#41443a',s*.8);
for(let k=0;k<5;k++){const xx=x+w*(.19+k*.15),yy=y+h*(.31+Math.abs(k-2)*.09);poly([[xx,yy],[xx+3*s,yy-2*s],[xx+3*s,yy+2*s],[xx,yy+4*s]],'#c6b995','#585140',.5*s);}
hut(x+w*.5,y+h*.43,1.25*s,n,true);hut(x+w*.3,y+h*.55,.8*s,n+3);hut(x+w*.68,y+h*.56,.82*s,n+5);hut(x+w*.42,y+h*.69,.68*s,n+7);
poly([[x+w*.45,y+h*.68],[x+w*.55,y+h*.68],[x+w*.55,y+h*.84],[x+w*.45,y+h*.84]],'#302e27',null);
if(damage||ruin)for(let k=0;k<(ruin?5:2);k++){const xx=x+w*(.2+rnd(n+k)*.6),yy=y+h*(.35+rnd(n+k+8)*.35);poly([[xx-5*s,yy],[xx,yy-4*s],[xx+5*s,yy+2*s],[xx+2*s,yy+5*s]],'#4a4a40','#292e29',.6*s);}
if(tile.classList.contains('under-siege')){const xx=x+w*.08,yy=y+h*.48;poly([[xx,yy],[xx+w*.13,yy-h*.05],[xx+w*.13,yy+h*.25],[xx,yy+h*.29]],'#795b39','#423326',s);for(let k=0;k<3;k++)ln([[xx,yy+h*(.07+k*.07)],[xx+w*.13,yy+h*(.02+k*.07)]],'#c5a16b',s);for(let k=0;k<4;k++)oval(x+w*(.26+k*.035)+Math.sin(time*2+k)*2*s,y+h*.13-k*2*s,2*s+k*s,3*s+k*s,'#45463e55');}
}
function tile(r,tile,i,time){const {x,y,w,h}=r;if(w<2)return;const type=['terrain-forest','terrain-mountain','terrain-river','terrain-water'].find(v=>tile.classList.contains(v))||'terrain-plains',pal={'terrain-plains':['#788d56','#526d42'],'terrain-forest':['#315b3c','#1e432e'],'terrain-mountain':['#77796d','#535c52'],'terrain-river':['#4c7e80','#315b65'],'terrain-water':['#386b83','#20485f']};
g.save();g.beginPath();g.roundRect(x+1,y+1,w-2,h-2,Math.max(3,w*.07));g.clip();const grad=g.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,pal[type][0]);grad.addColorStop(1,pal[type][1]);g.fillStyle=grad;g.fillRect(x,y,w,h);
for(let k=0;k<24;k++){const xx=x+rnd(i*31+k)*w,yy=y+rnd(i*67+k+5)*h;ln([[xx,yy],[xx+2+rnd(k)*3,yy-1]],'#d4d29b33',.7);}
if(type==='terrain-forest'){for(let k=0;k<8;k++)tree(x+w*(.12+rnd(i*11+k)*.76),y+h*(.15+rnd(i*17+k)*.7),.5+rnd(i+k)*.5,i*9+k);}
else if(type==='terrain-mountain'){peak(x+w*.32,y+h*.56,.9+rnd(i)*.3,i);peak(x+w*.69,y+h*.47,.72+rnd(i+5)*.25,i+5);poly([[x+w*.08,y+h*.88],[x+w*.38,y+h*.67],[x+w*.56,y+h*.83],[x+w*.82,y+h*.7],[x+w,y+h*.91]],'#45574377',null);}
else if(type==='terrain-river'||type==='terrain-water'){g.beginPath();g.moveTo(x-w*.1,y+h*.16);g.bezierCurveTo(x+w*.42,y+h*.34,x+w*.4,y+h*.68,x+w*1.1,y+h*.78);g.lineTo(x+w*1.1,y+h);g.bezierCurveTo(x+w*.4,y+h*.85,x+w*.25,y+h*.54,x-w*.1,y+h*.4);g.closePath();g.fillStyle=type==='terrain-water'?'#285b78':'#478d99';g.fill();ln([[x-w*.05,y+h*.23],[x+w*.35,y+h*.42],[x+w*.5,y+h*.63],[x+w,y+h*.8]],'#d4eee055',1.5);}
else{for(let k=0;k<4;k++){const yy=y+h*(.25+k*.13);ln([[x+w*.08,yy],[x+w*.43,yy+h*.07]],'#d4bd7a55',1);}for(let k=0;k<3;k++)tree(x+w*(.12+rnd(i+k)*.72),y+h*(.2+rnd(i+k+4)*.62),.25,i+k);}
if(type!=='terrain-water'&&type!=='terrain-river')ln([[x+w*.02,y+h*.91],[x+w*.35,y+h*.73],[x+w*.67,y+h*.78],[x+w*.98,y+h*.56]],'#c4ab7955',Math.max(1,w*.025));
if(tile.classList.contains('city'))city(r,tile,i,time);
if(tile.classList.contains('owner-player')){g.fillStyle='#d7bb7740';g.fillRect(x,y,w,h);g.strokeStyle='#e6c982bb';g.lineWidth=1.4;g.strokeRect(x+1,y+1,w-2,h-2);}
if(tile.classList.contains('owner-rival')){g.fillStyle='#b45e5540';g.fillRect(x,y,w,h);g.strokeStyle='#d58c7bbb';g.lineWidth=1.4;g.strokeRect(x+1,y+1,w-2,h-2);}
g.restore();}
function measure(){const b=wrap.getBoundingClientRect();W=Math.max(1,b.width);H=Math.max(1,b.height);D=Math.min(devicePixelRatio||1,2);cv.width=W*D;cv.height=H*D;cv.style.width=W+'px';cv.style.height=H+'px';tiles=[...grid.querySelectorAll('.tile')];rects=tiles.map(t=>{const r=t.getBoundingClientRect();return{x:r.left-b.left,y:r.top-b.top,w:r.width,h:r.height};});}
function paint(t){g.setTransform(D,0,0,D,0,0);g.clearRect(0,0,W,H);tiles.forEach((el,i)=>tile(rects[i],el,i,t/1000));}
function frame(t){if(t-last>40){last=t;paint(t);}raf=requestAnimationFrame(frame);}
const obs=new MutationObserver(()=>{measure();paint(performance.now());});obs.observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
addEventListener('resize',()=>{measure();paint(performance.now());},{passive:true});measure();paint(0);if(!reduce)raf=requestAnimationFrame(frame);addEventListener('pagehide',()=>cancelAnimationFrame(raf));
})();