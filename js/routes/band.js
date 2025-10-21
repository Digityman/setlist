import { on } from '../router.js';
import { IA, iaFetchJSON } from '../ia.js';
import { setHTML, renderStars, fmtCompact } from '../ui.js';
import { store, favShows, toggleFavShow, favBands, toggleFavBand } from '../state.js';

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
