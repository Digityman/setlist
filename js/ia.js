// Archive.org helpers: resilient fetch + URL builders + small status banner API
import { show, hide } from './ui.js';

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
