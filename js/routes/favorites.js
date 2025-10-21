import { on } from '../router.js';
import { IA, iaFetchJSON } from '../ia.js';
import { setHTML, renderStars, fmtCompact } from '../ui.js';
import { store, favBands, toggleFavBand, favShows, toggleFavShow, favSongs } from '../state.js';
import { playListStartingAt } from '../player.js';

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
