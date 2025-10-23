/* app.js (merged) */
(function(){
'use strict';

/* ==== js/state.js ==== */
// Local storage helpers: simple typed getters/setters + app state
export const store = {
  get(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

// Generic app-state accessors for compatibility with `State.get(...)` calls
export function get(key, fallback = null) { return store.get(key, fallback); }
export function set(key, value) { store.set(key, value); return value; }
export function del(key) { store.del(key); }


// band title cache (for favorites grid)
export function bandTitleFromCache(id) {
  const map = store.get('bandTitleMap', {}) || {};
  return map[id] || decodeURIComponent(id).replace(/[_+]+/g, ' ').trim();
}

// Favorites: bands
export function favBands() { return store.get('favBands', []); }
export function toggleFavBand(id) {
  const arr = favBands();
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  store.set('favBands', arr);
  store.set('favVersion', Date.now()); // bump version for on-this-day cache keys
  return arr;
}

// Favorites: shows
export function favShows() { return store.get('favShows', []); }
export function isFavShow(id) { return favShows().includes(id); }
export function toggleFavShow(id) {
  const arr = favShows();
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  store.set('favShows', arr);
  return arr;
}

// Favorites: songs
export function favSongs() { return store.get('favSongs', []); }
export function findSongIdx(url) { return favSongs().findIndex(s => s.url === url); }
export function toggleFavSong(song) {
  const arr = favSongs();
  const i = arr.findIndex(s => s.url === song.url);
  if (i >= 0) arr.splice(i, 1); else arr.push(song);
  store.set('favSongs', arr);
  return arr;
}

// Recently played
export function recentSongs() { return store.get('recentSongs', []); } // [{url,title,date,location,band,showTitle,showId,ts}]
export function pushRecent(song) {
  const arr = recentSongs();
  const i = arr.findIndex(s => s.url === song.url);
  if (i >= 0) arr.splice(i, 1);
  arr.unshift({ ...song, ts: Date.now() });
  if (arr.length > 100) arr.length = 100;
  store.set('recentSongs', arr);
  return arr;
}

export function parseShowIdFromUrl(url = '') {
  try { const m = /archive\.org\/download\/([^/]+)\//i.exec(url); return m ? decodeURIComponent(m[1]) : ''; }
  catch { return ''; }
}
/* ==== js/ui.js ==== */
export const $ = (s)=> document.querySelector(s);
export const $$ = (s)=> Array.from(document.querySelectorAll(s));
export function show(el,on=true){ if(!el) return; el.style.display=on?'':'none'; }
export function hide(el){ show(el, false); }            // <-- add this
export function setHTML(el, html){ el.innerHTML = html; }


export function fmtTime(secs){
  secs = Math.max(0, Math.floor(secs||0));
  const m=Math.floor(secs/60), s=secs%60;
  return m+":"+String(s).padStart(2,"0");
}
export function fmtCompact(n){
  n=Number(n||0);
  if(n>=1e9) return (n/1e9).toFixed(1)+'B';
  if(n>=1e6) return (n/1e6).toFixed(1)+'M';
  if(n>=1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}

export function prettyId(id=''){
  const raw = decodeURIComponent(id).replace(/[_+]+/g, ' ').trim();
  return raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g,' ').trim();
}

export function renderStars(r=0){
  const rating = Math.round((r||0)*2)/2;
  let out = '';
  for(let i=1;i<=5;i++){
    if (rating>=i) out += fullStar();
    else if (rating>=i-0.5) out += halfStar(i);
    else out += emptyStar();
  }
  return `<span class="stars" aria-label="${rating} out of 5 stars">${out}</span>`;
}
function fullStar(){
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M12 2.3l2.9 5.9 6.6 1-4.8 4.7 1.1 6.6L12 17.8 6.2 20.5 7.3 13.9 2.5 9.2l6.6-1z" fill="#ffcc33" stroke="#ffcc33" stroke-width="1"/>
  </svg>`;
}
function halfStar(i){
  const id = 'grad'+i+'_'+Math.random().toString(36).slice(2);
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="50%" stop-color="#ffcc33"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs>
    <path d="M12 2.3l2.9 5.9 6.6 1-4.8 4.7 1.1 6.6L12 17.8 6.2 20.5 7.3 13.9 2.5 9.2l6.6-1z" fill="url(#${id})" stroke="#ffcc33" stroke-width="1"/>
  </svg>`;
}
function emptyStar(){
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M12 2.3l2.9 5.9 6.6 1-4.8 4.7 1.1 6.6L12 17.8 6.2 20.5 7.3 13.9 2.5 9.2l6.6-1z" fill="none" stroke="#ffcc33" stroke-width="1"/>
  </svg>`;
}

export function todayMMDD(){
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return { mm, dd };
}

// cache of band id → title for favorites grid UX
export function bandTitleFromCache(id){
  const map = JSON.parse(localStorage.getItem('bandTitleMap') || '{}');
  return map[id] || prettyId(id);
}
/* ==== js/ia.js ==== */
// Archive.org helpers: resilient fetch + URL builders + small status banner API

// ----- status banner -----
const banner = {
  el: () => document.getElementById('statusBanner'),
  msg: () => document.getElementById('statusMsg'),
  show(message, kind = 'warn') {
    const el = this.el(); const m = this.msg();
    if (!el || !m) return;
    m.textContent = message;
    el.dataset.kind = kind;
    el.hidden = false;
  },
  hide() { const el = this.el(); if (el) el.hidden = true; }
};

// ----- small utilities -----
export function todayMMDD() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { mm, dd };
}

// ----- resilient fetch with timeout, retries, and cache helpers -----
const IA_STATUS = { failCount: 0, circuitUntil: 0 };
const now = () => Date.now();
const circuitOpen = () => now() < IA_STATUS.circuitUntil;
const openCircuit = (ms = 5 * 60 * 1000) => { IA_STATUS.circuitUntil = now() + ms; };

function fetchWithTimeout(url, ms = 15000, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...opts, signal: ctl.signal }).finally(() => clearTimeout(t));
}

// tiny localStorage cache
function setCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function getCache(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || ''); return v && v.data; } catch { return null; }
}

// JSONP fallback (CORS-safe)
function fetchJSONP(url, { timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    const cb = '__iajsonp_' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    let done = false;
    function cleanup() { if (done) return; done = true; delete window[cb]; s.remove(); }
    const t = setTimeout(() => { cleanup(); resolve(null); }, timeout);
    window[cb] = (data) => { clearTimeout(t); cleanup(); resolve(data); };
    s.onerror = () => { clearTimeout(t); cleanup(); resolve(null); };
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb + '&output=json';
    document.head.appendChild(s);
  });
}

// Main entry: resilient IA fetch with cache and circuit breaker
export async function iaFetchJSON(url, { cacheKey, retries = 2, timeoutMs = 15000 } = {}) {
  if (circuitOpen()) {
    const cached = cacheKey ? getCache(cacheKey) : null;
    if (cached) {
      banner.show('Archive.org is having trouble; showing cached results (stale).', 'info');
      return { data: cached, stale: true };
    }
    throw new Error('Archive.org temporarily unavailable (cool-down).');
  }

  let attempt = 0;
  while (true) {
    try {
      const res = await fetchWithTimeout(url, timeoutMs, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      IA_STATUS.failCount = 0;
      banner.hide();
      if (cacheKey) setCache(cacheKey, data);
      return { data, stale: false };
    } catch (err) {
      attempt++;
      IA_STATUS.failCount++;
      if (attempt > retries) {
        if (IA_STATUS.failCount >= 3) {
          openCircuit();
          banner.show('Archive.org seems unreachable. Showing cache when available.', 'warn');
        } else if (!navigator.onLine) {
          banner.show('You appear to be offline. Reconnect and try again.', 'warn');
        } else {
          banner.show('Trouble reaching Archive.org.', 'warn');
        }
        const cached = cacheKey ? getCache(cacheKey) : null;
        if (cached) return { data: cached, stale: true };

        // final try: JSONP if advancedsearch/services supports it
        const viaJsonp = await fetchJSONP(url);
        if (viaJsonp) return { data: viaJsonp, stale: true };
        throw err;
      }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

// ----- URL builders -----
export const IA = {
  bandsV1({ q = 'collection:(etree) AND mediatype:(collection)', sort = 'downloads desc', rows = 120, term = '' } = {}) {
    // v1 sorts are space-separated and uses titleSorter for alpha sorts
    const [field, dir = 'desc'] = sort.split(/\s+/);
    const f = field === 'title' ? 'titleSorter' : field;
    const sorts = `${f} ${dir.toLowerCase()}`;
    const Q = term
      ? `${q} AND (title:(${term}) OR identifier:(${term}))`
      : q;
    const u = new URL('https://archive.org/services/search/v1/scrape');
    u.searchParams.set('q', Q);
    u.searchParams.set('fields', 'identifier,title,downloads');
    u.searchParams.set('sorts', sorts);
    u.searchParams.set('count', String(rows));
    return u.toString();
  },

  concerts({ bandId, sort = 'date desc', rows = 200, page = 1, year = '', term = '' }) {
    let q = `collection:(${bandId}) AND mediatype:(etree OR audio)`;
    if (year) q += ` AND year:(${year})`;
    if (term) q += ` AND (title:(${term}) OR date:(${term}) OR venue:(${term}) OR coverage:(${term}))`;
    const u = new URL('https://archive.org/advancedsearch.php');
    u.searchParams.set('q', q);
    [
      'identifier', 'title', 'date', 'year', 'downloads', 'avg_rating', 'num_reviews',
      'venue', 'coverage', 'creator', 'publicdate', 'collection'
    ].forEach(f => u.searchParams.append('fl[]', f));
    u.searchParams.append('sort[]', sort);
    u.searchParams.set('rows', String(rows));
    u.searchParams.set('page', String(page));
    u.searchParams.set('output', 'json');
    return u.toString();
  },

  concertsByIds(ids) {
    const safe = ids.map(id => `"${String(id).replace(/"/g, '\\"')}"`);
    const q = `identifier:(${safe.join(' OR ')}) AND (mediatype:(etree) OR mediatype:(audio))`;
    const u = new URL('https://archive.org/advancedsearch.php');
    u.searchParams.set('q', q);
    [
      'identifier', 'title', 'date', 'year', 'downloads', 'avg_rating', 'num_reviews',
      'venue', 'coverage', 'creator', 'publicdate', 'collection'
    ].forEach(f => u.searchParams.append('fl[]', f));
    u.searchParams.append('sort[]', 'date desc');
    u.searchParams.set('rows', String(ids.length || 50));
    u.searchParams.set('page', '1');
    u.searchParams.set('output', 'json');
    return u.toString();
  },

  // on-this-day via v1 scrape
  onThisDayV1({ bandId, mm, dd, rows = 400, sort = 'date desc' }) {
    const q = `collection:(${bandId}) AND (mediatype:(etree) OR mediatype:(audio)) AND date:*-${mm}-${dd}`;
    const u = new URL('https://archive.org/services/search/v1/scrape');
    u.searchParams.set('q', q);
    u.searchParams.set('fields', [
      'identifier', 'title', 'date', 'year', 'downloads',
      'avg_rating', 'num_reviews', 'venue', 'coverage', 'creator', 'publicdate'
    ].join(','));
    const [field, dir = 'desc'] = sort.split(/\s+/);
    const sorts = `${field} ${dir.toLowerCase()}`;
    u.searchParams.set('sorts', sorts);
    u.searchParams.set('count', String(rows));
    return u.toString();
  },

  metaUrl: (id) => `https://archive.org/metadata/${id}`,
  imgUrl: (id) => `https://archive.org/services/img/${id}`
};

// network status helpers
window.addEventListener('offline', () => banner.show('You are offline. Some features won’t work.', 'warn'));
window.addEventListener('online', () => banner.hide());

// convenience re-export
export const showStatus = (m, k) => banner.show(m, k);
export const hideStatus = () => banner.hide();
/* ==== js/player.js ==== */
// Audio player wiring + media session

const A = document.getElementById('audio');
const P = {
  play: document.getElementById('P_play'),
  prev: document.getElementById('P_prev'),
  next: document.getElementById('P_next'),
  mute: document.getElementById('P_mute'),
  seek: document.getElementById('P_seek'),
  cur: document.querySelector('#P_times .cur'),
  dur: document.querySelector('#P_times .dur'),
  now: document.getElementById('P_now'),
  vol: document.getElementById('P_vol'),
  volPop: document.getElementById('volPop'),
  volLabel: document.getElementById('volLabel')
};

let trackList = [];     // [{url,title,length}]
let curIndex = -1;
let playlistMeta = null; // optional parallel meta array
let currentShowId = '';
let currentShowDate = '';
let currentShowLocation = '';
let currentShowBand = '';
let currentShowTitle = '';

// Equalizer button animation state
const EQ = document.querySelector('#P_now .eqBars');
function updateEqAnim(){ if (EQ) EQ.classList.toggle('paused', A.paused); }
document.addEventListener('DOMContentLoaded', updateEqAnim);

// expose a tiny initializer for callers that expect it
export function initEQ() {
  try { 
    // run once to sync the button state
    const evt = new Event('DOMContentLoaded');
    document.dispatchEvent(evt); // triggers the existing listener
  } catch {
    // fallback: call directly
    const EQ = document.querySelector('#P_now .eqBars');
    if (EQ) EQ.classList.toggle('paused', document.getElementById('audio')?.paused);
  }
}


// Media Session
function updateMediaSession(title = 'Playing') {
  if (!('mediaSession' in navigator)) return;
  const artist = currentShowBand || 'Setlist Streamer';
  const album = [currentShowLocation, currentShowDate].filter(Boolean).join(' • ');
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title, artist, album,
      artwork: [
        { src: 'icons/logo-96.png?v=3', sizes: '96x96', type: 'image/png' },
        { src: 'icons/logo-192.png?v=3', sizes: '192x192', type: 'image/png' },
        { src: 'icons/logo-512.png?v=3', sizes: '512x512', type: 'image/png' }
      ]
    });
    try {
      navigator.mediaSession.setPositionState({
        duration: Number.isFinite(A.duration) ? A.duration : 0,
        playbackRate: A.playbackRate || 1,
        position: Number.isFinite(A.currentTime) ? A.currentTime : 0
      });
    } catch {}
  } catch {}
}

