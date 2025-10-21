import { on } from '../router.js';
import { IA, iaFetchJSON, todayMMDD } from '../ia.js';
import { setHTML, renderStars, fmtCompact } from '../ui.js';
import { favBands, favShows, isFavShow, toggleFavShow, store } from '../state.js';

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
