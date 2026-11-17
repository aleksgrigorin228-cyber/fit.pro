/* EPOHI 0.2.0 — persistent achievements and ruler's chronicle. */
(() => {
  'use strict';

  const STORAGE_KEY = 'epohi_last_ruler_legacy_v1';
  const $ = (id) => document.getElementById(id);
  const definitions = [
    { id: 'first-step', title: 'Начало династии', description: 'Вступить на престол', metric: 'turn', target: 1, icon: '👑' },
    { id: 'five-turns', title: 'Пять сезонов', description: 'Дойти до пятого хода', metric: 'turn', target: 5, icon: '📅' },
    { id: 'ten-turns', title: 'Долгое правление', description: 'Дойти до десятого хода', metric: 'turn', target: 10, icon: '🏛️' },
    { id: 'frontier', title: 'Новые рубежи', description: 'Расширить владения до 6 областей', metric: 'land', target: 6, icon: '🗺️' },
    { id: 'small-kingdom', title: 'Малая держава', description: 'Удерживать 8 областей', metric: 'land', target: 8, icon: '🏰' },
    { id: 'royal-army', title: 'Королевское войско', description: 'Собрать 50 воинов', metric: 'army', target: 50, icon: '⚔️' },
    { id: 'stable-reign', title: 'Тихие земли', description: 'Поднять стабильность до 85%', metric: 'stability', target: 85, icon: '🕊️' },
    { id: 'first-discovery', title: 'Первые открытия', description: 'Открыть первую технологию', metric: 'tech', target: 1, icon: '📜' },
    { id: 'wise-council', title: 'Совет мудрецов', description: 'Открыть все 3 технологии', metric: 'tech', target: 3, icon: '🔭' },
    { id: 'renown', title: 'Имя в летописях', description: 'Набрать 50 влияния', metric: 'prestige', target: 50, icon: '✨' }
  ];

  const tasks = [
    { title: 'Укрепить престол', metric: 'stability', target: 80, text: 'Подними стабильность до 80%' },
    { title: 'Расширить границы', metric: 'land', target: 6, text: 'Добейся контроля над 6 областями' },
    { title: 'Усилить войско', metric: 'army', target: 40, text: 'Собери не менее 40 воинов' },
    { title: 'Поддержать учёных', metric: 'tech', target: 1, text: 'Открой хотя бы одну технологию' },
    { title: 'Прославить державу', metric: 'prestige', target: 25, text: 'Набери 25 влияния' }
  ];

  function freshState() {
    return {
      version: 1,
      unlocked: {},
      best: { turn: 0, land: 0, army: 0, stability: 0, prestige: 0, tech: 0 },
      lastLog: [],
      updatedAt: new Date().toISOString()
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.version !== 1) return freshState();
      const initial = freshState();
      return {
        ...initial,
        ...saved,
        best: { ...initial.best, ...(saved.best || {}) },
        unlocked: saved.unlocked && typeof saved.unlocked === 'object' ? saved.unlocked : {},
        lastLog: Array.isArray(saved.lastLog) ? saved.lastLog.slice(-20) : []
      };
    } catch (_) {
      return freshState();
    }
  }

  let archive = loadState();
  let renderQueued = false;

  function numberFrom(id, fallback = 0) {
    const node = $(id);
    if (!node) return fallback;
    const match = String(node.textContent || '').replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(',', '.')) : fallback;
  }

  function readMetrics() {
    let worldState={};try{worldState=JSON.parse(localStorage.getItem('epohi_world_sim_v1')||'null')||{};}catch(_){}
    const sideCaptured=Array.isArray(worldState.captured)?new Set(worldState.captured).size:0;
    const permanentLosses=Math.max(0,Number(worldState.armyLosses)||0);
    const techText = $('techCount')?.textContent || '0 / 3';
    const techMatch = techText.match(/(\d+)\s*\/\s*(\d+)/);
    const dateText = $('dateLabel')?.textContent || '';
    const yearMatch = dateText.match(/(\d{3,4})/);
    return {
      turn: numberFrom('turnLabel'),
      land: numberFrom('landLabel')+sideCaptured,
      army: Math.max(0,numberFrom('armyLabel')-permanentLosses),
      stability: numberFrom('stabilityLabel'),
      prestige: numberFrom('prestigeLabel'),
      tech: techMatch ? Number(techMatch[1]) : 0,
      year: yearMatch ? Number(yearMatch[1]) : null,
      season: dateText.trim()
    };
  }

  function store() {
    archive.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(archive)); }
    catch (_) { /* The main game remains playable if storage is unavailable. */ }
  }

  function collectLog() {
    const entries = Array.from(document.querySelectorAll('#logList .log-entry'))
      .map((node) => (node.textContent || '').trim())
      .filter(Boolean);
    if (entries.length) archive.lastLog = Array.from(new Set([...archive.lastLog, ...entries])).slice(-20);
  }

  function metricLabel(key) {
    return ({ turn: 'ход', land: 'области', army: 'воина', stability: '%', prestige: 'влияния', tech: 'технологии' })[key] || '';
  }

  function progressFor(def, metrics) {
    return Math.max(0, Math.min(def.target, Number(metrics[def.metric] || 0)));
  }

  function unlockAchievements(metrics) {
    const unlockedNow = [];
    for (const def of definitions) {
      if (!archive.unlocked[def.id] && Number(metrics[def.metric] || 0) >= def.target) {
        archive.unlocked[def.id] = new Date().toISOString();
        unlockedNow.push(def);
      }
    }
    return unlockedNow;
  }

  function showToast(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function renderAchievements(metrics) {
    const list = $('achievementList');
    if (!list) return;
    const totalUnlocked = definitions.filter((def) => archive.unlocked[def.id]).length;
    $('legacyCount').textContent = `${totalUnlocked} / ${definitions.length}`;
    list.innerHTML = definitions.map((def) => {
      const unlocked = Boolean(archive.unlocked[def.id]);
      const progress = progressFor(def, metrics);
      const value = unlocked ? '✓ Получено' : `${progress} / ${def.target} ${metricLabel(def.metric)}`;
      return `<div class="achievement${unlocked ? ' is-unlocked' : ''}">
        <span class="achievement-icon" aria-hidden="true">${unlocked ? def.icon : '🔒'}</span>
        <span class="achievement-copy"><strong>${def.title}</strong><small>${def.description}</small></span>
        <span class="achievement-progress">${value}</span>
      </div>`;
    }).join('');
  }

  function renderObjective(metrics) {
    const task = tasks[Math.floor(Math.max(1, metrics.turn) / 3) % tasks.length];
    const current = Math.max(0, Number(metrics[task.metric] || 0));
    const done = current >= task.target;
    const fill = Math.min(100, Math.round((current / task.target) * 100));
    $('legacyObjectiveTitle').textContent = task.title;
    $('legacyObjectiveText').textContent = task.text;
    $('legacyObjectiveValue').textContent = done ? 'Выполнено' : `${current} / ${task.target} ${metricLabel(task.metric)}`;
    $('legacyObjectiveBar').style.width = `${fill}%`;
    $('legacyObjective').classList.toggle('is-complete', done);
  }

  function renderBest() {
    $('legacyBestTurn').textContent = archive.best.turn || '—';
    $('legacyBestLand').textContent = archive.best.land ? `${archive.best.land}` : '—';
    $('legacyBestArmy').textContent = archive.best.army ? `${archive.best.army}` : '—';
  }

  function refresh() {
    renderQueued = false;
    const metrics = readMetrics();
    for (const key of Object.keys(archive.best)) {
      archive.best[key] = Math.max(Number(archive.best[key] || 0), Number(metrics[key] || 0));
    }
    collectLog();
    const newlyUnlocked = unlockAchievements(metrics);
    renderBest();
    renderObjective(metrics);
    renderAchievements(metrics);
    store();
    if (newlyUnlocked.length) {
      showToast(newlyUnlocked.length === 1
        ? `Новое достижение: ${newlyUnlocked[0].title}`
        : `Получено достижений: ${newlyUnlocked.length}`);
    }
  }

  function queueRefresh() {
    if (renderQueued) return;
    renderQueued = true;
    window.setTimeout(refresh, 100);
  }

  function exportArchive() {
    const data = {
      game: 'ЭПОХИ: Последний правитель',
      archiveVersion: archive.version,
      exportedAt: new Date().toISOString(),
      note: 'Это отдельная летопись достижений и рекордов. Она не является резервной копией сохранения основной игры.',
      current: readMetrics(),
      best: archive.best,
      achievements: definitions.map((def) => ({ ...def, unlockedAt: archive.unlocked[def.id] || null })),
      recentChronicle: archive.lastLog
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'epohi-letopis.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function boot() {
    if (window.__epohiLegacyReady) return true;
    const grid = $('mapGrid');
    if (!grid || !grid.children.length || !$('turnLabel')) return false;
    window.__epohiLegacyReady = true;

    ['resourcebar', 'mapGrid', 'inspector', 'techPanel', 'logList', 'turnLabel', 'dateLabel', 'stabilityLabel', 'armyLabel', 'landLabel', 'prestigeLabel', 'techCount', 'simArmy', 'simLands']
      .map($)
      .filter(Boolean)
      .forEach((node) => new MutationObserver(queueRefresh).observe(node, {
        childList: true, subtree: true, characterData: true, attributes: true
      }));

    $('exportLegacyBtn')?.addEventListener('click', exportArchive);
    refresh();
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (boot() || attempts >= 120) window.clearInterval(timer);
  }, 250);
  boot();
})();