// Public API to set track list and show context
export function setTrackList(list) { trackList = Array.isArray(list) ? list.slice() : []; }
export function setPlaylistMeta(meta) { playlistMeta = Array.isArray(meta) ? meta.slice() : null; }
export function setShowContext({ showId = '', date = '', location = '', band = '', title = '' } = {}) {
  currentShowId = showId || currentShowId;
  currentShowDate = date || currentShowDate;
  currentShowLocation = location || currentShowLocation;
  currentShowBand = band || currentShowBand;
  currentShowTitle = title || currentShowTitle;
}

// Expose for routes that want the current list
export function getTrackList() { return trackList.slice(); }
export function getCurrentIndex() { return curIndex; }

// Core play function
export function playIndex(i) {
  if (!trackList.length) return;
  curIndex = Math.max(0, Math.min(i, trackList.length - 1));
  const t = trackList[curIndex];
  if (!t) return;

  // If playlistMeta present, update show context
  const m = Array.isArray(playlistMeta) ? playlistMeta[curIndex] : null;
  if (m) {
    currentShowDate = m.date || currentShowDate;
    currentShowLocation = m.location || currentShowLocation;
    currentShowBand = m.band || currentShowBand;
    currentShowTitle = m.showTitle || m.title || currentShowTitle;
    if (m.showId) currentShowId = m.showId;
  }

  // log recent
  try {
    if (t.url) {
      pushRecent({
        url: t.url,
        title: t.title,
        date: currentShowDate || '',
        location: currentShowLocation || '',
        band: currentShowBand || '',
        showTitle: currentShowTitle || '',
        showId: currentShowId || ''
      });
    }
  } catch {}

  A.src = t.url;
  updateMediaSession(t.title || 'Track');
  A.play().catch(() => {});
  store.set('currentShowId', currentShowId);
  updateEqAnim();
  highlightRow();
}

