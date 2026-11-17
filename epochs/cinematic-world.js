/* EPOHI 0.7.1 — atmospheric cinematic layer */
(() => {
  'use strict';
  const wrap = document.querySelector('.map-wrap');
  const grid = document.getElementById('mapGrid');
  if (!wrap || !grid || window.__epohiCinema) return;
  window.__epohiCinema = true;

  const canvas = document.createElement('canvas');
  canvas.className = 'cinema-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  const maxDpr = mobile ? 1.25 : 1.6;
  const palette = {
    dawn: { glow: 'rgba(255,183,111,.10)', mist: 'rgba(216,196,151,.10)', light: 'rgba(255,214,151,.55)' },
    day: { glow: 'rgba(237,221,164,.035)', mist: 'rgba(199,219,202,.055)', light: 'rgba(247,226,171,.45)' },
    dusk: { glow: 'rgba(255,133,79,.10)', mist: 'rgba(206,143,117,.085)', light: 'rgba(255,174,109,.62)' },
    night: { glow: 'rgba(30,65,105,.20)', mist: 'rgba(127,157,185,.075)', light: 'rgba(166,202,231,.50)' }
  };
  let w = 1, h = 1, dpr = 1, last = 0, raf = 0, elapsed = 0;
  let phase = 'day', weather = 'clear', pointer = { x: .5, y: .5 };
  let cityPoints = [], particles = [], rings = [], bursts = [], birds = [];
  let logText = '';

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const choosePhase = () => {
    const t = (document.getElementById('simPhase')?.textContent || '').toLowerCase();
    if (t.includes('рассвет')) phase = 'dawn';
    else if (t.includes('закат')) phase = 'dusk';
    else if (t.includes('ночь')) phase = 'night';
    else phase = 'day';
  };
  const chooseWeather = () => {
    const t = (document.getElementById('simWeather')?.textContent || '').toLowerCase();
    weather = t.includes('снег') ? 'snow' : t.includes('дожд') ? 'rain' : t.includes('туман') ? 'fog' : 'clear';
  };
  function resize() {
    const r = wrap.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    syncCities();
  }
  function syncCities() {
    const wr = wrap.getBoundingClientRect();
    cityPoints = Array.from(grid.querySelectorAll('.tile.city')).map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2, width: r.width };
    });
  }
  function seed() {
    const count = mobile ? 25 : 54;
    particles = Array.from({ length: count }, () => ({
      x: rand(0, w), y: rand(0, h), z: rand(.25, 1), size: rand(.5, 2.2),
      speed: rand(4, 18), drift: rand(-8, 8), phase: rand(0, Math.PI * 2), alpha: rand(.12, .65)
    }));
    birds = Array.from({ length: mobile ? 2 : 4 }, (_, i) => ({
      x: rand(-w * .5, w), y: rand(h * .12, h * .66), speed: rand(12, 27),
      scale: rand(.55, 1.1), phase: i * 2.1, wing: rand(0, 6.28)
    }));
  }
  function addRing(x, y, color, power) {
    rings.push({ x, y, radius: 3, life: 1, color: color || 'rgba(244,211,133,.9)', power: power || 1 });
    if (rings.length > 12) rings.shift();
  }
  function burstAtSelection(color) {
    const selected = grid.querySelector('.tile.selected, .tile.sim-target');
    if (!selected) return;
    const a = selected.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    const x = a.left - b.left + a.width / 2, y = a.top - b.top + a.height / 2;
    addRing(x, y, color, 1.8);
    for (let i = 0; i < 24; i++) {
      const angle = Math.PI * 2 * i / 24;
      bursts.push({ x, y, vx: Math.cos(angle) * rand(16, 55), vy: Math.sin(angle) * rand(16, 55), life: 1, color });
    }
  }
  function checkLog() {
    const node = document.getElementById('simLog');
    if (!node) return;
    const next = node.firstElementChild?.textContent || '';
    if (!next || next === logText) return;
    logText = next;
    if (/Победа|перешла под ваш контроль/i.test(next)) burstAtSelection('rgba(243,211,137,.95)');
    else if (/поражение|рассеяно/i.test(next)) burstAtSelection('rgba(219,103,84,.92)');
    else if (/Пожар|огонь/i.test(next)) burstAtSelection('rgba(255,139,64,.92)');
    else if (/Голод|недовольство/i.test(next)) burstAtSelection('rgba(191,174,125,.75)');
  }
  function drawSky(t) {
    const p = palette[phase];
    const x = w * (.2 + pointer.x * .12);
    const g = ctx.createRadialGradient(x, h * .08, 0, x, h * .08, Math.max(w, h) * .76);
    g.addColorStop(0, p.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (phase === 'dawn' || phase === 'dusk') {
      const sx = phase === 'dawn' ? w * .18 : w * .82;
      const sy = h * .08;
      const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * .8);
      sun.addColorStop(0, p.light); sun.addColorStop(.16, 'rgba(255,190,130,.12)'); sun.addColorStop(1, 'rgba(255,190,130,0)');
      ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.globalAlpha = .08;
      for (let i = 0; i < 5; i++) {
        const spread = (i - 2) * .13;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + w * spread - h, h); ctx.lineTo(sx + w * spread + h, h); ctx.closePath();
        ctx.fillStyle = '#f6d59b'; ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawClouds(dt, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const cloudCount = weather === 'fog' ? 6 : 4;
    for (let i = 0; i < cloudCount; i++) {
      const x = ((i * w / cloudCount + t * (weather === 'fog' ? 5 : 2.2)) % (w + 280)) - 140;
      const y = h * (.12 + (i % 3) * .28) + Math.sin(t * .12 + i * 4) * 10;
      const radius = w * (weather === 'fog' ? .32 : .18);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, weather === 'fog' ? 'rgba(200,220,211,.075)' : 'rgba(220,234,222,.035)');
      grad.addColorStop(1, 'rgba(200,220,211,0)');
      ctx.fillStyle = grad; ctx.fillRect(x - radius, y - radius * .4, radius * 2, radius * .8);
    }
    ctx.restore();
    if (weather === 'fog') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, 'rgba(195,213,206,.015)'); grad.addColorStop(.48, 'rgba(195,213,206,.12)'); grad.addColorStop(1, 'rgba(195,213,206,.025)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    }
  }
  function drawWeather(dt, t) {
    if (weather !== 'rain' && weather !== 'snow') return;
    const count = mobile ? 30 : 75;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const x = (i * 97 + t * (weather === 'rain' ? 40 : 8)) % (w + 40) - 20;
      const y = (i * 61 + t * (weather === 'rain' ? 115 : 25)) % (h + 30) - 15;
      const sway = Math.sin(t * .8 + i) * 4;
      ctx.globalAlpha = weather === 'rain' ? .22 : .56;
      ctx.strokeStyle = weather === 'rain' ? '#c5dce7' : '#f5f0d9';
      ctx.lineWidth = weather === 'rain' ? 1 : 1.5;
      ctx.beginPath();
      if (weather === 'rain') { ctx.moveTo(x, y); ctx.lineTo(x - 3 + sway, y + 10); }
      else { ctx.arc(x + sway, y, 1.2 + (i % 3) * .45, 0, Math.PI * 2); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawCities(t) {
    const p = palette[phase];
    cityPoints.forEach((c, i) => {
      const pulse = .55 + Math.sin(t * 1.8 + i * 2.2) * .18;
      const radius = Math.max(5, c.width * .23);
      ctx.save(); ctx.globalAlpha = phase === 'night' ? .8 : .32;
      const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
      glow.addColorStop(0, phase === 'night' ? 'rgba(255,205,120,.38)' : 'rgba(255,224,157,.16)');
      glow.addColorStop(1, 'rgba(255,205,120,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(c.x, c.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = pulse * (phase === 'night' ? .9 : .35);
      ctx.fillStyle = p.light;
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + i;
        ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * c.width * .13, c.y + Math.sin(a) * c.width * .13, 1.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  }
  function drawMotes(dt, t) {
    const p = palette[phase];
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    particles.forEach(m => {
      m.x += (m.drift + Math.sin(t * .4 + m.phase) * 2) * dt;
      m.y -= m.speed * dt * (weather === 'snow' ? .12 : .25);
      if (m.x < -5) m.x = w + 5; if (m.x > w + 5) m.x = -5;
      if (m.y < -5) m.y = h + 5;
      const a = m.alpha * (.55 + Math.sin(t * 1.7 + m.phase) * .35);
      ctx.globalAlpha = a * (weather === 'fog' ? .18 : 1);
      ctx.fillStyle = phase === 'night' ? '#a9c9db' : '#e9d29a';
      ctx.shadowBlur = 8; ctx.shadowColor = p.light;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.size * m.z, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  function drawBirds(dt, t) {
    ctx.save(); ctx.strokeStyle = phase === 'night' ? 'rgba(178,202,212,.18)' : 'rgba(12,27,25,.28)'; ctx.lineWidth = 1.35;
    birds.forEach((b, i) => {
      b.x += b.speed * dt;
      if (b.x > w + 50) { b.x = -40; b.y = rand(h * .08, h * .64); }
      const flap = Math.sin(t * 7 + b.wing) * 4 * b.scale;
      for (let k = 0; k < 3; k++) {
        const xx = b.x + k * 7 * b.scale, yy = b.y + Math.sin(k * .9 + b.phase) * 3;
        ctx.beginPath(); ctx.moveTo(xx - 4 * b.scale, yy + flap * .3); ctx.quadraticCurveTo(xx, yy - flap, xx + 4 * b.scale, yy + flap * .3); ctx.stroke();
      }
    });
    ctx.restore();
  }
  function drawEffects(dt) {
    ctx.save();
    rings = rings.filter(r => r.life > 0);
    rings.forEach(r => {
      r.life -= dt * .72; r.radius += dt * 46 * r.power;
      ctx.globalAlpha = clamp(r.life, 0, 1); ctx.strokeStyle = r.color; ctx.lineWidth = 2.2 * r.life;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
    });
    bursts = bursts.filter(b => b.life > 0);
    bursts.forEach(b => {
      b.life -= dt * 1.3; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 22 * dt;
      ctx.globalAlpha = clamp(b.life, 0, 1); ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, 1.2 + b.life * 1.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  function frame(now) {
    if (document.hidden) { raf = 0; return; }
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; elapsed += dt;
    if (now - (frame.lastSync || 0) > 900) { choosePhase(); chooseWeather(); syncCities(); checkLog(); frame.lastSync = now; }
    ctx.clearRect(0, 0, w, h);
    drawSky(elapsed); drawClouds(dt, elapsed); drawWeather(dt, elapsed); drawCities(elapsed);
    drawBirds(dt, elapsed); drawMotes(dt, elapsed); drawEffects(dt);
    raf = requestAnimationFrame(frame);
  }
  wrap.addEventListener('pointermove', e => {
    const r = wrap.getBoundingClientRect();
    pointer.x = clamp((e.clientX - r.left) / r.width, 0, 1);
    pointer.y = clamp((e.clientY - r.top) / r.height, 0, 1);
  }, { passive: true });
  const observer = new MutationObserver(() => { syncCities(); checkLog(); });
  observer.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(wrap);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else if (!reduced && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  resize(); seed(); choosePhase(); chooseWeather();
  if (reduced) { drawSky(0); drawCities(0); }
  else raf = requestAnimationFrame(frame);
})();
