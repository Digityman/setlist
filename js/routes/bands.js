import { on } from '../router.js';
import { IA, iaFetchJSON } from '../ia.js';
import { setHTML } from '../ui.js';
import { store, favBands, toggleFavBand, bandTitleFromCache } from '../state.js';

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
