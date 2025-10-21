import { on } from '../router.js';
import { setHTML } from '../ui.js';
import { recentSongs, findSongIdx, toggleFavSong } from '../state.js';
import { playListStartingAt } from '../player.js';

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
