/* EPOHI 0.5.0 — animated operational map and lightweight campaign simulation */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const grid = $('mapGrid');
const mapWrap = document.querySelector('.map-wrap');
const mapPanel = document.querySelector('.map-panel');
if (!grid || !mapWrap || !mapPanel) return;
const KEY = 'epohi_world_sim_v1';
const weatherTypes = [
  {id:'clear',name:'Ясно',icon:'☀️',speed:1,combat:1,supply:1},
  {id:'rain',name:'Дождь',icon:'🌧️',speed:.78,combat:.94,supply:.96},
  {id:'fog',name:'Туман',icon:'🌫️',speed:.86,combat:.82,supply:.9},
  {id:'snow',name:'Снег',icon:'❄️',speed:.58,combat:.88,supply:.76}
];
const terrainNames = { 'terrain-plains':'Равнина','terrain-forest':'Лес','terrain-mountain':'Горы','terrain-river':'Переправа','terrain-water':'Вода' };
const fresh = () => ({version:1,turn:1,weather:0,supply:100,morale:82,selected:-1,army:null,events:['Оперативная карта готова. Отметьте область и отправьте туда войско.'],captured:[],phase:1,population:1250,development:[],fire:null,treasury:120,food:90,tax:'normal',unrest:12,granary:false,tradeCooldown:0,sieges:[],cityDamage:{}});
function load(){
  try { const x=JSON.parse(localStorage.getItem(KEY)||'null'); if(!x||x.version!==1)return fresh();
    return {...fresh(),...x,events:Array.isArray(x.events)?x.events.slice(0,12):[],captured:Array.isArray(x.captured)?x.captured:[],sieges:Array.isArray(x.sieges)?x.sieges:[],cityDamage:x.cityDamage&&typeof x.cityDamage==='object'?x.cityDamage:{}};
  } catch(_){return fresh();}
}
let state=load(), tiles=[], points=[], lastFrame=0, raf=0, particles=[];
const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const weather=()=>weatherTypes[state.weather%weatherTypes.length];
function log(message){state.events.unshift(message);state.events=state.events.slice(0,12);save();renderLog();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
function troopCount(){const n=Number((($('armyLabel')?.textContent||'28').match(/\d+/)||['28'])[0]);return Number.isFinite(n)?n:28;}
function getTiles(){return Array.from(grid.querySelectorAll('.tile'));}
function tileTerrain(tile){return Object.keys(terrainNames).find(k=>tile.classList.contains(k))||'terrain-plains';}
function tileOwner(tile){return tile.classList.contains('owner-player')?'player':tile.classList.contains('owner-rival')?'rival':'neutral';}
function tileName(tile,i){return tile.querySelector('.tile-name')?.textContent?.trim()||tile.textContent.trim().slice(0,24)||('Область '+(i+1));}
function syncTiles(){
 tiles=getTiles();
 state.captured.forEach(i=>{const t=tiles[i];if(t){t.classList.remove('owner-rival','owner-neutral');t.classList.add('owner-player');}});
 tiles.forEach((t,i)=>{const damage=Number(state.cityDamage[i]||0);t.classList.toggle('city-damaged',damage>0);t.classList.toggle('city-ruined',damage>=3);t.classList.toggle('under-siege',state.sieges.some(x=>x.tile===i));});
 if(state.selected>=tiles.length)state.selected=-1;
}
function makeUI(){
 const panel=document.createElement('section');panel.className='world-sim panel-body';panel.id='worldSim';
 panel.innerHTML='<div class="sim-heading"><div><div class="eyebrow">ЖИВОЙ МИР · ТАКТИЧЕСКАЯ СИМУЛЯЦИЯ</div><h3>Оперативная карта</h3><p>Отправляйте отряды по областям. Рельеф, погода, снабжение и боевой дух влияют на исход похода.</p></div><span class="sim-version">0.5.0</span></div>'+
 '<div class="sim-stats"><div><span>Погода</span><b id="simWeather">☀️ Ясно</b></div><div><span>Время суток</span><b id="simPhase">☀️ День</b></div><div><span>Население</span><b id="simPopulation">1 250</b></div><div><span>Снабжение</span><b id="simSupply">100%</b></div><div><span>Боевой дух</span><b id="simMorale">82%</b></div><div><span>Отряд</span><b id="simArmy">Нет войска</b></div></div>'+
 '<div class="sim-economy"><div class="sim-economy-head"><strong>Казна и хозяйство</strong><span id="simEconomyStatus">Держава стабильна</span></div><div class="sim-economy-stats"><div>Казна <b id="simTreasury">120</b></div><div>Запасы пищи <b id="simFood">90</b></div><div>Налоги <b id="simTax">Обычные</b></div><div>Недовольство <b id="simUnrest">12%</b></div></div><div class="sim-policy"><span>Налоговая политика</span><button class="btn" data-tax="low">Низкие</button><button class="btn active" data-tax="normal">Обычные</button><button class="btn" data-tax="high">Высокие</button></div><div class="sim-actions"><button class="btn" id="simTrade">🛒 Торговый караван</button><button class="btn" id="simGranary">🌾 Построить амбар</button></div></div>'+'<div class="sim-actions"><button class="btn primary" id="simMarch" disabled>⚔️ Отправить отряд</button><button class="btn" id="simTrain">🛡️ Учения (+мораль)</button><button class="btn" id="simDevelop" disabled>🏗️ Развивать город</button><button class="btn" id="simTurn">⏳ Сменить сезон</button></div>'+
 '<div class="sim-selection" id="simSelection">Выберите область на карте, чтобы проложить маршрут.</div>'+
 '<div class="sim-log"><div class="sim-log-title">Хроника похода</div><div id="simLog" aria-live="polite"></div></div>';
 mapPanel.appendChild(panel);
 const canvas=document.createElement('canvas');canvas.className='sim-canvas';canvas.setAttribute('aria-hidden','true');mapWrap.appendChild(canvas);
 return canvas;
}
const canvas=makeUI(),ctx=canvas.getContext('2d');
function renderEconomy(){const taxNames={low:'Низкие',normal:'Обычные',high:'Высокие'};$('simTreasury').textContent=Math.floor(state.treasury)+' 🪙';$('simFood').textContent=Math.floor(state.food)+' ед.';$('simTax').textContent=taxNames[state.tax]||taxNames.normal;$('simUnrest').textContent=Math.round(state.unrest)+'%';$('simEconomyStatus').textContent=state.food<20?'Угроза голода':state.unrest>65?'Риск волнений':state.treasury<15?'Казна истощена':state.granary?'Амбар действует':'Держава стабильна';document.querySelectorAll('[data-tax]').forEach(b=>b.classList.toggle('active',b.dataset.tax===state.tax));$('simGranary').textContent=state.granary?'🌾 Амбар построен':'🌾 Построить амбар';$('simGranary').disabled=state.granary||state.treasury<65;}function renderLog(){const node=$('simLog');if(node)node.innerHTML=state.events.map(x=>'<div class="sim-log-entry">'+escapeHTML(x)+'</div>').join('');}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function updatePoints(){
 syncTiles();const wrap=mapWrap.getBoundingClientRect();
 const dpr=Math.min(window.devicePixelRatio||1,2);
 const w=Math.max(1,Math.round(wrap.width)),h=Math.max(1,Math.round(wrap.height));
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 points=tiles.map(t=>{const r=t.getBoundingClientRect();return{x:r.left-wrap.left+r.width/2,y:r.top-wrap.top+r.height/2,w:r.width,h:r.height};});
}
function renderUI(){
 const w=weather(),army=state.army;const phases=[['🌅','Рассвет'],['☀️','День'],['🌇','Закат'],['🌙','Ночь']];const phase=phases[state.phase%4];
 $('simWeather').textContent=w.icon+' '+w.name;$('simPhase').textContent=phase[0]+' '+phase[1];$('simPopulation').textContent=Math.round(state.population).toLocaleString('ru-RU');$('simSupply').textContent=Math.round(state.supply)+'%';$('simMorale').textContent=Math.round(state.morale)+'%';
 $('simArmy').textContent=army?army.troops+' воинов':'Нет войска';
 const march=$('simMarch');march.disabled=!army||state.selected<0||state.selected===army.tile||army.path?.length>0;
 const sel=state.selected>=0?tiles[state.selected]:null;const develop=$('simDevelop');develop.disabled=!sel||!sel.classList.contains('city')||tileOwner(sel)!=='player'||state.development.some(x=>x.tile===state.selected);
 const activeSiege=sel&&state.sieges.find(x=>x.tile===state.selected);$('simSelection').textContent=sel?'Цель: '+tileName(sel,state.selected)+' · '+terrainNames[tileTerrain(sel)]+' · '+(activeSiege?'ОСАДА '+Math.min(3,Math.floor(activeSiege.progress))+'/3':tileOwner(sel)==='rival'?'вражеская территория':tileOwner(sel)==='player'?'ваша территория':'нейтральная область'):'Выберите область на карте, чтобы проложить маршрут.';
 renderLog();renderEconomy();
}
function neighbors(i){const row=Math.floor(i/9),col=i%9,out=[];if(col>0)out.push(i-1);if(col<8)out.push(i+1);if(row>0)out.push(i-9);if(row<6)out.push(i+9);return out.filter(n=>n<tiles.length);}
function route(from,to){
 const q=[from],prev=new Map([[from,-1]]);
 while(q.length){const n=q.shift();if(n===to)break;for(const v of neighbors(n)){if(prev.has(v)||tileTerrain(tiles[v])==='terrain-water')continue;prev.set(v,n);q.push(v);}}
 if(!prev.has(to))return null;const path=[];for(let n=to;n!==from;n=prev.get(n))path.push(n);return path.reverse();
}
function selectTile(tile){
 const i=tiles.indexOf(tile);if(i<0)return;state.selected=i;tiles.forEach(t=>t.classList.toggle('sim-target',t===tile));renderUI();save();
}
function march(){
 if(!state.army||state.selected<0||state.army.path?.length)return;
 const path=route(state.army.tile,state.selected);
 if(!path){log('Маршрут перекрыт водой или недоступным участком.');return;}
 if(!path.length)return;
 state.army.path=path;state.army.progress=0;state.army.target=state.selected;
 log('Отряд выступил к области «'+tileName(tiles[state.selected],state.selected)+'».');
 renderUI();save();
}
function battle(army,target){
 const tile=tiles[target],owner=tileOwner(tile);
 if(owner==='rival'&&tile.classList.contains('city')){
   if(!state.sieges.some(x=>x.tile===target)){
     state.sieges.push({tile:target,progress:0,started:state.turn});syncTiles();
     state.cityDamage[target]=Math.max(0,Number(state.cityDamage[target]||0));
     log('Город «'+tileName(tile,target)+'» окружён. Началась осада: перекрыты дороги и подвоз припасов.');
   }
   state.morale=Math.max(0,state.morale-3);return;
 }
 const terrain=tileTerrain(tile),weatherMod=weather().combat;
 const defense=owner==='rival'?18+Math.floor(state.turn*1.4):owner==='neutral'?7+Math.floor(state.turn*.45):0;
 const terrainDefense=terrain==='terrain-mountain'?1.45:terrain==='terrain-forest'?1.2:terrain==='terrain-river'?1.3:1;
 const attack=army.troops*(.55+state.morale/200)*weatherMod,defensePower=defense*terrainDefense;
 if(owner==='player'){log('Отряд прибыл в дружественную область.');return;}
 const losses=Math.min(army.troops,Math.max(1,Math.round(defensePower*.22+army.troops*.07)));
 army.troops-=losses;state.morale=Math.max(0,state.morale-(owner==='rival'?13:5));
 if(attack>defensePower&&army.troops>0){
   state.captured=[...new Set([...state.captured,target])];tile.classList.remove('owner-rival','owner-neutral');tile.classList.add('owner-player');
   log('Победа! «'+tileName(tile,target)+'» перешла под ваш контроль. Потери: '+losses+'.');
   state.morale=Math.min(100,state.morale+8);state.supply=Math.max(20,state.supply-12);
 }else{
   log('Отряд потерпел поражение у «'+tileName(tile,target)+'». Потери: '+losses+'.');
   if(army.troops<=0){state.army=null;log('Войско рассеяно. Для нового похода нужны оставшиеся в основном войске солдаты.');}
   else{army.path=[];army.target=army.tile;state.supply=Math.max(0,state.supply-18);}
 }
}
function advanceSieges(){
 const completed=[];
 state.sieges.forEach(siege=>{
   const tile=tiles[siege.tile],army=state.army;
   if(!tile||tileOwner(tile)!=='rival'){completed.push(siege.tile);return;}
   if(!army||army.tile!==siege.tile||army.path?.length)return;
   if(army.troops<=0||state.supply<8){log('Осада «'+tileName(tile,siege.tile)+'» остановлена: войску не хватает сил или припасов.');return;}
   const gain=Math.max(.55,Math.min(1.15,army.troops/38))*((state.morale<25)?.7:1);
   siege.progress=Math.min(3,siege.progress+gain);
   const damage=Math.min(3,Math.floor(siege.progress+.25));
   state.cityDamage[siege.tile]=Math.max(Number(state.cityDamage[siege.tile]||0),damage);
   const losses=Math.max(1,Math.round(army.troops*.025+(3-state.supply/50)));
   army.troops=Math.max(0,army.troops-losses);state.supply=Math.max(0,state.supply-8);state.morale=Math.max(0,state.morale-2);
   log('Осадные орудия обстреливают «'+tileName(tile,siege.tile)+'». Стены повреждены ('+Math.floor(siege.progress)+'/3). Потери осаждающих: '+losses+'.');
   if(siege.progress>=3&&army.troops>0){
     state.captured=[...new Set([...state.captured,siege.tile])];
     tile.classList.remove('owner-rival','owner-neutral','under-siege');tile.classList.add('owner-player','city-ruined');
     state.cityDamage[siege.tile]=3;completed.push(siege.tile);state.morale=Math.min(100,state.morale+10);
     log('Стены пали! Город «'+tileName(tile,siege.tile)+'» захвачен. Он сильно разрушен и нуждается в восстановлении.');
   }else if(army.troops<=0){completed.push(siege.tile);log('Осадный отряд уничтожен у стен «'+tileName(tile,siege.tile)+'».');state.army=null;}
 });
 if(completed.length)state.sieges=state.sieges.filter(x=>!completed.includes(x.tile));
 syncTiles();
}
function economyTick(){const lands=Math.max(1,Number((($('landLabel')?.textContent||'5').match(/\d+/)||['5'])[0]));const taxRate=state.tax==='low'?1:state.tax==='high'?3:2;const income=lands*taxRate;state.treasury+=income;const harvest=lands*(state.granary?5:3);state.food+=harvest;const populationUse=Math.max(1,Math.ceil(state.population/450));const armyUse=state.army?Math.max(1,Math.ceil(state.army.troops/12)):0;state.food=Math.max(0,state.food-populationUse-armyUse);state.treasury=Math.max(0,state.treasury-armyUse);if(state.food===0){state.unrest=Math.min(100,state.unrest+12);state.morale=Math.max(0,state.morale-8);state.population=Math.max(100,state.population-25);log('Голод: запасы пищи исчерпаны. Население и боевой дух падают.');}else{state.unrest=Math.max(0,state.unrest+(state.tax==='high'?8:state.tax==='low'?-5:0)-2);if(state.unrest>70){state.morale=Math.max(0,state.morale-5);log('В городах растёт недовольство из-за налогового бремени.');}}if(state.tradeCooldown>0)state.tradeCooldown--;log('Доход казны: +'+income+' монет. Урожай: +'+harvest+' пищи; потребление: -'+(populationUse+armyUse)+'.');}function setTax(value){if(!['low','normal','high'].includes(value))return;state.tax=value;state.unrest=Math.max(0,Math.min(100,state.unrest+(value==='high'?4:value==='low'?-3:0)));log('Налоговая политика изменена: '+({low:'низкие налоги',normal:'обычные налоги',high:'высокие налоги'}[value])+'.');renderUI();save();}function trade(){if(state.tradeCooldown>0){log('Караван ещё не вернулся. Подождите один сезон.');return;}if(state.food<12){log('Недостаточно продовольствия для торгового каравана.');return;}state.food-=12;state.treasury+=28;state.tradeCooldown=2;log('Торговый караван продал излишки продовольствия: +28 монет, -12 пищи.');renderUI();save();}function buildGranary(){if(state.granary||state.treasury<65)return;state.treasury-=65;state.granary=true;log('Амбар построен. Урожай каждого сезона увеличен.');renderUI();save();}function advanceSeason(){
 state.turn++;economyTick();advanceSieges();state.weather=(state.weather+1)%weatherTypes.length;state.phase=(state.phase+1)%4;
 state.supply=Math.max(0,state.supply-(state.army?.path?.length?7:2)*weather().supply);
 state.population=Math.max(0,state.population+Math.max(1,Math.round(state.population*.006)));
 state.development.forEach(x=>x.remaining--);
 const finished=state.development.filter(x=>x.remaining<=0);state.development=state.development.filter(x=>x.remaining>0);
 finished.forEach(x=>{state.population+=100;state.morale=Math.min(100,state.morale+4);if(state.cityDamage[x.tile]){delete state.cityDamage[x.tile];log('Восстановление города «'+tileName(tiles[x.tile],x.tile)+'» завершено: стены и кварталы отстроены.');}else{log('Развитие поселения завершено: '+tileName(tiles[x.tile],x.tile)+'. Население выросло.');}});
 if(state.fire){state.fire.turns--;if(state.fire.turns<=0){log('Пожар в поселении потушен.');state.fire=null;}}
 if(!state.fire&&state.turn%7===0){const cities=tiles.map((t,i)=>({t,i})).filter(x=>x.t.classList.contains('city')&&tileOwner(x.t)==='player');if(cities.length){const c=cities[state.turn%cities.length];state.fire={tile:c.i,turns:2};state.supply=Math.max(0,state.supply-8);state.morale=Math.max(0,state.morale-3);log('Пожар в поселении «'+tileName(c.t,c.i)+'»! Пожарные команды работают.');}}
 if(state.supply<25){state.morale=Math.max(0,state.morale-7);if(state.army)state.army.troops=Math.max(0,state.army.troops-1);log('Недостаток снабжения ослабляет войско.');}
 if(state.army&&state.army.troops===0){state.army=null;log('Из-за истощения отряд распался.');}
 if(state.army)state.morale=Math.min(100,state.morale+1);
 log('Наступил новый сезон. Погода: '+weather().name+'.');
 renderUI();save();
}
function developCity(){const i=state.selected,t=tiles[i];if(!t||!t.classList.contains('city')||tileOwner(t)!=='player'||state.development.some(x=>x.tile===i))return;if(state.supply<15){log('Недостаточно запасов для городских работ.');return;}state.supply-=15;state.development.push({tile:i,remaining:3});log((state.cityDamage[i]?'Начато восстановление разрушенного города «':'Начато развитие поселения «')+tileName(t,i)+'». Завершение через 3 сезона.');renderUI();save();}
function train(){state.morale=Math.min(100,state.morale+12);state.supply=Math.max(0,state.supply-3);log('Войско провело учения. Боевой дух повышен, запасы немного уменьшились.');renderUI();save();}
function createArmy(){
 if(state.army){log('Полевой отряд уже находится на карте.');return;}
 const home=tiles.findIndex(t=>tileOwner(t)==='player');if(home<0)return;
 const troops=Math.max(1,Math.min(60,troopCount()));
 state.army={tile:home,troops,path:[],progress:0,target:home};
 log('Сформирован полевой отряд: '+troops+' воинов.');renderUI();save();
}
function animate(time){
 const dt=Math.min(.05,(time-lastFrame)/1000||0);lastFrame=time;updatePoints();
 if(state.army&&state.army.path?.length){
   const a=state.army,next=state.army.path[0],p=points[a.tile],q=points[next];
   if(p&&q){
     const terrain=tileTerrain(tiles[next]),terrainSpeed=terrain==='terrain-mountain'?.42:terrain==='terrain-forest'?.68:terrain==='terrain-river'?.55:1;
     const speed=weather().speed*terrainSpeed*(state.supply<25?.65:1);
     a.progress+=dt*speed*.7;
     if(a.progress>=1){a.tile=next;a.path.shift();a.progress=0;if(!a.path.length){battle(a,a.target);renderUI();save();}}
   }else{a.path=[];}
 }
 draw(time/1000);
 if(!reduced)raf=requestAnimationFrame(animate);
}
function draw(t){
 const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
 const phase=state.phase%4;if(phase===0)ctx.fillStyle='rgba(242,176,105,.055)';else if(phase===2)ctx.fillStyle='rgba(216,125,80,.075)';else if(phase===3)ctx.fillStyle='rgba(7,13,25,.27)';else ctx.fillStyle='rgba(245,222,160,.018)';ctx.fillRect(0,0,w,h);
 state.development.forEach(d=>{const p=points[d.tile];if(p){ctx.strokeStyle='rgba(239,203,115,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,10+Math.sin(t*4)*2,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f1d58b';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText('🏗',p.x,p.y-13);}});
 state.sieges.forEach(siege=>{const p=points[siege.tile];if(!p)return;const sc=Math.min(p.w,p.h)/48;ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='rgba(225,194,125,.85)';ctx.lineWidth=1.6;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(0,0,Math.max(10,p.w*.38),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#46382b';ctx.fillRect(-p.w*.28,p.h*.2,p.w*.56,Math.max(3,3*sc));ctx.strokeStyle='#c5a66b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.w*.2,p.h*.2);ctx.lineTo(-p.w*.2,p.h*.02);ctx.lineTo(-p.w*.08,p.h*.02);ctx.moveTo(p.w*.12,p.h*.2);ctx.lineTo(p.w*.12,p.h*.02);ctx.lineTo(p.w*.25,p.h*.02);ctx.stroke();for(let n=0;n<3;n++){const smoke=Math.sin(t*3+n*2)*3;ctx.fillStyle='rgba(70,70,63,.3)';ctx.beginPath();ctx.arc((n-1)*4*sc,-p.h*.22-Math.abs(smoke),3*sc+n,0,Math.PI*2);ctx.fill();}ctx.restore();});

 if(state.fire&&points[state.fire.tile]){const p=points[state.fire.tile];for(let i=0;i<5;i++){const flicker=Math.sin(t*9+i*2)*3;ctx.fillStyle=i%2?'rgba(255,170,65,.78)':'rgba(226,75,42,.82)';ctx.beginPath();ctx.ellipse(p.x+(i-2)*3,p.y-8-Math.abs(flicker),3,7+Math.abs(flicker),0,0,Math.PI*2);ctx.fill();}}
 // Soft route glow and moving army marker.
 if(state.army&&points[state.army.tile]){
   const a=state.army,p=points[a.tile],next=a.path?.length?points[a.path[0]]:null;
   if(next){ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(242,211,139,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(next.x,next.y);ctx.stroke();ctx.restore();}
   let x=p.x,y=p.y;if(next){x+=(next.x-p.x)*a.progress;y+=(next.y-p.y)*a.progress;}
   const pulse=1+Math.sin(t*5)*.12;
   ctx.save();ctx.shadowColor='#f0c76d';ctx.shadowBlur=14;ctx.fillStyle='#f5d27e';ctx.beginPath();ctx.arc(x,y,7*pulse,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#273020';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('⚔',x,y+3);ctx.restore();
 }
 if(weather().id==='rain'||weather().id==='snow'||weather().id==='fog'){
   const count=weather().id==='fog'?5:34;
   for(let i=0;i<count;i++){const x=(i*73+t*(weather().id==='snow'?9:35))%Math.max(w,1),y=(i*47+t*(weather().id==='snow'?13:95))%Math.max(h,1);
     ctx.strokeStyle=weather().id==='rain'?'rgba(174,205,219,.36)':weather().id==='snow'?'rgba(245,245,225,.7)':'rgba(220,228,210,.10)';
     ctx.lineWidth=weather().id==='rain'?1.2:2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(weather().id==='rain'?-3:0),y+(weather().id==='rain'?9:2));ctx.stroke();}
   if(weather().id==='fog'){const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'rgba(205,218,207,.02)');g.addColorStop(.5,'rgba(205,218,207,.12)');g.addColorStop(1,'rgba(205,218,207,.02)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 }
}
grid.addEventListener('click',e=>{const tile=e.target.closest('.tile');if(tile)selectTile(tile);});
$('simMarch').addEventListener('click',march);
$('simTrain').addEventListener('click',train);$('simDevelop').addEventListener('click',developCity);
$('simTurn').addEventListener('click',advanceSeason);document.querySelectorAll('[data-tax]').forEach(b=>b.addEventListener('click',()=>setTax(b.dataset.tax)));$('simTrade').addEventListener('click',trade);$('simGranary').addEventListener('click',buildGranary);
const simPanel=$('worldSim');
const armyBtn=document.createElement('button');armyBtn.className='btn';armyBtn.id='simRaise';armyBtn.textContent='🏇 Сформировать отряд';$('simTrain').before(armyBtn);armyBtn.addEventListener('click',createArmy);
const observer=new MutationObserver(()=>{syncTiles();renderUI();});observer.observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});let lastCoreTurn=$('turnLabel')?.textContent||'';if($('turnLabel'))new MutationObserver(()=>{const now=$('turnLabel').textContent;if(now!==lastCoreTurn){lastCoreTurn=now;economyTick();renderUI();save();}}).observe($('turnLabel'),{childList:true,subtree:true,characterData:true});
window.addEventListener('resize',updatePoints,{passive:true});
syncTiles();
if(state.army&&(!tiles[state.army.tile]))state.army=null;
renderUI();updatePoints();
if(!reduced)raf=requestAnimationFrame(animate);else draw(0);
window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);save();});
})();