// Simple row highlight (expects .track elements in DOM)
function highlightRow() {
  const rows = Array.from(document.querySelectorAll('.track'));
  rows.forEach((el, idx) => el.classList.toggle('playing', idx === curIndex));
}

// Controls
P.play?.addEventListener('click', () => { if (A.paused) A.play(); else A.pause(); });
A.addEventListener('play', () => { P.play.textContent = '⏸'; store.set('wasPlaying', true); updateEqAnim(); });
A.addEventListener('pause', () => { P.play.textContent = '▶️'; store.set('wasPlaying', false); updateEqAnim(); });
A.addEventListener('ended', () => {
  updateEqAnim();
  if (curIndex < trackList.length - 1) playIndex(curIndex + 1);
});

P.prev?.addEventListener('click', () => { if (curIndex > 0) playIndex(curIndex - 1); });
P.next?.addEventListener('click', () => { if (curIndex < trackList.length - 1) playIndex(curIndex + 1); });

// Volume + popover
const savedVol = Number(store.get('volume', 1));
A.volume = isNaN(savedVol) ? 1 : Math.max(0, Math.min(1, savedVol));
P.vol.value = String(A.volume);
setVolumeUI(A.volume);

function setVolumeUI(v) {
  const pct = Math.round((v || 0) * 100);
  if (P.volLabel) P.volLabel.textContent = pct + '%';
  P.mute.textContent = (A.muted || v === 0) ? '🔇' : '🔈';
}
P.mute.addEventListener('click', () => { P.volPop.classList.toggle('open'); });
document.addEventListener('click', (e) => {
  const w = document.querySelector('.volWrap');
  if (w && !w.contains(e.target)) P.volPop.classList.remove('open');
});
P.vol.addEventListener('input', () => {
  const v = Number(P.vol.value);
  A.volume = Math.max(0, Math.min(1, v));
  A.muted = (A.volume === 0);
  store.set('volume', A.volume);
  setVolumeUI(A.volume);
});

// Seek + time
P.seek?.addEventListener('input', () => {
  if (!A.duration || isNaN(A.duration)) return;
  A.currentTime = (P.seek.value / 1000) * A.duration;
});
A.addEventListener('timeupdate', () => {
  if (A.duration && !isNaN(A.duration)) {
    const fmt = (s) => {
      s = Math.max(0, Math.floor(s || 0));
      const m = Math.floor(s / 60), x = s % 60;
      return m + ':' + String(x).padStart(2, '0');
    };
    if (P.cur) P.cur.textContent = fmt(A.currentTime);
    if (P.dur) P.dur.textContent = ' / ' + fmt(A.duration);
    if (P.seek) P.seek.value = Math.floor((A.currentTime / A.duration) * 1000);
    // progress bar for current row
    const el = document.getElementById('pb-' + curIndex);
    if (el) el.style.width = `${(A.currentTime / A.duration) * 100}%`;
  } else {
    if (P.cur) P.cur.textContent = '0:00';
    if (P.dur) P.dur.textContent = ' / 0:00';
    if (P.seek) P.seek.value = 0;
  }
});

// Now-playing button -> jump to current show
P.now?.addEventListener('click', () => {
  const url = (trackList[curIndex] && trackList[curIndex].url) || '';
  if (currentShowId) {
    if (url) store.set('jumpToUrl', url);
    location.hash = '#/show/' + encodeURIComponent(currentShowId);
  }
});

// Auto-resume hints
function tryAutoResume() {
  if (store.get('wasPlayingOnHide', false)) { A.play().catch(() => {}); }
}
function markHideState() { store.set('wasPlayingOnHide', !A.paused); }
document.addEventListener('visibilitychange', () => { if (document.hidden) markHideState(); else tryAutoResume(); });
window.addEventListener('pageshow', tryAutoResume);
window.addEventListener('focus', tryAutoResume);

// export helpers to be used by routes
export function useShowForPlayer({ showId, date, location, band, title }) {
  setShowContext({ showId, date, location, band, title });
  store.set('currentShowId', showId);
}

export function playListStartingAt(list, index = 0, meta = null, showCtx = null) {
  setTrackList(list);
  setPlaylistMeta(meta);
  if (showCtx) setShowContext(showCtx);
  playIndex(index);
}
/* ==== js/router.js ==== */
const routes = new Map();

export function on(name, fn){ routes.set(name, fn); }

function parse(){
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  const name = parts[0] || 'bands';
  const params = parts.slice(1);
  const key = params.length ? `${name}/${params.join('/')}` : name;
  return { name, params, key };
}

export function route(){
  const r = parse();
  // pick handler: exact key, name, or fallback
  const handler = routes.get(r.key) || routes.get(r.name) || routes.get('bands');
  // dispatch event so header can update
  window.dispatchEvent(new CustomEvent('routechange', { detail: r }));
  handler(r.params);
}
/* ==== js/routes/bands.js ==== */
let onlyFavBands = false;

function renderFavGrid(content) {
  const fav = favBands();
  if (!fav.length) {
    setHTML(content, `<div class="card"><span class="small">No favorite bands yet.</span></div>`);
    return;
  }
  setHTML(content, fav.map(id => {
    const title = bandTitleFromCache(id);
    return `
      <div class="bandTile fav" data-id="${id}">
        <img src="https://archive.org/services/img/${id}" alt="${title}">
        <div class="bandTitle">${title}</div>
        <button class="starBtn is-on" data-toggle="${id}" title="Favorite">★</button>
      </div>
    `;
  }).join(''));
}

async function renderAllBands(content) {
  setHTML(content, `<div class="card"><span class="small">Loading bands…</span></div>`);
  const sort = (document.getElementById('sortSel')?.value) || 'downloads desc';
  const term = (document.getElementById('searchBox')?.value || '').trim();
  const url = IA.bandsV1({ sort, rows: 120, term });
  const cacheKey = `bands:v1:${sort}:${term}`;
  try {
    const { data } = await iaFetchJSON(url, { cacheKey, retries: 2, timeoutMs: 15000 });
    const items = (data.items || []).map(d => ({ id: d.identifier, title: d.title || d.identifier, downloads: d.downloads || 0 }));
    // cache titles for reuse
    const titleMap = store.get('bandTitleMap', {}) || {};
    items.forEach(b => { titleMap[b.id] = b.title; });
    store.set('bandTitleMap', titleMap);

    setHTML(content, items.map(b => `
      <div class="bandTile" data-id="${b.id}">
        <img src="https://archive.org/services/img/${b.id}" alt="${b.title}">
        <div class="bandTitle">${b.title}</div>
        <div class="bandViews">${(b.downloads || 0).toLocaleString()} views</div>
      </div>
    `).join(''));
  } catch (e) {
    setHTML(content, `
      <div class="card">
        <div class="retryWrap">
          <span class="small">Network error while loading bands.</span>
          <button class="btn" id="retryBands">Retry</button>
        </div>
      </div>
    `);
    document.getElementById('retryBands')?.addEventListener('click', () => onRoute());
  }
}

