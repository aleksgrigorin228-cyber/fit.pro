/* EPOHI 1.1 — live interactive 3D world, driven by the actual campaign map/save. */
import * as THREE from 'three';
(() => {
'use strict';
const wrap=document.querySelector('.map-wrap'),grid=document.getElementById('mapGrid');
if(!wrap||!grid||window.__epohi3DWorld)return;
window.__epohi3DWorld=true;
const KEY='epohi_world_sim_v1',T=8.5,COLS=9,mobile=matchMedia('(max-width:760px)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const save=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{}}catch(_){return {}}};
const tilesNow=()=>Array.from(grid.querySelectorAll('.tile'));
const terrain=e=>e.classList.contains('terrain-water')?'water':e.classList.contains('terrain-river')?'river':e.classList.contains('terrain-mountain')?'mountain':e.classList.contains('terrain-forest')?'forest':'plain';
const owner=e=>e.classList.contains('owner-player')?'player':e.classList.contains('owner-rival')?'rival':'neutral';
let renderer,scene,camera,land,armyLayer,fxLayer,tiles=[],groups=[],tops=[],flags=[],waters=[],sieges=[],armyUnits=[],armyState=null;
let lastMap='',lastCampaign='',selected=-1,elapsed=0,last=0,raf=0,weather=0,azimuth=.76,polar=1.04,zoom=1,target=new THREE.Vector3(),drag=false,moved=false,px=0,py=0,pointerId=null;
const mat=(c,r=.9,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const M={
 soil:mat('#493e2c'),stone:mat('#99927d'),pale:mat('#c1b493'),rock:mat('#686d67'),wood:mat('#6e4b30'),wood2:mat('#a47a4b'),
 roof:mat('#704536'),roof2:mat('#984e3d'),roofSlate:mat('#59605c'),metal:mat('#89918c',.38,.48),gold:mat('#c2a05b',.4,.2),
 dark:mat('#292c27'),skin:mat('#d2ae87'),green:mat('#436d43'),green2:mat('#547849'),red:mat('#9b4d41'),
 player:mat('#536d4a'),enemy:mat('#8f4038'),horse:mat('#79583d')
};
function tex(kind,seed){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 const pal={plain:['#667a46','#586f3e','#89935c'],forest:['#3d6140','#315339','#54774a'],mountain:['#777b72','#60685f','#999889'],river:['#527a72','#44716d','#809982'],water:['#326d7d','#285b6b','#54848b']}[kind];
 g.fillStyle=pal[0];g.fillRect(0,0,512,512);let s=seed>>>0;
 const rnd2=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
 for(let i=0;i<15000;i++){const x=rnd2()*512,y=rnd2()*512,r=.4+rnd2()*(kind==='mountain'?3:2);g.globalAlpha=.07+rnd2()*.24;g.fillStyle=pal[Math.floor(rnd2()*pal.length)];g.beginPath();g.ellipse(x,y,r*1.5,r,rnd2()*3,0,Math.PI*2);g.fill()}
 if(kind==='mountain')for(let i=0;i<80;i++){const x=rnd2()*512,y=rnd2()*512;g.globalAlpha=.18;g.strokeStyle='#e0dfd0';g.lineWidth=1+rnd2()*2;g.beginPath();g.moveTo(x,y);g.lineTo(x+10+rnd2()*20,y-4-rnd2()*12);g.stroke()}
 if(kind==='water'||kind==='river')for(let i=0;i<130;i++){const x=rnd2()*512,y=rnd2()*512;g.globalAlpha=.13;g.strokeStyle='#d2e3d9';g.lineWidth=.7+rnd2()*1.4;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+10,y-5,x+32,y+rnd2()*4);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
const grounds={};
['plain','forest','mountain','river','water'].forEach((k,i)=>grounds[k]=new THREE.MeshStandardMaterial({map:tex(k,i*91+9),roughness:k==='water'?.3:.97,metalness:k==='water'?.1:0}));
const box=(p,s,pos,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...s),m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
const cyl=(p,a,b,h,n,pos,m)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,n),m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
function poleFlag(p,x,y,z,color,seed){
 cyl(p,.045,.06,2.4,7,[x,y+1.2,z],M.wood2);
 const geo=new THREE.PlaneGeometry(1.15,.72,6,4),mesh=new THREE.Mesh(geo,mat(color,.72));mesh.position.set(x+.58,y+1.93,z);p.add(mesh);
 flags.push({mesh,geo,seed});
}
function tree(p,x,z,seed,scale=1){
 const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);p.add(group);
 cyl(group,.13,.19,1.5,7,[0,.72,0],M.wood);
 const crown=new THREE.Group();crown.position.y=1.1;group.add(crown);
 if(rnd(seed)>.43){
  const green=mat(rnd(seed+2)>.5?'#31583b':'#456f45');
  for(let k=0;k<3;k++)cyl(crown,0,.98-k*.14,1.42-k*.28,7,[0,.58+k*.52,0],green);
 }else{
  const green=mat(rnd(seed+3)>.5?'#4c7545':'#5c814d');
  for(let k=0;k<5;k++){const a=k*1.256,ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),green);ball.position.set(Math.cos(a)*.5,1.12+rnd(seed+k)*.4,Math.sin(a)*.5);ball.scale.y=.86;ball.castShadow=true;crown.add(ball)}
 }
 tops.push({crown,seed});return group;
}
function rock(p,x,z,seed,s=1){
 const o=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),M.rock);o.position.set(x,.45*s,z);o.scale.set(.8*s,.7*s,.9*s);o.rotation.y=rnd(seed)*3;o.castShadow=true;p.add(o);
 if(rnd(seed+4)>.65){const snow=new THREE.Mesh(new THREE.ConeGeometry(.48*s,.58*s,5),mat('#d4d8d0'));snow.position.set(x,.8*s,z);p.add(snow)}
}
function house(p,x,z,seed,s=1,roof=M.roof){
 const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);p.add(g);
 box(g,[1.75,1.4,1.7],[0,.72,0],M.pale);const r=new THREE.Mesh(new THREE.ConeGeometry(1.4,1.18,4),roof);r.position.y=2;r.rotation.y=Math.PI/4;r.castShadow=true;g.add(r);
 box(g,[.42,.82,.08],[0,.42,.86],M.dark);
 for(const dx of [-.52,.52])box(g,[.23,.3,.08],[dx,.92,.87],M.dark);
}
function tower(p,x,z,h=2.8,ruin=false){
 const g=new THREE.Group();g.position.set(x,0,z);p.add(g);
 cyl(g,.78,.95,h,8,[0,h/2,0],ruin?M.rock:M.stone);
 if(!ruin){cyl(g,1.02,.94,.34,8,[0,h+.1,0],M.pale);const roof=new THREE.Mesh(new THREE.ConeGeometry(.94,.8,8),M.roofSlate);roof.position.y=h+.66;g.add(roof)}
 else box(g,[1.35,.38,.8],[0,h,0],M.rock);
}
function city(p,seed,ruin,damaged){
 const g=new THREE.Group();g.position.y=.14;p.add(g);box(g,[6.9,.22,6.7],[0,.12,0],M.soil);
 const wall=ruin?M.rock:M.stone,wh=ruin ? .65 : 1.2;
 box(g,[6.5,wh,.38],[0,wh/2+.18,-3.1],wall);box(g,[6.5,wh,.38],[0,wh/2+.18,3.1],wall);
 box(g,[.38,wh,6.4],[-3.1,wh/2+.18,0],wall);box(g,[.38,wh,2.2],[3.1,wh/2+.18,-2.1],wall);box(g,[.38,wh,2.2],[3.1,wh/2+.18,2.1],wall);
 [[-3.1,-3.1],[3.1,-3.1],[-3.1,3.1],[3.1,3.1]].forEach(v=>tower(g,v[0],v[1],ruin?1.2:2.35,ruin));
 if(!ruin){
  if(damaged){box(g,[1.25,.48,.42],[-1.25,.58,-3.12],M.rock);box(g,[.7,.3,.55],[-1.45,.22,-2.72],M.rock)}
  house(g,-.55,-.6,seed,1.05,M.roof2);house(g,1.45,1.42,seed+2,.66,M.roof);house(g,-1.65,1.55,seed+3,.62,M.roofSlate);
  box(g,[1.5,1.85,1.4],[.25,1,-1.68],M.pale);const chapel=new THREE.Mesh(new THREE.ConeGeometry(1.12,1.3,4),M.roofSlate);chapel.position.set(.25,2.55,-1.68);chapel.rotation.y=.78;g.add(chapel);
  tower(g,.25,-1.68,3.05,false);
  box(g,[1.7,.65,1.25],[-1.9,.63,-.42],M.wood2);box(g,[1.9,.12,1.5],[-1.9,1.04,-.42],M.red);
  for(let k=0;k<3;k++)box(g,[.08,.55,.08],[-2.5+k*.6,.32,-.42],M.wood);
  poleFlag(g,0,3.45,0,seed%2?'#b68a43':'#a94b3f',seed);
 }else{
  box(g,[2.2,.38,1.4],[.1,.34,-.45],M.rock);box(g,[1.4,.35,1.9],[-1.65,.22,1.35],M.rock);
  for(let k=0;k<5;k++){const ember=new THREE.Mesh(new THREE.SphereGeometry(.08,6,5),mat('#d4773d'));ember.position.set((rnd(seed+k)-.5)*5,.5+rnd(seed+k+8), (rnd(seed+k+12)-.5)*5);g.add(ember)}
 }
}
function farm(p,seed){
 for(let r=0;r<5;r++){box(p,[6,.06,.13],[0,.18,-2.5+r*1.12],M.wood2);for(let k=0;k<9;k++)cyl(p,.035,.06,.38,4,[-2.65+k*.65,.39+rnd(seed+r+k)*.06,-2.5+r*1.12],k%3?M.green2:M.gold)}
}
function mill(p){
 box(p,[1.2,2.8,1.1],[0,1.45,0],M.stone);const roof=new THREE.Mesh(new THREE.ConeGeometry(.92,1.05,4),M.roof);roof.position.y=3.35;roof.rotation.y=.78;p.add(roof);
 const rotor=new THREE.Group();rotor.position.set(0,2.65,.85);p.add(rotor);
 for(let i=0;i<4;i++){const b=box(rotor,[.16,2.35,.09],[0,1.18,0],M.wood2);b.rotation.z=i*Math.PI/2;box(b,[.05,1.5,.06],[0,.2,.07],M.pale)}
 return rotor;
}
function border(g,ownerName){
 const col=ownerName==='player'?0xc9a85c:ownerName==='rival'?0xb65e51:0xd0d5c1;
 const points=[[-T/2,.17,-T/2],[T/2,.17,-T/2],[T/2,.17,T/2],[-T/2,.17,T/2]].map(v=>new THREE.Vector3(...v));
 g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.3})));
}
let tileMeshes=[];
function buildTile(el,i){
 const row=Math.floor(i/COLS),col=i%COLS,k=terrain(el),own=owner(el),g=new THREE.Group();g.position.set((col-4)*T,0,(row-3)*T);g.userData.idx=i;land.add(g);groups[i]=g;
 const base=box(g,[T*.98,.42,T*.98],[0,-.2,0],M.soil);
 const geo=new THREE.PlaneGeometry(T*.98,T*.98,9,9);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;
 for(let v=0;v<pos.count;v++){const x=pos.getX(v),z=pos.getZ(v);let h=.025*Math.sin((x+i)*1.4)*Math.cos((z-i)*1.2);if(k==='mountain')h+=Math.max(0,1-Math.hypot(x,z)/6.4)*(1.4+rnd(i+3)*1.4);pos.setY(v,h)}
 geo.computeVertexNormals();const ground=new THREE.Mesh(geo,grounds[k]);ground.position.y=.08;ground.receiveShadow=true;ground.userData.idx=i;g.add(ground);tileMeshes[i]=ground;border(g,own);
 if(k==='mountain')for(let n=0;n<4;n++)rock(g,(rnd(i*11+n)-.5)*4.5,(rnd(i*17+n)-.5)*4.5,i*9+n,.7+rnd(n+i)*.7);
 if(k==='forest')for(let n=0;n<10;n++)tree(g,(rnd(i*41+n)-.5)*6.1,(rnd(i*71+n)-.5)*6.1,i*19+n,.72+rnd(i+n)*.42);
 if(k==='plain'){for(let n=0;n<2;n++)tree(g,(rnd(i+n*9)-.5)*5.8,(rnd(i+n*17)-.5)*5.8,i+200+n,.7)}
 if(k==='water'||k==='river'){
  const w=new THREE.Mesh(new THREE.PlaneGeometry(T*.96,T*.96,8,8),grounds.water);w.rotation.x=-Math.PI/2;w.position.y=.24;w.userData.idx=i;g.add(w);waters.push(w);
  for(let n=0;n<4;n++)rock(g,(rnd(i*7+n)-.5)*6,(rnd(i*9+n)-.5)*6,i+n,.2);
 }
 if(el.classList.contains('city'))city(g,i,el.classList.contains('city-ruined'),el.classList.contains('city-damaged'));
 if(el.classList.contains('farm'))farm(g,i+400);
 if(el.classList.contains('windmill'))mills.push(mill(g));
 if(own!=='neutral')poleFlag(g,own==='player'?-3.2:3.2,.2,own==='player'?-3.2:3.2,own==='player'?'#c5a35d':'#a94d42',i+61);
 if(el.classList.contains('selected')||el.classList.contains('sim-target')){selected=i;selection(g)}
}
function selection(g){const ring=new THREE.Mesh(new THREE.RingGeometry(3.15,3.42,48),new THREE.MeshBasicMaterial({color:'#f0d99a',side:THREE.DoubleSide,transparent:true,opacity:.95}));ring.rotation.x=-Math.PI/2;ring.position.y=.3;ring.userData.ring=true;g.add(ring)}
function clear(g){while(g.children.length){const o=g.children.pop();o.parent=null}}
function signature(list){return list.map(e=>Array.from(e.classList).filter(c=>/^(terrain-|owner-|city|farm|windmill|under-siege|selected|sim-target|developed)/.test(c)).sort().join('.')).join('|')}
let mills=[];
function rebuild(){
 tiles=tilesNow();if(!tiles.length)return false;clear(land);groups=[];tileMeshes=[];tops=[];flags=[];waters=[];mills=[];
 tiles.forEach(buildTile);
 const rows=Math.ceil(tiles.length/COLS);box(land,[COLS*T+4,.5,rows*T+4],[0,-.55,0],mat('#26372b'));
 lastMap=signature(tiles);selected=tiles.findIndex(e=>e.classList.contains('selected')||e.classList.contains('sim-target'));
 return true;
}
const makeSegment=(p,a,b,r,m)=>{const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(v2,v1),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),7),m);o.position.copy(v1).add(v2).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());o.castShadow=true;p.add(o);return o};
function infantry(team,type,phase){
 const g=new THREE.Group(),body=team==='rival'?M.enemy:M.player,cloth=team==='rival'?M.red:M.green;
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.3,.58,4,7),body);torso.position.y=1.25;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.22,9,8),M.skin);head.position.y=1.82;g.add(head);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.255,9,7,0,Math.PI*2,0,Math.PI*.56),M.metal);helmet.position.y=1.91;g.add(helmet);
 const legs=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.16,.93,0);g.add(leg);makeSegment(leg,[0,0,0],[0,-.68,0],.105,M.wood);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(side*.35,1.48,0);g.add(arm);makeSegment(arm,[0,0,0],[side*.1,-.53,.04],.09,cloth);
  if(side>0){if(type==='spearmen')makeSegment(arm,[.1,-.45,.03],[.1,1.12,-.02],.035,M.wood2);else makeSegment(arm,[.1,-.5,.03],[.1,-.48,-.76],.04,M.metal)}
  else{const shield=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.1,8),M.wood2);shield.rotation.x=Math.PI/2;shield.position.set(-.1,-.3,.09);arm.add(shield);const boss=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),M.gold);boss.position.set(-.1,-.3,.18);arm.add(boss)}
 }
 g.userData={kind:'foot',legs,phase};return g;
}
function horseman(team,phase){
 const g=new THREE.Group(),horse=new THREE.Group();g.add(horse);
 const coat=team==='rival'?M.red:M.horse;
 const body=new THREE.Mesh(new THREE.SphereGeometry(.7,12,9),coat);body.scale.set(1.28,.64,.7);body.position.y=1;horse.add(body);
 const neck=cyl(horse,.22,.4,1.05,9,[.72,1.43,0],coat);neck.rotation.z=-.5;
 const head=new THREE.Mesh(new THREE.SphereGeometry(.28,9,8),coat);head.position.set(1.1,1.82,0);head.scale.set(1.2,.72,.75);horse.add(head);
 const legs=[];for(let i=0;i<4;i++){const leg=new THREE.Group();leg.position.set(i<2?.72:-.65,.8,i%2?.3:-.3);horse.add(leg);makeSegment(leg,[0,0,0],[0,-.72,0],.095,coat);legs.push(leg)}
 const rider=infantry(team,'infantry',phase);rider.scale.setScalar(.77);rider.position.set(-.1,.78,0);horse.add(rider);
 g.userData={kind:'horse',legs,rider,phase};return g;
}
function siege(tile,progress){
 const g=new THREE.Group();box(g,[3,.28,1.55],[0,.65,0],M.wood);
 for(const z of [-.78,.78]){const w=cyl(g,.6,.6,.17,12,[0,.65,z],M.wood2);w.rotation.x=Math.PI/2}
 for(const x of [-1.15,1.15]){makeSegment(g,[x,.78,-.7],[x*.75,2.45,0],.1,M.wood2);makeSegment(g,[x,.78,.7],[x*.75,2.45,0],.1,M.wood2)}
 box(g,[2.5,.15,1.3],[0,2.35,0],M.wood);
 const arm=new THREE.Group();arm.position.set(.28,2.42,0);g.add(arm);makeSegment(arm,[0,0,0],[0,2.65,0],.12,M.wood2);
 const shot=new THREE.Mesh(new THREE.SphereGeometry(.19,9,8),M.rock);shot.visible=false;g.add(shot);
 g.userData={tile,progress,arm,shot,phase:tile*.37};return g;
}
function rebuildSieges(s){
 sieges.forEach(g=>fxLayer.remove(g));sieges=[];
 (Array.isArray(s.sieges)?s.sieges:[]).forEach(v=>{const i=Number(v.tile);const g=siege(i,Number(v.progress)||0),r=Math.floor(i/COLS),c=i%COLS;g.position.set((c-4)*T+1.3,.2,(r-3)*T+2.8);fxLayer.add(g);sieges.push(g)})
}
function unitsSync(s,dt){
 if(!s.army){armyLayer.clear();armyUnits=[];armyState=null;return}
 const a=s.army,path=Array.isArray(a.path)?a.path:[],token=String(a.tile)+':'+String(a.target)+':'+path.join(',');
 if(!armyState||armyState.token!==token){
  armyState={token,tile:Number(a.tile),path:path.slice(),index:0,progress:0};
  armyLayer.clear();armyUnits=[];
  const keys=['infantry','spearmen','archers','cavalry'],weights=keys.map(k=>Math.max(0,Number(a.units?.[k])||0)),sum=weights.reduce((x,y)=>x+y,0)||1;
  let count=weights.map(v=>Math.floor(v/sum*15)),left=15-count.reduce((x,y)=>x+y,0);
  weights.map((v,i)=>({i,d:v/sum*15-count[i]})).sort((x,y)=>y.d-x.d).slice(0,left).forEach(x=>count[x.i]++);
  let n=0;count.forEach((num,type)=>{for(let k=0;k<num;k++){const m=type===3?horseman('player',n*.47):infantry('player',keys[type],n*.47);m.scale.setScalar(type===3 ? .65 : .56);m.position.set((n%5-2)*.72,.2,Math.floor(n/5)*.72);armyLayer.add(m);armyUnits.push(m);n++}});
  const banner=new THREE.Group();poleFlag(banner,0,0,0,'#c5a15b',99);banner.position.set(-2,.2,-1.3);armyLayer.add(banner);
 }
 if(armyState.path.length&&armyState.index<armyState.path.length){const nextIndex=Number(armyState.path[armyState.index]),nextTile=tiles[nextIndex],kind=nextTile?terrain(nextTile):'plain';const terrainSpeed=kind==='mountain'?.42:kind==='forest'?.68:kind==='river'?.55:1;const cavalry=(Number(a.units?.cavalry)||0)/Math.max(1,Number(a.troops)||1);const supplyFactor=(Number(s.supply)||0)<25?.65:1;armyState.progress+=dt*[1,.78,.86,.58][Number(s.weather)%4]*terrainSpeed*supplyFactor*(1+cavalry*.18)*.7;if(armyState.progress>=1){armyState.progress-=1;armyState.tile=Number(armyState.path[armyState.index++])}}
 const i=armyState.tile,r=Math.floor(i/COLS),c=i%COLS;let x=(c-4)*T,z=(r-3)*T;
 if(armyState.index<armyState.path.length){const ni=Number(armyState.path[armyState.index]),nr=Math.floor(ni/COLS),nc=ni%COLS;x+=((nc-4)*T-x)*armyState.progress;z+=((nr-3)*T-z)*armyState.progress}
 armyLayer.position.set(x,.25,z);
 armyUnits.forEach((m,k)=>{const moving=armyState.index<armyState.path.length,phase=elapsed*7+k*1.7;m.position.y=.2+(moving?Math.max(0,Math.sin(phase))*.07:Math.sin(elapsed+k)*.015);m.rotation.y=moving?Math.PI/2:0;m.userData.legs?.forEach((leg,j)=>leg.rotation.x=moving?Math.sin(phase+j*Math.PI)*.48:Math.sin(elapsed+k+j)*.02);if(m.userData.rider)m.userData.rider.rotation.z=moving?Math.sin(phase*.5)*.03:0});
}
function syncSelect(){
 const idx=tiles.findIndex(e=>e.classList.contains('selected')||e.classList.contains('sim-target'));if(idx===selected)return;selected=idx;
 groups.forEach((g,i)=>{g.children.filter(x=>x.userData.ring).forEach(x=>g.remove(x));if(i===idx)selection(g)});
}
function syncWeather(s){
 weather=Number(s.weather)||0;if(scene?.fog)scene.fog.density=weather===2?.006:weather===1?.0032:weather===3?.0028:.0018;if(!rain)return;
 rain.visible=weather===1||weather===3;rain.material.color.set(weather===1?'#b8cfdd':'#eef2f0');rain.material.size=weather===1?.075:.15;rain.material.opacity=weather===1?.42:.76;
}
let rain, rainPos;
function createRain(){
 const count=mobile?240:520;rainPos=new Float32Array(count*3);
 for(let i=0;i<count;i++){rainPos[i*3]=(rnd(i+4)-.5)*100;rainPos[i*3+1]=rnd(i+9)*25;rainPos[i*3+2]=(rnd(i+15)-.5)*80}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));rain=new THREE.Points(geo,new THREE.PointsMaterial({color:'#dae4e3',size:.12,transparent:true,opacity:.5,depthWrite:false}));rain.visible=false;fxLayer.add(rain);
}
function tickRain(dt){if(!rain?.visible)return;const p=rain.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)-dt*(weather===1?16:2);let x=p.getX(i)+dt*(weather===1?3:Math.sin(elapsed+i)*.4);if(y<.15){y=18+rnd(i+elapsed)*10;x=(rnd(i+elapsed*2)-.5)*95}p.setXY(i,x,y)}p.needsUpdate=true}
function daylight(s){
 const phase=Number(s.phase)||1,values=[.22,1,.56,.12],v=values[phase%4];scene.fog.color.set(v<.3?'#182631':'#82917d');scene.background.copy(scene.fog.color);
 scene.children.forEach(o=>{if(o.isDirectionalLight)o.intensity=.45+v*1.72;if(o.isAmbientLight)o.intensity=.24+v*.6});
}
function updateFlags(){
 flags.forEach(f=>{f.mesh.rotation.y=Math.sin(elapsed*2.3+f.seed)*.18;const p=f.geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(elapsed*3+f.seed+p.getX(i)*2)*.12*Math.abs(p.getX(i)));p.needsUpdate=true;f.geo.computeVertexNormals()});
 tops.forEach(t=>{t.crown.rotation.z=Math.sin(elapsed*.7+t.seed)*.018;t.crown.rotation.x=Math.cos(elapsed*.5+t.seed)*.012});
 waters.forEach(w=>{w.position.y=.23+Math.sin(elapsed*1.5+w.userData.idx)*.025});
 mills.forEach(m=>{m.rotation.z=elapsed*.65});
 sieges.forEach(g=>{const d=g.userData,q=(elapsed*.52+d.phase)%1;d.arm.rotation.z=-.2-Math.sin(q*Math.PI)*.42;d.shot.visible=q>.56&&q<.98;d.shot.position.set(1+(q-.56)/.42*4,3.1+Math.sin((q-.56)/.42*Math.PI)*4,0)});
}
function cameraFit(){
 const rows=Math.ceil(Math.max(1,tiles.length)/COLS),w=COLS*T,h=rows*T;
 target.set(0,0,0);zoom=1;azimuth=.76;polar=1.04;
 const d=Math.max(w*.92,h*1.62,74);camera.position.set(Math.sin(azimuth)*d*Math.sin(polar),Math.cos(polar)*d,Math.cos(azimuth)*d*Math.sin(polar));camera.lookAt(target);camera.userData.baseDistance=d;
}
function cameraMove(){
 const d=camera.userData.baseDistance/zoom,s=Math.sin(polar);
 camera.position.set(target.x+Math.sin(azimuth)*d*s,target.y+Math.cos(polar)*d,target.z+Math.cos(azimuth)*d*s);camera.lookAt(target);
}
function pick(e){
 const r=renderer.domElement.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,camera);
 const hits=ray.intersectObjects(tileMeshes,false);if(!hits.length)return;
 const el=tiles[hits[0].object.userData.idx];if(el)el.click();
}
function start(){
 renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.15:1.6));renderer.setSize(wrap.clientWidth,wrap.clientHeight);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.className='world3d-canvas';renderer.domElement.setAttribute('aria-label','Трёхмерная интерактивная карта');wrap.insertBefore(renderer.domElement,toolbar);
 scene=new THREE.Scene();scene.background=new THREE.Color('#81917d');scene.fog=new THREE.FogExp2('#81917d',.0028);
 camera=new THREE.PerspectiveCamera(43,wrap.clientWidth/Math.max(1,wrap.clientHeight),.1,400);
 land=new THREE.Group();armyLayer=new THREE.Group();fxLayer=new THREE.Group();scene.add(land,armyLayer,fxLayer);
 scene.add(new THREE.HemisphereLight('#e7e3cd','#536045',.96));scene.add(new THREE.AmbientLight('#b6c4ad',.46));
 const sun=new THREE.DirectionalLight('#ffe4b0',2.05);sun.position.set(-36,68,-30);sun.castShadow=!mobile;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-62;sun.shadow.camera.right=62;sun.shadow.camera.top=62;sun.shadow.camera.bottom=-62;sun.shadow.bias=-.0002;scene.add(sun);
 createRain();if(!rebuild())return;
 rebuildSieges(save());daylight(save());cameraFit();wrap.classList.add('world-3d-active');entry.style.display='none';
 toolbar.querySelector('[data-world3d="2d"]').addEventListener('click',()=>mode(false));
 toolbar.querySelector('[data-world3d="overview"]').addEventListener('click',cameraFit);
 toolbar.querySelector('[data-world3d="light"]').addEventListener('click',()=>{renderer.toneMappingExposure=renderer.toneMappingExposure>1.15?.86:1.25;scene.fog.density=scene.fog.density>.003?.0016:.0032});
 renderer.domElement.addEventListener('pointerdown',e=>{drag=true;moved=false;pointerId=e.pointerId;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(pointerId)});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==pointerId)return;const dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;azimuth-=dx*.006;polar=clamp(polar+dy*.004,.48,1.35);px=e.clientX;py=e.clientY;cameraMove()});
 const release=e=>{if(!drag||e.pointerId!==pointerId)return;drag=false;try{renderer.domElement.releasePointerCapture(pointerId)}catch(_){}if(!moved)pick(e)};
 renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);
 renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom-e.deltaY*.001, .58,2.15);cameraMove()},{passive:false});
 new ResizeObserver(()=>{if(!renderer)return;const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}).observe(wrap);
 new MutationObserver(()=>{const a=tilesNow(),fp=signature(a);if(a.length!==tiles.length||fp!==lastMap)rebuild();syncSelect()}).observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0}else if(!document.hidden&&!reduced&&!raf){last=0;raf=requestAnimationFrame(frame)}});
 window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);renderer.dispose()});
 if(!reduced)raf=requestAnimationFrame(frame);else renderer.render(scene,camera);
}
const toolbar=document.createElement('div');toolbar.className='world3d-toolbar';toolbar.innerHTML='<div class="world3d-title"><i></i><span>ЖИВОЙ МИР · 3D</span></div><div class="world3d-actions"><button data-world3d="overview">Обзор</button><button data-world3d="light">Свет</button><button data-world3d="2d">2D карта</button></div>';
const hint=document.createElement('div');hint.className='world3d-hint';hint.textContent='Перетаскивайте для обзора · колесо — масштаб · нажмите область для выбора';const entry=document.createElement('button');entry.type='button';entry.className='world3d-entry';entry.textContent='Открыть 3D-мир';entry.addEventListener('click',()=>mode(true));wrap.append(toolbar,hint,entry);
function mode(on){wrap.classList.toggle('world-3d-active',on);toolbar.style.display=on?'flex':'none';hint.style.display=on?'block':'none';entry.style.display=on?'none':'block';if(renderer){renderer.domElement.style.display=on?'block':'none';if(on){renderer.setSize(wrap.clientWidth,wrap.clientHeight);cameraMove()}}}
function frame(now){
 if(!renderer||document.hidden){raf=0;return}const dt=Math.min(.05,(now-(last||now))/1000||0);last=now;elapsed+=dt;
 const s=save(),list=tilesNow(),fp=signature(list);if(list.length!==tiles.length||fp!==lastMap)rebuild();syncSelect();
 const camp=JSON.stringify([s.sieges||[],s.weather,s.phase,s.army||null,s.events?.[0]||'']);
 if(camp!==lastCampaign){lastCampaign=camp;rebuildSieges(s);daylight(s);syncWeather(s)}
 unitsSync(s,dt);updateFlags();tickRain(dt);renderer.render(scene,camera);raf=requestAnimationFrame(frame)
}
function boot(){
 try{start()}catch(e){console.error('EPOHI 3D startup error',e);wrap.classList.remove('world-3d-active');toolbar.style.display='none';hint.style.display='none';const n=document.createElement('div');n.className='world3d-fallback';n.textContent='3D-режим недоступен в этом браузере. Сохранилась обычная карта.';wrap.append(n)}
}
if(tilesNow().length)boot();else{const o=new MutationObserver(()=>{if(tilesNow().length){o.disconnect();boot()}});o.observe(grid,{childList:true,subtree:true});setTimeout(()=>{if(!renderer&&tilesNow().length){o.disconnect();boot()}},3000)}
})();
