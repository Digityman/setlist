import { on } from '../router.js';
import { IA, iaFetchJSON } from '../ia.js';
import { setHTML } from '../ui.js';
import { store, favShows, toggleFavShow, findSongIdx, toggleFavSong } from '../state.js';
import { playIndex, setTrackList, useShowForPlayer } from '../player.js';

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