function onRoute() {
  const tbBands = document.getElementById('toolbar-bands');
  const tbBand = document.getElementById('toolbar-band');
  const showMeta = document.getElementById('showMeta');
  tbBands && (tbBands.style.display = '');
  tbBand && (tbBand.style.display = 'none');
  showMeta && (showMeta.style.display = 'none');
  document.getElementById('subHeader')?.classList.remove('show');

  // toggle visual state
  const favBtn = document.getElementById('favToggle');
  if (favBtn) {
    favBtn.classList.toggle('is-on', !!onlyFavBands);
    favBtn.textContent = onlyFavBands ? '★ Favorites' : '☆ Favorites';
  }

  const content = document.getElementById('content');
  content.className = 'bandsGrid';

  if (onlyFavBands) renderFavGrid(content);
  else renderAllBands(content);

  content.onclick = (ev) => {
    const star = ev.target.closest('.starBtn');
    if (star) {
      const id = star.getAttribute('data-toggle');
      toggleFavBand(id);
      onRoute(); // re-render
      return;
    }
    const tile = ev.target.closest('.bandTile');
    if (!tile) return;
    location.hash = '#/band/' + encodeURIComponent(tile.dataset.id);
  };
}

on('bands', onRoute);

// toolbar events (live on page once)
document.getElementById('sortSel')?.addEventListener('change', () => onRoute());
document.getElementById('searchBox')?.addEventListener('change', () => onRoute());
document.getElementById('favToggle')?.addEventListener('click', () => {
  onlyFavBands = !onlyFavBands;
  onRoute();
});
document.getElementById('resetBtn')?.addEventListener('click', () => {
  const sortSel = document.getElementById('sortSel');
  const searchBox = document.getElementById('searchBox');
  onlyFavBands = false;
  if (sortSel) sortSel.value = 'downloads desc';
  if (searchBox) searchBox.value = '';
  onRoute();
});
/* ==== js/routes/band.js ==== */
let state = { bandId: '', year: '', term: '', sortSel: 'auto', page: 1, rows: 200, list: [], numFound: 0 };
let onlyFavConcerts = false;

function resolveSort() {
  return state.sortSel === 'auto' ? (state.year ? 'date asc' : 'date desc') : state.sortSel;
}

async function loadPage(content) {
  const sortExpr = resolveSort();
  const url = IA.concerts({ bandId: state.bandId, sort: sortExpr, rows: state.rows, page: state.page, year: state.year, term: state.term });
  const cacheKey = `concerts:${state.bandId}:${state.year}:${state.term}:${sortExpr}:p${state.page}`;
  const { data } = await iaFetchJSON(url, { cacheKey, retries: 2, timeoutMs: 15000 });
  const resp = data?.response || {};
  state.numFound = Number(resp.numFound || 0);
  state.list = state.list.concat(resp.docs || []);
  renderConcerts(content);
}

function resetAndLoad(content, patch = {}) {
  state = { ...state, ...patch, page: 1, list: [], numFound: 0 };
  setHTML(content, `<div class="card"><span class="small">Loading concerts…</span></div>`);
  loadPage(content).catch(() => {
    setHTML(content, `
      <div class="card">
        <div class="retryWrap">
          <span class="small">Network error while loading concerts.</span>
          <button class="btn" id="retryConcerts">Retry</button>
        </div>
      </div>
    `);
    document.getElementById('retryConcerts')?.addEventListener('click', () => resetAndLoad(content, {}));
  });
}

function renderConcerts(content) {
  let list = state.list.slice();
  if (onlyFavConcerts) {
    const fav = favShows();
    list = list.filter(d => fav.includes(d.identifier));
  }
  if (!list.length) {
    setHTML(content, `<div class="card"><span class="small">No concerts found.</span></div>`);
    return;
  }
  setHTML(content, list.map(it => {
    const dateStr = it.date ? new Date(it.date).toLocaleDateString() : (it.year || '');
    const reviews = it.num_reviews || 0;
    const venueLine = [it.venue, it.coverage].filter(Boolean).join(', ');
    const viewsChip = `<span class="chip">${fmtCompact(it.downloads || 0)} views</span>`;
    const favOn = favShows().includes(it.identifier);
    return `
      <div class="card tap" data-id="${it.identifier}">
        <div>
          <h3>${it.title || it.identifier}</h3>
          <div class="row">
            <span class="chip">${dateStr}</span>
            ${viewsChip}
            ${renderStars(it.avg_rating || 0)}
            <span class="small">(${reviews})</span>
          </div>
          <div class="small">${venueLine}</div>
        </div>
        <div class="row">
          <button class="btn ghost favToggle${favOn ? ' is-on' : ''}" title="Favorite">${favOn ? '★' : '☆'}</button>
        </div>
      </div>
    `;
  }).join(''));

  if (!onlyFavConcerts && state.list.length < state.numFound) {
    const more = document.createElement('div');
    more.className = 'card loadMore';
    more.innerHTML = `<button class="btn" id="loadMoreBtn">Load more (${state.list.length} / ${state.numFound})</button>`;
    content.appendChild(more);
    document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
      state.page += 1;
      loadPage(content);
    });
  }

  content.onclick = (ev) => {
    const favBtn = ev.target.closest('.favToggle');
    const card = ev.target.closest('.card.tap');
    if (favBtn && card) {
      toggleFavShow(card.dataset.id);
      renderConcerts(content);
      return;
    }
    if (card) {
      store.set('cameFrom', 'band');
      store.set('cameFromBandId', state.bandId || '');
      location.hash = '#/show/' + encodeURIComponent(card.dataset.id);
    }
  };
}

