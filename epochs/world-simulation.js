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
  {id:'clear',name:'Ясно',speed:1,combat:1,supply:1},
  {id:'rain',name:'Дождь',speed:.78,combat:.94,supply:.96},
  {id:'fog',name:'Туман',speed:.86,combat:.82,supply:.9},
  {id:'snow',name:'Снег',speed:.58,combat:.88,supply:.76}
];
function freshDiplomacy(){return {relation:12,atWar:false,tradeTurns:0,nonAggressionTurns:0,allianceTurns:0};}
const FORMATIONS = {
 balanced:{name:'Сбалансированный строй',description:'Равномерное сочетание пехоты, копейщиков, лучников и конницы.',ratios:{infantry:.42,spearmen:.25,archers:.23,cavalry:.10}},
 shieldwall:{name:'Стена щитов',description:'Усиленная линия копейщиков. Хорошо держит позицию, но движется медленнее.',ratios:{infantry:.28,spearmen:.48,archers:.18,cavalry:.06}},
 volley:{name:'Лучный обстрел',description:'Большая доля лучников. Силен до сближения, уязвим в рукопашной.',ratios:{infantry:.28,spearmen:.17,archers:.43,cavalry:.12}},
 cavalry:{name:'Кавалерийский натиск',description:'Быстрая конница усиливает атаку на равнинах, но хуже действует в лесах и горах.',ratios:{infantry:.24,spearmen:.16,archers:.12,cavalry:.48}}
};
const UNIT_TYPES = [
 {key:'infantry',name:'Пехота',role:'Основная линия',attack:1,defense:1},
 {key:'spearmen',name:'Копейщики',role:'Стойкая оборона',attack:1.08,defense:1.28},
 {key:'archers',name:'Лучники',role:'Дальний бой',attack:1.18,defense:.72},
 {key:'cavalry',name:'Кавалерия',role:'Манёвр и фланг',attack:1.42,defense:.88}
];
function makeComposition(total,preset='balanced'){
 const count=Math.max(0,Math.floor(Number(total)||0)),ratios=FORMATIONS[preset]?.ratios||FORMATIONS.balanced.ratios;
 const raw=UNIT_TYPES.map(u=>count*ratios[u.key]),values=raw.map(Math.floor);
 let rest=count-values.reduce((a,b)=>a+b,0);
 raw.map((v,i)=>({i,f:v-values[i]})).sort((a,b)=>b.f-a.f).slice(0,rest).forEach(x=>values[x.i]++);
 return Object.fromEntries(UNIT_TYPES.map((u,i)=>[u.key,values[i]]));
}
function normalizeComposition(units,total,preset='balanced'){
 const count=Math.max(0,Math.floor(Number(total)||0));
 if(!units||typeof units!=='object')return makeComposition(count,preset);
 const raw=UNIT_TYPES.map(u=>Math.max(0,Number(units[u.key])||0)),sum=raw.reduce((a,b)=>a+b,0);
 if(!sum)return makeComposition(count,preset);
 const scaled=raw.map(v=>v/sum*count),values=scaled.map(Math.floor);let rest=count-values.reduce((a,b)=>a+b,0);
 scaled.map((v,i)=>({i,f:v-values[i]})).sort((a,b)=>b.f-a.f).slice(0,rest).forEach(x=>values[x.i]++);
 return Object.fromEntries(UNIT_TYPES.map((u,i)=>[u.key,values[i]]));
}
function compositionTotal(units){return UNIT_TYPES.reduce((sum,u)=>sum+Math.max(0,Number(units?.[u.key])||0),0);}
function terrainDefenseFactor(terrain){return terrain==='terrain-mountain'?1.45:terrain==='terrain-forest'?1.2:terrain==='terrain-river'?1.3:1;}
function attackPower(units,terrain,morale,weatherMod,defenders){
 const total=Math.max(1,compositionTotal(units)),enemyTotal=Math.max(1,compositionTotal(defenders));
 const cavalryShare=units.cavalry/total,archerShare=units.archers/total,spearShare=units.spearmen/total,enemyCavalry=defenders.cavalry/enemyTotal;
 const terrainTactics=terrain==='terrain-plains'?1+cavalryShare*.17:terrain==='terrain-forest'?1+archerShare*.12-cavalryShare*.2:terrain==='terrain-mountain'?1+archerShare*.06-cavalryShare*.25:1+spearShare*.08;
 const counterBonus=units.spearmen*enemyCavalry*.18;
 const base=units.infantry+units.spearmen*1.08+units.archers*1.18+units.cavalry*1.42+counterBonus;
 const supplyFactor=state.supply<25?.72:state.supply<50?.88:1;
 return base*(.55+morale/200)*weatherMod*terrainTactics*supplyFactor;
}
function defensePower(units,terrain){return (units.infantry+units.spearmen*1.28+units.archers*.72+units.cavalry*.88)*terrainDefenseFactor(terrain);}
function garrisonFor(tile,owner,turn){const base=owner==='rival'?18+Math.floor(turn*1.4):7+Math.floor(turn*.45);return {troops:base,units:makeComposition(base,owner==='rival'?'shieldwall':'balanced')};}
function estimateCasualties(ownTroops,enemyTroops,attack,enemyStrength){
 const ratio=attack/Math.max(1,enemyStrength),pressure=ratio>=1.5?.55:ratio>=1?.8:ratio>=.75?1.05:1.3;
 return Math.min(Math.max(0,Math.floor(ownTroops)),Math.max(1,Math.round((ownTroops*.06+enemyTroops*.15)*pressure)));
}
function applyLosses(army,losses){
 if(!army)return 0;const total=Math.max(0,Math.floor(army.troops||0));const actual=Math.min(total,Math.max(0,Math.floor(losses||0)));
 const units=normalizeComposition(army.units,total,state.formation),raw=UNIT_TYPES.map(u=>actual*(units[u.key]/Math.max(1,total))),cuts=raw.map(Math.floor);let rest=actual-cuts.reduce((a,b)=>a+b,0);
 raw.map((v,i)=>({i,f:v-cuts[i]})).sort((a,b)=>b.f-a.f).slice(0,rest).forEach(x=>cuts[x.i]++);
 army.units=Object.fromEntries(UNIT_TYPES.map((u,i)=>[u.key,Math.max(0,units[u.key]-cuts[i])]));army.troops=compositionTotal(army.units);state.armyLosses=Math.max(0,Number(state.armyLosses)||0)+actual;return actual;
}
const terrainNames = { 'terrain-plains':'Равнина','terrain-forest':'Лес','terrain-mountain':'Горы','terrain-river':'Переправа','terrain-water':'Вода' };
function coreTurnNumber(){const n=Number((($('turnLabel')?.textContent||'1').match(/\d+/)||['1'])[0]);return Number.isFinite(n)?Math.max(1,n):1;}
const fresh = () => ({version:1,coreTurnSeen:coreTurnNumber(),turn:1,weather:0,supply:100,morale:82,selected:-1,army:null,armyLosses:0,formation:'balanced',diplomacy:freshDiplomacy(),events:['Оперативная карта готова. Отметьте область и отправьте туда войско.'],captured:[],phase:1,population:1250,development:[],fire:null,treasury:120,food:90,tax:'normal',unrest:12,granary:false,tradeCooldown:0,sieges:[],cityDamage:{}});
function load(){
  try { const x=JSON.parse(localStorage.getItem(KEY)||'null'); if(!x||x.version!==1)return fresh();
    const saved={...fresh(),...x,events:Array.isArray(x.events)?x.events.slice(0,12):[],captured:Array.isArray(x.captured)?x.captured:[],sieges:Array.isArray(x.sieges)?x.sieges:[],cityDamage:x.cityDamage&&typeof x.cityDamage==='object'?x.cityDamage:{}};
    if(!FORMATIONS[saved.formation])saved.formation='balanced';
    saved.armyLosses=Math.max(0,Math.floor(Number(saved.armyLosses)||0));
    saved.coreTurnSeen=Math.max(1,Math.floor(Number(saved.coreTurnSeen)||coreTurnNumber()));
    const diplomacy=freshDiplomacy();saved.diplomacy={...diplomacy,...(saved.diplomacy||{})};
    saved.diplomacy.relation=Math.max(-100,Math.min(100,Number(saved.diplomacy.relation)||0));
    ['tradeTurns','nonAggressionTurns','allianceTurns'].forEach(k=>saved.diplomacy[k]=Math.max(0,Math.floor(Number(saved.diplomacy[k])||0)));
    saved.diplomacy.atWar=!!saved.diplomacy.atWar;
    if(saved.army){saved.army.units=normalizeComposition(saved.army.units,saved.army.troops,saved.formation);saved.army.troops=compositionTotal(saved.army.units);}
    return saved;
  } catch(_){return fresh();}
}
let state=load(), tiles=[], points=[], lastFrame=0, raf=0, particles=[];
const bootCoreTurn=coreTurnNumber();
if(bootCoreTurn<state.coreTurnSeen){state=fresh();state.coreTurnSeen=bootCoreTurn;try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
else{state.coreTurnSeen=bootCoreTurn;state.turn=Math.max(state.turn,bootCoreTurn);}
const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const weather=()=>weatherTypes[state.weather%weatherTypes.length];
function log(message){state.events.unshift(message);state.events=state.events.slice(0,12);save();renderLog();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
function landCount(){const n=Number((($('landLabel')?.textContent||'5').match(/\d+/)||['5'])[0]);return Math.max(1,(Number.isFinite(n)?n:5)+new Set(state.captured||[]).size);}
function troopCount(){const n=Number((($('armyLabel')?.textContent||'28').match(/\d+/)||['28'])[0]);return Math.max(0,(Number.isFinite(n)?n:28)-Math.max(0,Number(state.armyLosses)||0));}
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
 panel.innerHTML='<div class="sim-heading"><div><div class="eyebrow">ЖИВОЙ МИР · ТАКТИЧЕСКАЯ СИМУЛЯЦИЯ</div><h3>Оперативная карта</h3><p>Отправляйте отряды по областям. Рельеф, погода, снабжение и боевой дух влияют на исход похода.</p></div><span class="sim-version">0.6.0</span></div>'+
 '<div class="sim-stats"><div><span>Погода</span><b id="simWeather">Ясно</b></div><div><span>Время суток</span><b id="simPhase">День</b></div><div><span>Население</span><b id="simPopulation">1 250</b></div><div><span>Снабжение</span><b id="simSupply">100%</b></div><div><span>Боевой дух</span><b id="simMorale">82%</b></div><div><span>Отряд</span><b id="simArmy">Нет войска</b></div><div><span>Владения</span><b id="simLands">5 областей</b></div></div>'+
 '<div class="sim-economy"><div class="sim-economy-head"><strong>Казна и хозяйство</strong><span id="simEconomyStatus">Держава стабильна</span></div><div class="sim-economy-stats"><div>Казна <b id="simTreasury">120</b></div><div>Запасы пищи <b id="simFood">90</b></div><div>Налоги <b id="simTax">Обычные</b></div><div>Недовольство <b id="simUnrest">12%</b></div></div><div class="sim-policy"><span>Налоговая политика</span><button class="btn" data-tax="low">Низкие</button><button class="btn active" data-tax="normal">Обычные</button><button class="btn" data-tax="high">Высокие</button></div><div class="sim-actions"><button class="btn" id="simTrade">Торговый караван</button><button class="btn" id="simGranary">Построить амбар</button></div></div>'+'<section class="sim-army-builder"><div class="sim-army-builder-head"><div><strong>Подготовка войска</strong><p>Выберите тактику перед выходом. Состав влияет на бой и скорость марша.</p></div><span id="simFormationTotal">28 бойцов</span></div><div class="sim-formation-options"><button class="btn active" data-formation="balanced">Сбалансированный</button><button class="btn" data-formation="shieldwall">Стена щитов</button><button class="btn" data-formation="volley">Лучный обстрел</button><button class="btn" data-formation="cavalry">Кавалерийский натиск</button></div><p id="simFormationDescription" class="sim-formation-description"></p><div id="simRosterCards" class="sim-roster-cards"></div><div id="simRosterSummary" class="sim-roster-summary">Отряд ещё не сформирован.</div></section>'+
 '<div class="sim-actions"><button class="btn primary" id="simMarch" disabled>Отправить отряд</button><button class="btn" id="simRecall" disabled>Отозвать отряд</button><button class="btn" id="simTrain">Провести учения</button><button class="btn" id="simDevelop" disabled>Развивать город</button><button class="btn" id="simTurn">Сменить сезон</button></div>'+
 '<div class="sim-selection" id="simSelection">Выберите область на карте, чтобы проложить маршрут.</div><div class="sim-battle-preview" id="simBattlePreview"></div>'+
 '<div class="sim-log"><div class="sim-log-title">Хроника похода</div><div id="simLog" aria-live="polite"></div></div>';
 mapPanel.appendChild(panel);
 const canvas=document.createElement('canvas');canvas.className='sim-canvas';canvas.setAttribute('aria-hidden','true');mapWrap.appendChild(canvas);
 return canvas;
}
const canvas=makeUI(),ctx=canvas.getContext('2d');
ensureDiplomacyUI();
function renderEconomy(){const taxNames={low:'Низкие',normal:'Обычные',high:'Высокие'};$('simTreasury').textContent=Math.floor(state.treasury)+' монет';$('simFood').textContent=Math.floor(state.food)+' ед.';$('simTax').textContent=taxNames[state.tax]||taxNames.normal;$('simUnrest').textContent=Math.round(state.unrest)+'%';$('simEconomyStatus').textContent=state.food<20?'Угроза голода':state.unrest>65?'Риск волнений':state.diplomacy.atWar?'Военные расходы':state.treasury<15?'Казна истощена':state.granary?'Амбар действует':'Держава стабильна';document.querySelectorAll('[data-tax]').forEach(b=>b.classList.toggle('active',b.dataset.tax===state.tax));$('simGranary').textContent=state.granary?'Амбар построен':'Построить амбар';$('simGranary').disabled=state.granary||state.treasury<65;
 const caravan=$('simTrade');if(caravan){caravan.disabled=state.tradeCooldown>0||state.food<12;caravan.textContent=state.tradeCooldown>0?'Караван в пути: '+state.tradeCooldown+' сезона':'Торговый караван';}}function renderLog(){const node=$('simLog');if(node)node.innerHTML=state.events.map(x=>'<div class="sim-log-entry">'+escapeHTML(x)+'</div>').join('');}
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
 const w=weather(),army=state.army;const phases=['Рассвет','День','Закат','Ночь'];
 $('simWeather').textContent=w.name;$('simPhase').textContent=phases[state.phase%4];$('simPopulation').textContent=Math.round(state.population).toLocaleString('ru-RU');$('simSupply').textContent=Math.round(state.supply)+'%';$('simMorale').textContent=Math.round(state.morale)+'%';
 $('simArmy').textContent=army?army.troops+' воинов':'Нет войска';$('simLands').textContent=landCount()+' областей';
 const raise=$('simRaise');if(raise){const available=troopCount();raise.disabled=!!army||available<1;raise.textContent=army?'Отряд уже на карте':available<1?'Нет доступных воинов':'Сформировать отряд';}
 const march=$('simMarch');march.disabled=!army||army.recalling||state.selected<0||state.selected===army.tile||army.path?.length>0;
 const recall=$('simRecall');recall.disabled=!army||!!army.path?.length;recall.textContent=army?.recalling?'Отряд возвращается домой…':'Отозвать отряд';
 const sel=state.selected>=0?tiles[state.selected]:null;const develop=$('simDevelop');develop.disabled=!sel||!sel.classList.contains('city')||tileOwner(sel)!=='player'||state.development.some(x=>x.tile===state.selected)||state.supply<15;
 const activeSiege=sel&&state.sieges.find(x=>x.tile===state.selected);$('simSelection').textContent=sel?'Цель: '+tileName(sel,state.selected)+' · '+terrainNames[tileTerrain(sel)]+' · '+(activeSiege?'ОСАДА '+Math.min(3,Math.floor(activeSiege.progress))+'/3':tileOwner(sel)==='rival'?'вражеская территория':tileOwner(sel)==='player'?'ваша территория':'нейтральная область'):'Выберите область на карте, чтобы проложить маршрут.';
 renderLog();renderEconomy();renderArmyPanel();renderBattlePreview(sel);renderDiplomacy();
}
function renderBattlePreview(tile){
 const panel=$('simBattlePreview');if(!panel)return;
 if(!tile||tileOwner(tile)==='player'){panel.classList.remove('visible');panel.innerHTML='';return;}
 const owner=tileOwner(tile),terrain=tileTerrain(tile),garrison=garrisonFor(tile,owner,state.turn),ownTotal=state.army?state.army.troops:Math.max(0,Math.min(60,troopCount()));
 const ownUnits=state.army?normalizeComposition(state.army.units,ownTotal,state.formation):makeComposition(ownTotal,state.formation);
 const ownPower=attackPower(ownUnits,terrain,state.morale,weather().combat,garrison.units),enemyPower=defensePower(garrison.units,terrain),ratio=ownPower/Math.max(1,enemyPower),estimatedLosses=estimateCasualties(ownTotal,garrison.troops,ownPower,enemyPower);
 const forecast=ratio>=1.35?'Преимущество':ratio>=1?'Силы сопоставимы':ratio>=.75?'Высокий риск':'Гарнизон сильнее';
 const tileType=tile.classList.contains('city')&&owner==='rival'?'Здесь начнётся осада: город нельзя взять одним штурмом.':'Маршрут, снабжение и состояние войска влияют на итог похода.';
 panel.innerHTML='<div class="sim-battle-head"><strong>Тактическая оценка</strong><span>'+forecast+'</span></div><div class="sim-battle-values"><div><span>Ваш ударный потенциал</span><b>'+Math.round(ownPower)+'</b></div><div><span>Оборона области</span><b>'+Math.round(enemyPower)+'</b></div><div><span>Гарнизон</span><b>'+garrison.troops+' бойцов</b></div><div><span>Оценка потерь</span><b>≈'+estimatedLosses+'</b></div></div><div class="sim-battle-rosters"><div>Ваш состав: пехота '+ownUnits.infantry+', копейщики '+ownUnits.spearmen+', лучники '+ownUnits.archers+', кавалерия '+ownUnits.cavalry+'.</div><div>Защитники: пехота '+garrison.units.infantry+', копейщики '+garrison.units.spearmen+', лучники '+garrison.units.archers+', кавалерия '+garrison.units.cavalry+'.</div></div><p>'+tileType+'</p>'+(state.army?'':'<p class="sim-battle-note">Это прогноз для выбранной формации. Сначала сформируйте полевой отряд.</p>');
 panel.classList.add('visible');
}
function ensureDiplomacyUI(){
 const host=document.querySelector('.left-col');if(!host||$('diplomacyPanel'))return;
 const panel=document.createElement('section');panel.className='panel diplomacy-panel';panel.id='diplomacyPanel';
 panel.innerHTML='<div class="panel-head"><h2>Дипломатия</h2><span class="pill" id="dipStatus">МИР</span></div><div class="panel-body"><div class="dip-country">Королевство Вейр</div><div class="dip-relation-head"><span>Отношения</span><b id="dipRelation">+12 / 100</b></div><div class="dip-meter"><span id="dipRelationBar"></span></div><p class="dip-summary" id="dipSummary"></p><div class="dip-treaties" id="dipTreaties"></div><div class="dip-actions"><button class="btn" id="dipGift">Отправить подарок · 25 монет</button><button class="btn" id="dipTrade">Заключить торговый договор · 40 монет</button><button class="btn" id="dipPact">Пакт о ненападении · 30 монет</button><button class="btn" id="dipAlliance">Предложить союз · 60 монет</button><button class="btn danger" id="dipWar">Объявить войну</button><button class="btn" id="dipPeace">Предложить мир · 20 монет</button></div></div>';
 host.appendChild(panel);
 $('dipGift').addEventListener('click',sendDiplomaticGift);$('dipTrade').addEventListener('click',signTradeTreaty);$('dipPact').addEventListener('click',signNonAggression);$('dipAlliance').addEventListener('click',signAlliance);$('dipWar').addEventListener('click',declareWar);$('dipPeace').addEventListener('click',offerPeace);
}
function renderDiplomacy(){
 const d=state.diplomacy;if(!$('dipRelation'))return;
 const relation=Math.round(d.relation),status=d.atWar?'ВОЙНА':d.allianceTurns>0?'СОЮЗ':d.nonAggressionTurns>0?'ПАКТ':d.tradeTurns>0?'ТОРГОВЛЯ':'МИР';
 $('dipStatus').textContent=status;$('dipRelation').textContent=(relation>0?'+':'')+relation+' / 100';$('dipRelationBar').style.width=((relation+100)/2)+'%';
 $('dipSummary').textContent=d.atWar?'Державы находятся в состоянии войны. Боевые действия продолжаются, отношения ухудшаются каждый сезон.':d.allianceTurns>0?'Союз действует ещё '+d.allianceTurns+' сезона. Доход казны и снабжение получают поддержку.':d.nonAggressionTurns>0?'Пакт действует ещё '+d.nonAggressionTurns+' сезона. Нападение на Вейр запрещено.':d.tradeTurns>0?'Торговый договор действует ещё '+d.tradeTurns+' сезона. Караваны приносят дополнительный доход.':'Дипломатические отношения определяют доступные договоры. Улучшайте доверие подарками и торговлей.';
 const terms=[];if(d.tradeTurns>0)terms.push('Торговля: '+d.tradeTurns+' сезона');if(d.nonAggressionTurns>0)terms.push('Ненападение: '+d.nonAggressionTurns+' сезона');if(d.allianceTurns>0)terms.push('Союз: '+d.allianceTurns+' сезона');$('dipTreaties').textContent=terms.length?terms.join(' · '):'Активных договоров нет';
 $('dipGift').disabled=d.atWar||state.treasury<25||d.relation>=95;
 $('dipTrade').disabled=d.atWar||d.tradeTurns>0||d.relation<10||state.treasury<40;
 $('dipPact').disabled=d.atWar||d.nonAggressionTurns>0||d.allianceTurns>0||d.relation<35||state.treasury<30;
 $('dipAlliance').disabled=d.atWar||d.allianceTurns>0||d.nonAggressionTurns>0||d.relation<65||state.treasury<60;
 $('dipWar').disabled=d.atWar||d.nonAggressionTurns>0||d.allianceTurns>0;
 $('dipPeace').disabled=!d.atWar||state.treasury<20;
}
function sendDiplomaticGift(){const d=state.diplomacy;if(d.atWar||d.relation>=95||state.treasury<25)return;state.treasury-=25;d.relation=Math.min(100,d.relation+12);log('Послы доставили подарок двору Вейра. Отношения улучшились на 12 пунктов.');renderUI();save();}
function signTradeTreaty(){const d=state.diplomacy;if(d.atWar||d.tradeTurns>0||d.relation<10||state.treasury<40)return;state.treasury-=40;d.tradeTurns=4;d.relation=Math.min(100,d.relation+8);log('С Вейром заключён торговый договор на четыре сезона. Караваны увеличат доход и запасы пищи.');renderUI();save();}
function signNonAggression(){const d=state.diplomacy;if(d.atWar||d.nonAggressionTurns>0||d.allianceTurns>0||d.relation<35||state.treasury<30)return;state.treasury-=30;d.nonAggressionTurns=4;d.relation=Math.min(100,d.relation+6);log('Подписан пакт о ненападении с Вейром сроком на четыре сезона.');renderUI();save();}
function signAlliance(){const d=state.diplomacy;if(d.atWar||d.allianceTurns>0||d.nonAggressionTurns>0||d.relation<65||state.treasury<60)return;state.treasury-=60;d.allianceTurns=5;d.relation=Math.min(100,d.relation+10);log('Вейр принял предложение о союзе на пять сезонов. Союз поддержит торговлю и снабжение.');renderUI();save();}
function declareWar(){const d=state.diplomacy;if(d.atWar||d.nonAggressionTurns>0||d.allianceTurns>0)return;d.atWar=true;d.tradeTurns=0;d.relation=Math.max(-100,d.relation-45);state.unrest=Math.min(100,state.unrest+8);state.morale=Math.min(100,state.morale+5);log('Объявлена война Королевству Вейр. Теперь можно наступать на его территории. Война увеличивает недовольство.');renderUI();save();}
function offerPeace(){const d=state.diplomacy;if(!d.atWar||state.treasury<20)return;state.treasury-=20;d.atWar=false;d.relation=Math.min(100,d.relation+35);d.tradeTurns=0;d.nonAggressionTurns=2;state.sieges=[];syncTiles();log('С Вейром заключён мир и двухсезонное перемирие. Осадные действия прекращены.');renderUI();save();}
function renderArmyPanel(){
 const available=troopCount(),deployed=state.army?state.army.troops:0,reserve=Math.max(0,available-deployed);
 const total=state.army?state.army.troops:Math.max(0,Math.min(60,available));
 const units=state.army?normalizeComposition(state.army.units,total,state.formation):makeComposition(total,state.formation);
 const description=state.army?.recalling?'Отряд возвращается к столице. После прибытия можно будет выбрать новую тактику.':state.army?'Состав действующего полевого отряда. Тактику можно изменить после его возвращения.':FORMATIONS[state.formation].description;
 const desc=$('simFormationDescription'),count=$('simFormationTotal'),cards=$('simRosterCards'),summary=$('simRosterSummary');
 if(desc)desc.textContent=description;if(count)count.textContent=total+' бойцов';
 document.querySelectorAll('[data-formation]').forEach(b=>{b.classList.toggle('active',b.dataset.formation===state.formation);b.disabled=!!state.army;});
 if(cards)cards.innerHTML=UNIT_TYPES.map(u=>'<div class="sim-roster-card"><strong>'+u.name+'</strong><b>'+units[u.key]+'</b><span>'+u.role+'</span></div>').join('');
 if(summary){const speedBonus=Math.round((units.cavalry/Math.max(1,total))*.18*100);summary.textContent=state.army?'В поле: '+deployed+' бойцов. Резерв: '+reserve+'. Постоянные потери: '+state.armyLosses+'. Кавалерия даёт до '+speedBonus+'% дополнительной скорости марша.':'Доступно для формирования: '+available+' воинов. Постоянные потери: '+state.armyLosses+'. Кавалерия ускоряет передвижение, лучники усиливают атаку на равнинах, копейщики повышают стойкость.';}
}
function neighbors(i){const row=Math.floor(i/9),col=i%9,out=[];if(col>0)out.push(i-1);if(col<8)out.push(i+1);if(row>0)out.push(i-9);if(row<6)out.push(i+9);return out.filter(n=>n<tiles.length);}
function route(from,to,allowEnemy=false){
 const q=[from],prev=new Map([[from,-1]]);
 while(q.length){const n=q.shift();if(n===to)break;for(const v of neighbors(n)){if(prev.has(v)||tileTerrain(tiles[v])==='terrain-water'||(!allowEnemy&&!state.diplomacy.atWar&&tileOwner(tiles[v])==='rival'))continue;prev.set(v,n);q.push(v);}}
 if(!prev.has(to))return null;const path=[];for(let n=to;n!==from;n=prev.get(n))path.push(n);return path.reverse();
}
function selectTile(tile){
 const i=tiles.indexOf(tile);if(i<0)return;state.selected=i;tiles.forEach(t=>t.classList.toggle('sim-target',t===tile));renderUI();save();
}
function march(){
 if(!state.army||state.army.recalling||state.selected<0||state.army.path?.length)return;
 if(tileOwner(tiles[state.selected])==='rival'&&!state.diplomacy.atWar){log('Нельзя наступать на земли Вейра без объявления войны. Откройте дипломатические отношения.');renderUI();return;}
 const path=route(state.army.tile,state.selected);
 if(!path){log('Маршрут перекрыт водой или недоступным участком.');return;}
 if(!path.length)return;
 state.army.path=path;state.army.progress=0;state.army.target=state.selected;
 log('Отряд выступил к области «'+tileName(tiles[state.selected],state.selected)+'».');
 renderUI();save();
}
function battle(army,target){
 const tile=tiles[target],owner=tileOwner(tile);
 if(owner==='rival'&&!state.diplomacy.atWar){log('Битва невозможна: сначала объявите войну Вейру.');return;}
 if(owner==='rival'&&tile.classList.contains('city')){
   if(!state.sieges.some(x=>x.tile===target)){
     state.sieges.push({tile:target,progress:0,started:state.turn});syncTiles();
     state.cityDamage[target]=Math.max(0,Number(state.cityDamage[target]||0));
     log('Город «'+tileName(tile,target)+'» окружён. Началась осада: перекрыты дороги и подвоз припасов.');
   }
   state.morale=Math.max(0,state.morale-3);return;
 }
 const terrain=tileTerrain(tile),weatherMod=weather().combat,units=normalizeComposition(army.units,army.troops,state.formation),garrison=garrisonFor(tile,owner,state.turn);
 const attack=attackPower(units,terrain,state.morale,weatherMod,garrison.units),enemyStrength=defensePower(garrison.units,terrain);
 if(owner==='player'){
   army.lastSafeTile=null;
   if(army.recalling){const returned=army.troops;state.army=null;log('Отряд вернулся в столицу. В строю осталось '+returned+' бойцов; теперь можно выбрать новую тактику.');}
   else log('Отряд прибыл в дружественную область.');
   return;
 }
 const losses=estimateCasualties(army.troops,garrison.troops,attack,enemyStrength);
 applyLosses(army,losses);state.morale=Math.max(0,state.morale-(owner==='rival'?13:5));
 if(attack>enemyStrength&&army.troops>0){
   state.captured=[...new Set([...state.captured,target])];tile.classList.remove('owner-rival','owner-neutral');tile.classList.add('owner-player');
   army.lastSafeTile=null;log('Победа! «'+tileName(tile,target)+'» перешла под ваш контроль. Потери: '+losses+'.');
   state.morale=Math.min(100,state.morale+8);state.supply=Math.max(20,state.supply-12);
 }else{
   log('Отряд потерпел поражение у «'+tileName(tile,target)+'». Потери: '+losses+'.');
   if(army.troops<=0){state.army=null;log('Войско рассеяно. Для нового похода нужны оставшиеся в основном войске солдаты.');}
   else{army.tile=Number.isInteger(army.lastSafeTile)?army.lastSafeTile:army.tile;army.lastSafeTile=null;army.path=[];army.target=army.tile;state.supply=Math.max(0,state.supply-18);}
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
   applyLosses(army,losses);state.supply=Math.max(0,state.supply-8);state.morale=Math.max(0,state.morale-2);
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
function economyTick(){const lands=landCount();const taxRate=state.tax==='low'?1:state.tax==='high'?3:2;const income=lands*taxRate;state.treasury+=income;const harvest=lands*(state.granary?5:3);state.food+=harvest;const populationUse=Math.max(1,Math.ceil(state.population/450));const armyUse=state.army?Math.max(1,Math.ceil(state.army.troops/12)+Math.ceil((state.army.units?.cavalry||0)/18)):0;state.food=Math.max(0,state.food-populationUse-armyUse);const warUpkeep=state.diplomacy.atWar?Math.max(1,Math.ceil(lands*.6)):0;state.treasury=Math.max(0,state.treasury-armyUse-warUpkeep);if(warUpkeep)log('Военные расходы: -'+warUpkeep+' монет.');if(state.food===0){state.unrest=Math.min(100,state.unrest+12);state.morale=Math.max(0,state.morale-8);state.population=Math.max(100,state.population-25);log('Голод: запасы пищи исчерпаны. Население и боевой дух падают.');}else{state.unrest=Math.max(0,state.unrest+(state.tax==='high'?8:state.tax==='low'?-5:0)-2);if(state.unrest>70){state.morale=Math.max(0,state.morale-5);log('В городах растёт недовольство из-за налогового бремени.');}}if(state.tradeCooldown>0)state.tradeCooldown--;log('Доход казны: +'+income+' монет. Урожай: +'+harvest+' пищи; потребление: -'+(populationUse+armyUse)+'.');
 const dip=state.diplomacy;
 if(dip.tradeTurns>0){state.treasury+=6;state.food+=3;dip.tradeTurns--;log('Торговый договор с Вейром: +6 монет и +3 пищи.');if(!dip.tradeTurns)log('Срок торгового договора завершился.');}
 if(dip.allianceTurns>0){state.treasury+=2;state.supply=Math.min(100,state.supply+3);dip.allianceTurns--;if(!dip.allianceTurns)log('Срок союза с Вейром завершился.');}
 if(dip.nonAggressionTurns>0){dip.nonAggressionTurns--;if(!dip.nonAggressionTurns)log('Пакт о ненападении с Вейром завершился.');}
 if(dip.atWar){dip.relation=Math.max(-100,dip.relation-2);state.unrest=Math.min(100,state.unrest+2);}
 if(state.unrest>=95){const treasuryLoss=Math.min(30,state.treasury);state.treasury-=treasuryLoss;state.food=Math.max(0,state.food-4);state.supply=Math.max(0,state.supply-7);state.morale=Math.max(0,state.morale-9);state.unrest=65;log('В столице вспыхнули волнения. Казна потеряла '+treasuryLoss+' монет, запасы и боевой дух ослабли. Снизьте налоги и восстановите снабжение.');}
 renderDiplomacy();}function setTax(value){if(!['low','normal','high'].includes(value))return;state.tax=value;state.unrest=Math.max(0,Math.min(100,state.unrest+(value==='high'?4:value==='low'?-3:0)));log('Налоговая политика изменена: '+({low:'низкие налоги',normal:'обычные налоги',high:'высокие налоги'}[value])+'.');renderUI();save();}function trade(){if(state.tradeCooldown>0){log('Караван ещё не вернулся. Подождите один сезон.');return;}if(state.food<12){log('Недостаточно продовольствия для торгового каравана.');return;}state.food-=12;state.treasury+=28;state.tradeCooldown=2;log('Торговый караван продал излишки продовольствия: +28 монет, -12 пищи.');renderUI();save();}function buildGranary(){if(state.granary||state.treasury<65)return;state.treasury-=65;state.granary=true;log('Амбар построен. Урожай каждого сезона увеличен.');renderUI();save();}function advanceSeason(){
 state.turn++;economyTick();advanceSieges();state.weather=(state.weather+1)%weatherTypes.length;state.phase=(state.phase+1)%4;
 state.supply=Math.max(0,state.supply-(state.army?.path?.length?7:2)*weather().supply);
 state.population=Math.max(0,state.population+Math.max(1,Math.round(state.population*.006)));
 state.development.forEach(x=>x.remaining--);
 const finished=state.development.filter(x=>x.remaining<=0);state.development=state.development.filter(x=>x.remaining>0);
 finished.forEach(x=>{state.population+=100;state.morale=Math.min(100,state.morale+4);if(state.cityDamage[x.tile]){delete state.cityDamage[x.tile];log('Восстановление города «'+tileName(tiles[x.tile],x.tile)+'» завершено: стены и кварталы отстроены.');}else{log('Развитие поселения завершено: '+tileName(tiles[x.tile],x.tile)+'. Население выросло.');}});syncTiles();
 if(state.fire){state.fire.turns--;if(state.fire.turns<=0){log('Пожар в поселении потушен.');state.fire=null;}}
 if(!state.fire&&state.turn%7===0){const cities=tiles.map((t,i)=>({t,i})).filter(x=>x.t.classList.contains('city')&&tileOwner(x.t)==='player');if(cities.length){const c=cities[state.turn%cities.length];state.fire={tile:c.i,turns:2};state.supply=Math.max(0,state.supply-8);state.morale=Math.max(0,state.morale-3);log('Пожар в поселении «'+tileName(c.t,c.i)+'»! Пожарные команды работают.');}}
 if(state.supply<25){state.morale=Math.max(0,state.morale-7);if(state.army)applyLosses(state.army,1);log('Недостаток снабжения ослабляет войско.');}
 if(state.army&&state.army.troops===0){state.army=null;log('Из-за истощения отряд распался.');}
 if(state.army)state.morale=Math.min(100,state.morale+1);
 log('Наступил новый сезон. Погода: '+weather().name+'.');
 renderUI();save();
}
function developCity(){const i=state.selected,t=tiles[i];if(!t||!t.classList.contains('city')||tileOwner(t)!=='player'||state.development.some(x=>x.tile===i))return;if(state.supply<15){log('Недостаточно запасов для городских работ.');return;}state.supply-=15;state.development.push({tile:i,remaining:3});log((state.cityDamage[i]?'Начато восстановление разрушенного города «':'Начато развитие поселения «')+tileName(t,i)+'». Завершение через 3 сезона.');renderUI();save();}
function chooseFormation(value){if(state.army||!FORMATIONS[value])return;state.formation=value;log('Тактика подготовки изменена: '+FORMATIONS[value].name+'.');renderUI();save();}
function recallArmy(){
 const army=state.army;if(!army||army.path?.length)return;
 const home=Number.isInteger(army.homeTile)&&tileOwner(tiles[army.homeTile])==='player'?army.homeTile:tiles.findIndex(t=>tileOwner(t)==='player');
 if(home<0){log('Невозможно отозвать войско: столица и дружественные земли потеряны.');return;}
 if(home===army.tile){const returned=army.troops;state.army=null;state.sieges=state.sieges.filter(x=>x.tile!==home);syncTiles();log('Полевой отряд распущен у столицы. В строю осталось '+returned+' бойцов.');renderUI();save();return;}
 const path=route(army.tile,home,true);if(!path){log('Маршрут домой перекрыт водой. Выберите ближайшую дружественную область.');return;}
 state.sieges=state.sieges.filter(x=>x.tile!==army.tile);syncTiles();army.path=path;army.progress=0;army.target=home;army.recalling=true;
 log('Отряд отступает к столице. После возвращения его можно будет сформировать заново.');renderUI();save();
}
function train(){state.morale=Math.min(100,state.morale+12);state.supply=Math.max(0,state.supply-3);log('Войско провело учения. Боевой дух повышен, запасы немного уменьшились.');renderUI();save();}
function createArmy(){
 if(state.army){log('Полевой отряд уже находится на карте.');return;}
 const home=tiles.findIndex(t=>tileOwner(t)==='player');if(home<0)return;
 const available=troopCount();if(available<1){log('Нельзя сформировать отряд: сначала наймите воинов.');renderUI();return;}
 const troops=Math.min(60,available),units=makeComposition(troops,state.formation);
 state.army={tile:home,homeTile:home,troops,units,path:[],progress:0,target:home,lastSafeTile:null,recalling:false};
 log('Сформирован отряд «'+FORMATIONS[state.formation].name+'»: '+troops+' бойцов. Пехота '+units.infantry+', копейщики '+units.spearmen+', лучники '+units.archers+', кавалерия '+units.cavalry+'.');renderUI();save();
}
function animate(time){
 const dt=Math.min(.05,(time-lastFrame)/1000||0);lastFrame=time;updatePoints();
 if(state.army&&state.army.path?.length){
   const a=state.army,next=state.army.path[0],p=points[a.tile],q=points[next];
   if(p&&q){
     const terrain=tileTerrain(tiles[next]),terrainSpeed=terrain==='terrain-mountain'?.42:terrain==='terrain-forest'?.68:terrain==='terrain-river'?.55:1;
     const cavalryRatio=(a.units?.cavalry||0)/Math.max(1,a.troops),cavalryBonus=1+cavalryRatio*.18;
     const speed=weather().speed*terrainSpeed*(state.supply<25?.65:1)*cavalryBonus;
     a.progress+=dt*speed*.7;
     if(a.progress>=1){const previous=a.tile;a.tile=next;a.lastSafeTile=previous;a.path.shift();a.progress=0;if(!a.path.length){battle(a,a.target);renderUI();save();}}
   }else{a.path=[];}
 }
 draw(time/1000);
 if(!reduced)raf=requestAnimationFrame(animate);
}
function draw(t){
 const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
 const phase=state.phase%4;if(phase===0)ctx.fillStyle='rgba(242,176,105,.055)';else if(phase===2)ctx.fillStyle='rgba(216,125,80,.075)';else if(phase===3)ctx.fillStyle='rgba(7,13,25,.27)';else ctx.fillStyle='rgba(245,222,160,.018)';ctx.fillRect(0,0,w,h);
 state.development.forEach(d=>{const p=points[d.tile];if(p){ctx.strokeStyle='rgba(239,203,115,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,10+Math.sin(t*4)*2,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f1d58b';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillRect(p.x-2,p.y-16,4,7);}});
 state.sieges.forEach(siege=>{const p=points[siege.tile];if(!p)return;const sc=Math.min(p.w,p.h)/48;ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='rgba(225,194,125,.85)';ctx.lineWidth=1.6;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(0,0,Math.max(10,p.w*.38),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#46382b';ctx.fillRect(-p.w*.28,p.h*.2,p.w*.56,Math.max(3,3*sc));ctx.strokeStyle='#c5a66b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.w*.2,p.h*.2);ctx.lineTo(-p.w*.2,p.h*.02);ctx.lineTo(-p.w*.08,p.h*.02);ctx.moveTo(p.w*.12,p.h*.2);ctx.lineTo(p.w*.12,p.h*.02);ctx.lineTo(p.w*.25,p.h*.02);ctx.stroke();for(let n=0;n<3;n++){const smoke=Math.sin(t*3+n*2)*3;ctx.fillStyle='rgba(70,70,63,.3)';ctx.beginPath();ctx.arc((n-1)*4*sc,-p.h*.22-Math.abs(smoke),3*sc+n,0,Math.PI*2);ctx.fill();}ctx.restore();});

 if(state.fire&&points[state.fire.tile]){const p=points[state.fire.tile];for(let i=0;i<5;i++){const flicker=Math.sin(t*9+i*2)*3;ctx.fillStyle=i%2?'rgba(255,170,65,.78)':'rgba(226,75,42,.82)';ctx.beginPath();ctx.ellipse(p.x+(i-2)*3,p.y-8-Math.abs(flicker),3,7+Math.abs(flicker),0,0,Math.PI*2);ctx.fill();}}
 // Soft route glow and moving army marker.
 if(state.army&&points[state.army.tile]){
   const a=state.army,p=points[a.tile],next=a.path?.length?points[a.path[0]]:null;
   if(next){ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(242,211,139,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(next.x,next.y);ctx.stroke();ctx.restore();}
   let x=p.x,y=p.y;if(next){x+=(next.x-p.x)*a.progress;y+=(next.y-p.y)*a.progress;}
   const pulse=1+Math.sin(t*5)*.12;
   ctx.save();ctx.shadowColor='#f0c76d';ctx.shadowBlur=14;ctx.fillStyle='#f5d27e';ctx.beginPath();ctx.arc(x,y,7*pulse,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#273020';ctx.fillRect(x-1,y-4,2,8);ctx.fillRect(x-4,y-1,8,2);ctx.restore();
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
$('simTurn').addEventListener('click',()=>{const end=$('endBtn');if(end)end.click();else advanceSeason();});document.querySelectorAll('[data-tax]').forEach(b=>b.addEventListener('click',()=>setTax(b.dataset.tax)));$('simTrade').addEventListener('click',trade);$('simGranary').addEventListener('click',buildGranary);
const simPanel=$('worldSim');
const coreArmyLabel=$('armyLabel');if(coreArmyLabel)new MutationObserver(()=>renderUI()).observe(coreArmyLabel,{childList:true,subtree:true,characterData:true});
const armyBtn=document.createElement('button');armyBtn.className='btn';armyBtn.id='simRaise';armyBtn.textContent='Сформировать отряд';$('simTrain').before(armyBtn);armyBtn.addEventListener('click',createArmy);$('simRecall').addEventListener('click',recallArmy);
document.querySelectorAll('[data-formation]').forEach(b=>b.addEventListener('click',()=>chooseFormation(b.dataset.formation)));
const observer=new MutationObserver(()=>{syncTiles();renderUI();});observer.observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});let lastCoreTurn=$('turnLabel')?.textContent||'';if($('turnLabel'))new MutationObserver(()=>{const now=$('turnLabel').textContent;if(now!==lastCoreTurn){lastCoreTurn=now;const current=coreTurnNumber();if(current<state.coreTurnSeen){state=fresh();state.coreTurnSeen=current;syncTiles();renderUI();save();log('Новая кампания началась. Дипломатия, договоры и полевые армии сброшены.');}else{state.coreTurnSeen=current;advanceSeason();}}}).observe($('turnLabel'),{childList:true,subtree:true,characterData:true});
window.addEventListener('resize',updatePoints,{passive:true});
syncTiles();
if(state.army&&(!tiles[state.army.tile]))state.army=null;
renderUI();updatePoints();
if(!reduced)raf=requestAnimationFrame(animate);else draw(0);
window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);save();});
})();
