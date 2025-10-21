// Audio player wiring + media session
import { pushRecent, store } from './state.js';

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