function onRoute(params) {
  const bandId = decodeURIComponent((params || [])[0] || '');
  state = { bandId, year: '', term: '', sortSel: 'auto', page: 1, rows: 200, list: [], numFound: 0 };

  // toolbars visibility
  document.getElementById('toolbar-bands').style.display = 'none';
  document.getElementById('toolbar-band').style.display = '';
  document.getElementById('showMeta').style.display = 'none';
  const sub = document.getElementById('subHeader');
  sub.classList.add('show');
  document.getElementById('bandName').textContent = decodeURIComponent(bandId).replace(/[_+]+/g, ' ').replace(/\s+/g, ' ').trim();

  // band favorite toggle
  const favBandBtn = document.getElementById('favBandBtn');
  favBandBtn.onclick = () => {
    const wasFav = favBands().includes(bandId);
    toggleFavBand(bandId);
    favBandBtn.textContent = wasFav ? '☆' : '★';
    favBandBtn.classList.toggle('fav', !wasFav);
  };
  favBandBtn.textContent = favBands().includes(bandId) ? '★' : '☆';
  favBandBtn.classList.toggle('fav', favBands().includes(bandId));

  // favorites filter state
  const favToggle = document.getElementById('favConcertsToggle');
  favToggle.classList.toggle('is-on', !!onlyFavConcerts);
  favToggle.textContent = onlyFavConcerts ? '★ Favorites' : '☆ Favorites';
  favToggle.onclick = () => {
    onlyFavConcerts = !onlyFavConcerts;
    favToggle.textContent = onlyFavConcerts ? '★ Favorites' : '☆ Favorites';
    favToggle.classList.toggle('is-on', !!onlyFavConcerts);
    renderConcerts(document.getElementById('content'));
  };

  // reset controls
  document.getElementById('resetConcerts').onclick = () => {
    onlyFavConcerts = false;
    document.getElementById('concertSearch').value = '';
    document.getElementById('favConcertsToggle').textContent = '☆ Favorites';
    document.getElementById('favConcertsToggle').classList.remove('is-on');
    document.getElementById('sortBtn').textContent = 'Sort';
    state.sortSel = 'auto';
    resetAndLoad(document.getElementById('content'), { year: '', term: '', sortSel: 'auto' });
  };

  // sort dropdown
  const sortWrap = document.getElementById('sortMenu');
  sortWrap.innerHTML = `
    <div class="item" data-value="auto">Auto</div>
    <div class="item" data-value="date asc">Date ↑</div>
    <div class="item" data-value="date desc">Date ↓</div>
    <div class="item" data-value="avg_rating desc">Reviews ↓</div>
    <div class="item" data-value="downloads desc">Views ↓</div>
  `;
  document.getElementById('sortDrop').addEventListener('click', (e) => {
    const it = e.target.closest('.item');
    if (!it) return;
    state.sortSel = it.dataset.value || 'auto';
    document.getElementById('sortBtn').textContent = state.sortSel === 'auto'
      ? 'Sort' : it.textContent;
    resetAndLoad(document.getElementById('content'), { sortSel: state.sortSel });
  });

  // year menu placeholder (you can add facet years later if needed)
  document.getElementById('yearMenu').innerHTML = `<div class="item" data-value="">All years</div>`;
  document.getElementById('yearDrop').addEventListener('click', (e) => {
    const it = e.target.closest('.item');
    if (!it) return;
    state.year = it.dataset.value || '';
    document.getElementById('yearBtn').textContent = it.textContent || 'All years';
    resetAndLoad(document.getElementById('content'), { year: state.year });
  });

  // search filter
  document.getElementById('concertSearch').onchange = () => {
    const term = (document.getElementById('concertSearch').value || '').trim().toLowerCase();
    resetAndLoad(document.getElementById('content'), { term });
  };

  // load
  const content = document.getElementById('content');
  content.className = 'grid';
  resetAndLoad(content, {});
}

on('band', onRoute);
/* ==== js/routes/show.js ==== */
let currentShowId = '';
let trackList = [];
let trackEls = [];

function cleanTitle(name) {
  let t = name.replace(/\.(mp3|ogg|flac)$/i, '');
  t = t.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(\d+)[\s.\-_]+/, '');
  return t;
}
function extractTrackNo(f) {
  const n1 = Number(f.track || f.trackno || '');
  if (!isNaN(n1) && n1 > 0) return n1;
  const m = /(\d+)[^\d]*\.(mp3|ogg|flac)$/i.exec(f.name || '');
  if (m) return Number(m[1]);
  return Infinity;
}
function naturalCmp(a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); }

async function onRoute(params) {
  currentShowId = decodeURIComponent((params || [])[0] || '');
  const content = document.getElementById('content');
  content.className = 'tracks';

  // hide other toolbars, show showMeta later
  document.getElementById('toolbar-bands').style.display = 'none';
  document.getElementById('toolbar-band').style.display = 'none';
  document.getElementById('showMeta').style.display = 'none';
  document.getElementById('subHeader').classList.remove('show');

  setHTML(content, `<div class="card"><span class="small">Loading tracks…</span></div>`);

  try {
    const { data: meta } = await iaFetchJSON(IA.metaUrl(currentShowId), { retries: 2, timeoutMs: 15000 });
    const md = meta?.metadata || {};
    const title = md.title || currentShowId;
    const date = md.date ? new Date(md.date).toLocaleDateString() : '';
    const venue = md.venue || '';
    const coverage = md.coverage || '';
    const location = [venue, coverage].filter(Boolean).join(', ');
    const band = md.creator || '';

    // show header
    document.getElementById('showTitle').textContent = title;
    const showDateEl = document.getElementById('showDate');
    const showLocEl = document.getElementById('showLoc');
    showDateEl.textContent = date; showDateEl.style.display = date ? '' : 'none';
    showLocEl.textContent = location; showLocEl.style.display = location ? '' : 'none';
    document.getElementById('showMeta').style.display = '';

    // favorite toggle
    const favBtn = document.getElementById('favShowBtn');
    const refreshFavBtn = () => {
      const on = favShows().includes(currentShowId);
      favBtn.textContent = on ? '★ Favorited' : '☆ Favorite';
      favBtn.classList.toggle('fav', on);
    };
    favBtn.onclick = () => { toggleFavShow(currentShowId); refreshFavBtn(); };
    refreshFavBtn();

    // files
    const files = meta?.files || [];
    let playable = files.filter(f =>
      /\.mp3$/i.test(f.name || '') || (String(f.format || '').toLowerCase().includes('mp3'))
    );
    if (!playable.length) {
      playable = files.filter(f =>
        /\.(ogg|flac)$/i.test(f.name || '') || /(ogg|flac)/.test(String(f.format || '').toLowerCase())
      );
    }
    playable.sort((a, b) => {
      const an = extractTrackNo(a), bn = extractTrackNo(b);
      if (an !== bn) return an - bn;
      return naturalCmp(a.name || '', b.name || '');
    });

    trackList = [];
    const seen = new Set();
    for (const f of playable) {
      const t = cleanTitle(f.title || f.name || '');
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const url = `https://archive.org/download/${currentShowId}/${encodeURIComponent(f.name)}`;
      trackList.push({ url, title: t, length: f.length || '' });
    }

    if (!trackList.length) {
      setHTML(content, `<div class="card"><span class="small">No playable files found.</span></div>`);
      return;
    }

    setHTML(content, trackList.map((t, i) => `
      <div class="track" data-i="${i}">
        <div class="tleft">
          <button class="songFav${(findSongIdx(t.url) >= 0 ? ' is-on' : '')}" title="Favorite song">
            ${(findSongIdx(t.url) >= 0 ? '★' : '☆')}
          </button>
          <div class="tnum">${i + 1}</div>
          <div class="tname">${t.title}</div>
        </div>
        <div class="tlen">${t.length}</div>
        <div class="progressBar" id="pb-${i}"></div>
      </div>
    `).join(''));
    trackEls = Array.from(document.querySelectorAll('.track'));

    // wire player context
    useShowForPlayer({ showId: currentShowId, date, location, band, title });
    setTrackList(trackList);

    content.onclick = (ev) => {
      const fav = ev.target.closest('.songFav');
      if (fav) {
        const row = ev.target.closest('.track'); if (!row) return;
        const idx = Number(row.dataset.i);
        const song = { ...trackList[idx], showId: currentShowId, date, location, band, showTitle: title };
        toggleFavSong(song);
        fav.textContent = (findSongIdx(song.url) >= 0 ? '★' : '☆');
        fav.classList.toggle('is-on', findSongIdx(song.url) >= 0);
        return;
      }
      const row = ev.target.closest('.track');
      if (!row) return;
      const i = Number(row.dataset.i);
      playIndex(i);
    };

    // autoplay if flagged
    if (store.get('autoPlayOnLoad', false)) {
      store.set('autoPlayOnLoad', false);
      playIndex(0);
    }

    // jump to a remembered URL (from now-playing)
    const jumpUrl = store.get('jumpToUrl', null);
    if (jumpUrl) {
      store.set('jumpToUrl', null);
      const idx = trackList.findIndex(t => t.url === jumpUrl);
      if (idx >= 0) {
        playIndex(idx);
        const el = document.querySelector(`.track[data-i="${idx}"]`);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          el.classList.add('pulse');
          setTimeout(() => el.classList.remove('pulse'), 1800);
        }
      }
    }
  } catch {
    setHTML(content, `
      <div class="card">
        <div class="retryWrap">
          <span class="small">Network error while loading tracks.</span>
          <button class="btn" id="retryShow">Retry</button>
        </div>
      </div>
    `);
    document.getElementById('retryShow')?.addEventListener('click', () => onRoute([currentShowId]));
  }
}

