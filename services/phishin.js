// services/phishin.js
// Phish.in v2 integration (no API key needed)

const PHISH_BASE = 'https://phish.in/api/v2';
const DEFAULT_PAGE_SIZE = 50;
const CACHE_KEY_PREFIX = 'phishin:show:';
const INDEX_KEY = 'phishin:index';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const nowMs = () => Date.now();

async function safeFetch(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Phish API error ${res.status} ${res.statusText} ${t}`);
  }
  return res.json();
}

// Map one phish.in show to your concert object
function normalizeShow(s) {
  return {
    id: `phishin-${s.id || s.slug || s.date}`,
    source: 'phishin',
    source_id: s.id ?? null,
    artist: 'Phish',
    title: s.title || `${s.venue?.name || s.venue_name || 'Unknown'} — ${s.date}`,
    date: s.date || s.show_date,
    venue: {
      name: s.venue?.name || s.venue_name || null,
      city: s.venue?.location?.split(',')?.[0] || s.city || null,
      state: s.venue?.location?.split(',')?.[1]?.trim() || s.state || null,
      country: s.country || null
    },
    tracks: (() => {
      // phish.in typically exposes tracks per show via a nested endpoint,
      // but some responses include a sets/track list. We handle both.
      const sets = s.sets || s.setlist || s.tracks || [];
      let out = [];
      if (Array.isArray(sets) && sets.length && sets[0]?.songs) {
        sets.forEach((set, si) => {
          (set.songs || []).forEach((song, i) => {
            out.push({
              position: out.length + 1,
              title: song.title || song.name,
              set: set.name || `Set ${si + 1}`,
              duration: song.duration || null,
              source_url: song.stream_url || song.fileurl || null
            });
          });
        });
      } else if (Array.isArray(s.tracks)) {
        out = s.tracks.map((t, i) => ({
          position: i + 1,
          title: t.title || t.name,
          duration: t.length || t.duration || null,
          set: t.set || null,
          source_url: t.file || null
        }));
      }
      return out;
    })(),
    meta: { fetched_at: nowMs(), raw: s }
  };
}

// tiny localStorage cache (swap to localforage if you like)
function cacheSet(k, v) { try { localStorage.setItem(k, JSON.stringify({ v, t: nowMs() })); } catch {} }
function cacheGet(k, maxAge = CACHE_TTL_MS) {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw) || {};
    if (t && nowMs() - t > maxAge) { localStorage.removeItem(k); return null; }
    return v ?? null;
  } catch { return null; }
}

async function fetchShowsByYear(year, page = 1, limit = DEFAULT_PAGE_SIZE) {
  // v2 supports paging; filter by year to avoid massive pulls
  const url = `${PHISH_BASE}/shows?year=${encodeURIComponent(year)}&page=${page}&per_page=${limit}`;
  const json = await safeFetch(url);
  // Many APIs return { data: [...], meta: { pagination } }; we accept a few shapes
  return (json?.data || json?.shows || json) ?? [];
}

// Public: load selected years, normalize, and merge into your store
export async function initPhishIn({ years = [1993, 1994, 1995], mergeFn } = {}) {
  if (typeof mergeFn !== 'function') console.warn('initPhishIn: provide mergeFn(concert)');

  const index = cacheGet(INDEX_KEY) || {};
  const seen = new Set(Object.keys(index));

  for (const year of years) {
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
      let shows = [];
      try {
        shows = await fetchShowsByYear(year, page);
      } catch (e) {
        console.warn('phish.in fetch error', e);
        break;
      }

      if (!shows.length) break;

      for (const s of shows) {
        const rawId = String(s.id || s.slug || s.date);
        const id = `phishin-${rawId}`;
        if (seen.has(id)) continue;

        const concert = normalizeShow(s);
        cacheSet(CACHE_KEY_PREFIX + id, concert);
        index[id] = { id, date: concert.date, added: nowMs() };
        seen.add(id);

        try { mergeFn && mergeFn(concert); } catch (e) { console.warn('mergeFn failed', e); }
      }

      keepGoing = shows.length >= DEFAULT_PAGE_SIZE;
      page += 1;
      await new Promise(r => setTimeout(r, 200)); // be polite
    }
  }

  cacheSet(INDEX_KEY, index);
  return true;
}

export function getCachedPhishShow(id) {
  return cacheGet(CACHE_KEY_PREFIX + id, Infinity);
}
