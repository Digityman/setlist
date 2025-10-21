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

  if (!onlyFavConcerts && state.list.length < s
