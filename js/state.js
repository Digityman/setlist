// Local storage helpers: simple typed getters/setters + app state
export const store = {
  get(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

// band title cache (for favorites grid)
export function bandTitleFromCache(id) {
  const map = store.get('bandTitleMap', {}) || {};
  return map[id] || decodeURIComponent(id).replace(/[_+]+/g, ' ').trim();
}

// Favorites: bands
export function favBands() { return store.get('favBands', []); }
export function toggleFavBand(id) {
  const arr = favBands();
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  store.set('favBands', arr);
  store.set('favVersion', Date.now()); // bump version for on-this-day cache keys
  return arr;
}

// Favorites: shows
export function favShows() { return store.get('favShows', []); }
export function isFavShow(id) { return favShows().includes(id); }
export function toggleFavShow(id) {
  const arr = favShows();
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  store.set('favShows', arr);
  return arr;
}

// Favorites: songs
export function favSongs() { return store.get('favSongs', []); }
export function findSongIdx(url) { return favSongs().findIndex(s => s.url === url); }
export function toggleFavSong(song) {
  const arr = favSongs();
  const i = arr.findIndex(s => s.url === song.url);
  if (i >= 0) arr.splice(i, 1); else arr.push(song);
  store.set('favSongs', arr);
  return arr;
}

// Recently played
export function recentSongs() { return store.get('recentSongs', []); } // [{url,title,date,location,band,showTitle,showId,ts}]
export function pushRecent(song) {
  const arr = recentSongs();
  const i = arr.findIndex(s => s.url === song.url);
  if (i >= 0) arr.splice(i, 1);
  arr.unshift({ ...song, ts: Date.now() });
  if (arr.length > 100) arr.length = 100;
  store.set('recentSongs', arr);
  return arr;
}

export function parseShowIdFromUrl(url = '') {
  try { const m = /archive\.org\/download\/([^/]+)\//i.exec(url); return m ? decodeURIComponent(m[1]) : ''; }
  catch { return ''; }
}