on('show', onRoute);
/* ==== js/routes/favorites.js ==== */
// /favorites redirects
on('favorites', () => { location.hash = '#/favorites/bands'; });
on('fav', () => { location.hash = '#/favorites/bands'; });

// Bands
on('favorites/bands', () => {
  document.getElementById('toolbar-bands').style.display = 'none';
  document.getElementById('toolbar-band').style.display = 'none';
  document.getElementById('showMeta').style.display = 'none';
  document.getElementById('subHeader').classList.remove('show');

  const content = document.getElementById('content');
  content.className = 'bandsGrid favGrid';
  const bands = favBands();

  if (!bands.length) {
    setHTML(content, `<div class="card"><span class="small">No favorite bands yet.</span></div>`);
    return;
  }

  setHTML(content, bands.map(id => `
    <div class="bandTile fav" data-id="${id}">
      <img src="${IA.imgUrl(id)}" alt="${id}">
      <div class="bandTitle">${id}</div>
      <button class="starBtn is-on" data-toggle="${id}" title="Favorite">★</button>
    </div>
  `).join(''));

  content.onclick = (e) => {
    const star = e.target.closest('.starBtn');
    if (star) {
      const id = star.getAttribute('data-toggle');
      toggleFavBand(id);
      // refresh
      location.hash = '#/favorites/bands';
      return;
    }
    const tile = e.target.closest('.bandTile');
    if (tile) location.hash = '#/band/' + encodeURIComponent(tile.dataset.id);
  };
});

// Concerts
on('favorites/concerts', async () => {
  document.getElementById('toolbar-bands').style.display = 'none';
  document.getElementById('toolbar-band').style.display = 'none';
  document.getElementById('showMeta').style.display = 'none';
  document.getElementById('subHeader').classList.remove('show');

  const content = document.getElementById('content');
  content.className = 'grid';

  const ids = favShows();

  const actions = document.createElement('div');
  actions.className = 'pageActions';
  actions.innerHTML = `
    <button class="btn" id="favShowsPlayAll">▶️ Play All</button>
    <button class="btn" id="favShowsShuffleAll">🔀 Shuffle All</button>
  `;
  content.innerHTML = '';
  content.appendChild(actions);

  if (!ids.length) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.innerHTML = `<span class="small">No favorite concerts yet.</span>`;
    content.appendChild(empty);
    return;
  }

  try {
    const batchSize = 40;
    let docs = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const { data } = await iaFetchJSON(IA.concertsByIds(batch), { retries: 2, timeoutMs: 15000 });
      docs = docs.concat((data?.response?.docs) || []);
    }

    if (!docs.length) {
      ids.forEach(id => {
        const card = document.createElement('div');
        card.className = 'card fav';
        card.innerHTML = `
          <div>
            <h3 class="title">${id}</h3>
            <div class="small">Favorite Concert</div>
          </div>
          <div class="row">
            <button class="btn" data-open="${id}">Open</button>
            <button class="btn ghost is-on" data-unfav="${id}" title="Remove">★</button>
          </div>
        `;
        content.appendChild(card);
      });
    } else {
      content.insertAdjacentHTML('beforeend', docs.map(it => {
        const dateStr = it.date ? new Date(it.date).toLocaleDateString() : (it.year || '');
        const reviews = it.num_reviews || 0;
        const venueLine = [it.venue, it.coverage].filter(Boolean).join(', ');
        const viewsChip = `<span class="chip">${fmtCompact(it.downloads || 0)} views</span>`;
        return `
          <div class="card tap fav" data-id="${it.identifier}">
            <div>
              <h3 class="title">${it.title || it.identifier}</h3>
              <div class="row">
                <span class="chip">${dateStr}</span>
                ${viewsChip}
                ${renderStars(it.avg_rating || 0)}
                <span class="small">(${reviews})</span>
              </div>
              <div class="small">${venueLine}</div>
            </div>
            <div class="row">
              <button class="btn ghost favToggle is-on" title="Favorite">★</button>
            </div>
          </div>
        `;
      }).join(''));
    }

    // play/shuffle (per-concert queue feature can be filled later)
    document.getElementById('favShowsPlayAll').onclick = () => {
      // simple: open first show and autoplay
      store.set('autoPlayOnLoad', true);
      location.hash = '#/show/' + encodeURIComponent(ids[0]);
    };
    document.getElementById('favShowsShuffleAll').onclick = () => {
      const arr = ids.slice();
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      store.set('autoPlayOnLoad', true);
      location.hash = '#/show/' + encodeURIComponent(arr[0]);
    };

    content.onclick = (e) => {
      const card = e.target.closest('.card.tap');
      if (e.target.closest('.favToggle')) {
        const id = card ? card.dataset.id : e.target.getAttribute('data-unfav');
        if (id) {
          toggleFavShow(id);
          location.hash = '#/favorites/concerts';
        }
        return;
      }
      if (card) {
        store.set('cameFrom', 'favorites-concerts');
        location.hash = '#/show/' + encodeURIComponent(card.dataset.id);
        return;
      }
      const open = e.target.getAttribute('data-open');
      if (open) {
        store.set('cameFrom', 'favorites-concerts');
        location.hash = '#/show/' + encodeURIComponent(open);
        return;
      }
      const unf = e.target.getAttribute('data-unfav');
      if (unf) { toggleFavShow(unf); location.hash = '#/favorites/concerts'; return; }
    };
  } catch {
    const err = document.createElement('div');
    err.className = 'card';
    err.innerHTML = `<span class="small">Failed to load favorite concerts.</span>`;
    content.appendChild(err);
  }
});

// Songs
on('favorites/songs', () => {
  document.getElementById('toolbar-bands').style.display = 'none';
  document.getElementById('toolbar-band').style.display = 'none';
  document.getElementById('showMeta').style.display = 'none';
  document.getElementById('subHeader').classList.remove('show');

  const content = document.getElementById('content');
  content.className = 'tracks';
  const songs = favSongs();

  const actions = document.createElement('div');
  actions.className = 'pageActions';
  actions.innerHTML = `
    <button class="btn" id="favSongsPlayAll">▶️ Play All</button>
    <button class="btn" id="favSongsShuffleAll">🔀 Shuffle All</button>
  `;
  content.innerHTML = '';
  content.appendChild(actions);

  if (!songs.length) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.innerHTML = `<span class="small">No favorite songs yet.</span>`;
    content.appendChild(empty);
    return;
  }

  const listWrap = document.createElement('div');
  listWrap.className = 'tracks';
  listWrap.style.padding = '0 12px 120px';
  listWrap.innerHTML = songs.map((t, i) => `
    <div class="track favsong" data-i="${i}">
      <div class="line1">
        <div class="tleft">
          <button class="songFav is-on" title="Unfavorite">★</button>
          <div class="tnum">${i + 1}</div>
          <div class="tname">${t.title}</div>
        </div>
        ${t.band ? `<span class="pill pill-sm bandpill">${t.band}</span>` : ''}
      </div>
      <div class="line2">
        ${t.location ? (t.showId ? `<a class="pill pill-sm locpill" href="#/show/${encodeURIComponent(t.showId)}">${t.location}</a>` : `<span class="pill pill-sm locpill">${t.location}</span>`) : ''}
        ${t.date ? `<span class="pill pill-sm datepill">${t.date}</span>` : ''}
      </div>
      <div class="progressBar" id="pb-${i}"></div>
    </div>
  `).join('');
  content.appendChild(listWrap);

  document.getElementById('favSongsPlayAll').onclick = () => {
    const list = songs.map(s => ({ url: s.url, title: s.title, length: '' }));
    playListStartingAt(list, 0, songs, { showId: 'favorites_songs', band: songs[0]?.band || '' });
  };
  document.getElementById('favSongsShuffleAll').onclick = () => {
    const meta = songs.slice();
    for (let i = meta.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [meta[i], meta[j]] = [meta[j], meta[i]]; }
    const list = meta.map(s => ({ url: s.url, title: s.title, length: '' }));
    playListStartingAt(list, 0, meta, { showId: 'favorites_songs', band: meta[0]?.band || '' });
  };

  listWrap.onclick = (e) => {
    const a = e.target.closest('a[href^="#/show/"]');
    if (a) { // allow navigation
      const row = e.target.closest('.track');
      if (row) {
        const i = Number(row.dataset.i);
        const t = songs[i];
        if (t?.url) store.set('jumpToUrl', t.url);
        store.set('cameFrom', 'favorites-songs');
      }
      return;
    }
    const row = e.target.closest('.track'); if (!row) return;
    const i = Number(row.dataset.i);
    const list = songs.map(s => ({ url: s.url, title: s.title, length: '' }));
    playListStartingAt(list, i, songs, { showId: 'favorites_songs', band: songs[i]?.band || '' });
  };
});
/* ==== js/routes/recent.js ==== */
on('recent', () => {
  document.getElementById('toolbar-bands').style.display = 'none';
  document.getElementById('toolbar-band').style.display = 'none';
  document.getElementById('showMeta').style.display = 'none';
  document.getElementById('subHeader').classList.remove('show');

  const content = document.getElementById('content');
  content.className = 'tracks';

  const songs = recentSongs();

  const actions = document.createElement('div');
  actions.className = 'pageActions';
  actions.innerHTML = `
    <button class="btn" id="recentPlayAll">▶️ Play All</button>
    <button class="btn" id="recentShuffleAll">🔀 Shuffle All</button>
  `;
  content.innerHTML = '';
  content.appendChild(actions);

  if (!songs.length) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.innerHTML = `<span class="small">No recent plays yet.</span>`;
    content.appendChild(empty);
    return;
  }

  const listWrap = document.createElement('div');
  listWrap.className = 'tracks';
  listWrap.style.padding = '0 12px 120px';
  listWrap.innerHTML = songs.map((t, i) => `
    <div class="track favsong" data-i="${i}">
      <div class="line1">
        <div class="tleft">
          <button class="songFav${(findSongIdx(t.url) >= 0 ? ' is-on' : '')}" title="${findSongIdx(t.url) >= 0 ? 'Unfavorite' : 'Favorite'}">
            ${(findSongIdx(t.url) >= 0 ? '★' : '☆')}
          </button>
          <div class="tnum">${i + 1}</div>
          <div class="tname">${t.title}</div>
        </div>
        ${t.band ? `<span class="pill pill-sm bandpill">${t.band}</span>` : ''}
      </div>
      <div class="line2">
        ${t.location ? (t.showId ? `<a class="pill pill-sm locpill" href="#/show/${encodeURIComponent(t.showId)}">${t.location}</a>` : `<span class="pill pill-sm locpill">${t.location}</span>`) : ''}
        ${t.date ? `<span class="pill pill-sm datepill">${t.date}</span>` : ''}
      </div>
      <div class="progressBar"></div>
    </div>
  `).join('');
  content.appendChild(listWrap);

  document.getElementById('recentPlayAll').onclick = () => {
    const list = songs.map(s => ({ url: s.url, title: s.title, length: '' }));
    playListStartingAt(list, 0, songs, { showId: 'recent_playlist', band: songs[0]?.band || '' });
  };
  document.getElementById('recentShuffleAll').onclick = () => {
    const meta = songs.slice();
    for (let i = meta.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [meta[i], meta[j]] = [meta[j], meta[i]]; }
    const list = meta.map(s => ({ url: s.url, title: s.title, length: '' }));
    playListStartingAt(list, 0, meta, { showId: 'recent_playlist', band: meta[0]?.band || '' });
  };

  listWrap.onclick = (e) => {
    const link = e.target.closest('a[href^="#/show/"]');
    if (link) {
      const row = e.target.closest('.track');
      if (row) {
        const i = Number(row.dataset.i);
        const t = songs[i];
        if (t?.url) localStorage.setItem('jumpToUrl', JSON.stringify(t.url));
      }
      // let hash navigation proceed
      return;
    }
    const tr = e.target.closest('.track');
    if (!tr) return;
    const i = Number(tr.dataset.i);
    if (e.target.closest('.songFav')) {
      const t = songs[i];
      toggleFavSong(t);
      e.target.textContent = (findSongIdx(t.url) >= 0 ? '★' : '☆');
      e.target.classList.toggle('is-on', findSongIdx(t.url) >= 0);
      e.target.title = (findSongIdx(t.url) >= 0 ? 'Unfavorite' : 'Favorite');
      return;
    }
    const list = songs.map(s => ({ url: s.url, title: s.title, length: '' }));
    playListStartingAt(list, i, songs, { showId: 'recent_playlist', band: songs[i]?.band || '' });
  };
});
/* ==== js/routes/onthisday.js ==== */
async function fetchOnThisDayForBand(bandId, mm, dd) {
  const url = IA.onThisDayV1({ bandId, mm, dd, rows: 400, sort: 'date desc' });
  const favVer = store.get('favVersion', 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = `onthisday:v1:${bandId}:${mm}-${dd}:${todayKey}:fv${favVer}`;
  const { data } = await iaFetchJSON(url, { cacheKey, retries: 2, timeoutMs: 15000 });

  const items = Array.isArray(data.items) ? data.items : [];
  const wantMD = `${mm}-${dd}`;
  const out = [];

  const pickYmd = (s = '') => {
    const m = /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(String(s).trim());
    return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
  };
  const pickMd = (ymd = '') => (ymd ? `${ymd.slice(5, 7)}-${ymd.slice(8, 10)}` : '');
  const titleHasMd = (t = '') => {
    const S = String(t);
    return S.includes(`-${mm}-${dd}`) || S.includes(`${mm}/${dd}`) || S.includes(`${mm}-${dd}`);
  };

  for (const it of items) {
    const title = it.title || '';
    const metaYMD = pickYmd(it.date || it.publicdate || '');
    const metaMD = pickMd(metaYMD);
    let matchedYMD = '';
    if (metaMD === wantMD) matchedYMD = metaYMD;
    else if (titleHasMd(title)) {
      const m = /(\d{4})[-/](\d{2})[-/](\d{2})/.exec(title);
      matchedYMD = m ? `${m[1]}-${m[2]}-${m[3]}` : (it.year ? `${it.year}-${mm}-${dd}` : '');
    }
    if (!matchedYMD) continue;

    const year = matchedYMD.slice(0, 4) || it.year || '';
    out.push({
      id: it.identifier,
      title,
      date: matchedYMD,
      downloads: it.downloads || 0,
      rating: it.avg_rating || 0,
      reviews: it.num_reviews || 0,
      venue: it.venue || '',
      coverage: it.coverage || '',
      band: it.creator || decodeURIComponent(bandId).replace(/[_+]+/g, ' ').trim(),
      year
    });
  }

  out.sort((a, b) => (String(b.year).localeCompare(String(a.year)) || (b.downloads - a.downloads)));
  return out;
}

on('onthisday', async () => {
  document.getElementById('toolbar-bands').style.display = 'none';
  document.getElementById('toolbar-band').style.display = 'none';
  document.getElementById('showMeta').style.display = 'none';
  document.getElementById('subHeader').classList.remove('show');

  const content = document.getElementById('content');
  content.className = 'grid';
  setHTML(content, `<div class="card"><span class="small">Loading shows for this date…</span></div>`);

  const favs = favBands();
  if (!favs.length) {
    setHTML(content, `<div class="card"><span class="small">No shows found for your favorite bands on this date.</span></div>`);
    return;
  }

  const { mm, dd } = todayMMDD();
  let rows = [];
  for (const id of favs) {
    try {
      const r = await fetchOnThisDayForBand(id, mm, dd);
      rows.push(...r);
    } catch {}
  }
  rows.sort((a, b) => (String(b.year).localeCompare(String(a.year)) || (b.downloads - a.downloads)));

  if (!rows.length) {
    setHTML(content, `<div class="card"><span class="small">No shows found for your favorite bands on this date.</span></div>`);
    return;
  }

  setHTML(content, rows.map(it => {
    let dateStr = '';
    if (it.date && /^\d{4}-\d{2}-\d{2}/.test(it.date)) {
      const y = it.date.slice(0, 4), m = it.date.slice(5, 7), d = it.date.slice(8, 10);
      dateStr = `${Number(m)}/${Number(d)}/${y}`;
    } else {
      dateStr = it.year || '';
    }
    const venueLine = [it.venue, it.coverage].filter(Boolean).join(', ');
    const viewsChip = `<span class="chip">${fmtCompact(it.downloads)} views</span>`;
    const favOn = isFavShow(it.id);
    return `
      <div class="card tap" data-id="${it.id}">
        <div>
          <h3>${it.title}</h3>
          <div class="row">
            <span class="chip">${dateStr}</span>
            <span class="chip">${it.band}</span>
            ${viewsChip}
            ${renderStars(it.rating)}
            <span class="small">(${it.reviews})</span>
          </div>
          <div class="small">${venueLine}</div>
        </div>
        <div class="row">
          <button class="btn ghost favToggle${favOn ? ' is-on' : ''}" title="Favorite">${favOn ? '★' : '☆'}</button>
        </div>
      </div>
    `;
  }).join(''));

  content.onclick = (e) => {
    const favBtn = e.target.closest('.favToggle');
    const card = e.target.closest('.card.tap');
    if (favBtn && card) {
      const id = card.dataset.id;
      toggleFavShow(id);
      favBtn.classList.toggle('is-on', isFavShow(id));
      favBtn.textContent = isFavShow(id) ? '★' : '☆';
      return;
    }
    if (card) {
      store.set('cameFrom', 'onthisday');
      location.hash = '#/show/' + encodeURIComponent(card.dataset.id);
    }
  };
});
/* ==== js/app.js ==== */
// Routes (they self-register with Router.on)






// Status banner button
$('#statusRetryBtn')?.addEventListener('click', () => location.reload());

// Drawer
const drawer = $('#drawer');
const drawerBack = $('#drawerBack');
function closeDrawer(){ drawer.classList.remove('open'); drawerBack.classList.remove('open'); }
$('#hamburger').addEventListener('click', ()=>{ drawer.classList.add('open'); drawerBack.classList.add('open'); });
$('#drawerClose').addEventListener('click', closeDrawer);
drawerBack.addEventListener('click', closeDrawer);
$$('.drawer .menuItem').forEach(it => it.addEventListener('click', ()=>{
  const nav = it.getAttribute('data-nav');
  if (nav){ location.hash = nav; closeDrawer(); }
}));

// Header, crumb, subheader toggling
function setHeader(routeName, crumbOverride=null){
  const titleEl = $('#pageTitle');
  const crumbText = crumbOverride ?? (
    routeName==='band' ? '— Concerts' :
    routeName==='show' ? '— Tracks' :
    routeName==='recent' ? '— Recently Played' :
    routeName==='onthisday' ? '— This Day in History' :
    (routeName==='fav' || routeName==='favorites' ? '— Favorites' :
      (routeName?.startsWith('favorites/') ? '— Favorites' :
        (routeName==='playlist' ? '— Playlist' : '— Bands')))
  );
  titleEl.innerHTML = `Setlist Streamer <span class="crumb">${crumbText}</span>`;

  const actions = $('#headerActions');
  actions.innerHTML = '';
  if (routeName === 'band'){
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.title = 'Back';
    btn.textContent = '← Bands';
    btn.onclick = () => { location.hash = '#/bands'; };
    actions.appendChild(btn);
  } else if (routeName === 'show'){
    const cameFrom = State.get('cameFrom', '');
    let backLabel = '← Concerts';
    let backHash = '';
    if (cameFrom === 'favorites-songs'){ backLabel = '← Favorite Songs'; backHash = '#/favorites/songs'; }
    else if (cameFrom === 'favorites-concerts'){ backLabel = '← Favorite Concerts'; backHash = '#/favorites/concerts'; }
    else if (cameFrom === 'recent'){ backLabel = '← Recently Played'; backHash = '#/recent'; }
    else if (cameFrom === 'band'){ backLabel = '← Concerts'; backHash = ''; }
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.title = 'Back';
    btn.textContent = backLabel;
    btn.onclick = ()=>{ backHash ? (location.hash = backHash) : history.back(); };
    actions.appendChild(btn);
  }
  $('#subHeader').classList.toggle('show', routeName==='band');
}

// Route changes → update header
window.addEventListener('routechange', (e)=>{
  const { name, key } = e.detail;
  let crumbOverride = null;
  if (key === 'favorites/bands') crumbOverride = '— Favorite Bands';
  else if (key === 'favorites/concerts') crumbOverride = '— Favorite Concerts';
  else if (key === 'favorites/songs') crumbOverride = '— Favorite Songs';
  setHeader(name, crumbOverride);
});

// Bands toolbar (global listeners simply re-route)
$('#sortSel')?.addEventListener('change', ()=> Router.route());
$('#searchBox')?.addEventListener('change', ()=> Router.route());
$('#favToggle')?.addEventListener('click', ()=>{
  const on = !($('#favToggle').classList.contains('is-on'));
  $('#favToggle').textContent = on ? '★ Favorites' : '☆ Favorites';
  $('#favToggle').classList.toggle('is-on', on);
  Router.route();
});
$('#resetBtn')?.addEventListener('click', ()=>{
  $('#sortSel').value='downloads desc';
  $('#searchBox').value='';
  $('#favToggle').textContent='☆ Favorites';
  $('#favToggle').classList.remove('is-on');
  location.hash='#/bands';
  Router.route();
});

// SW optional
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// Init
window.addEventListener('hashchange', Router.route);
window.addEventListener('DOMContentLoaded', () => {
  Player.initEQ(); // initialize EQ paused state icon
  Router.route();
});
// End merged files; DOMContentLoaded hooks remain functional.
})();
