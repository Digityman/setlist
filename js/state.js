export function get(k, f){ try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;} }
export function set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

// Favorites
export const favBands = ()=> get('favBands', []);
export const setFavBands = (arr)=> set('favBands', arr);
export function toggleFavBand(bandId){
  const arr = favBands();
  const i = arr.indexOf(bandId);
  if (i >= 0) arr.splice(i, 1); else arr.push(bandId);
  setFavBands(arr);
  set('favVersion', Date.now());
}

export const favShows = ()=> get('favShows', []);
export const isFavShow = (id)=> favShows().includes(id);
export function toggleFavShow(id){
  const fav = favShows();
  const i=fav.indexOf(id);
  if(i>=0) fav.splice(i,1); else fav.push(id);
  set('favShows', fav);
}

export const favSongs = ()=> get('favSongs', []);
export function findSongIdx(url){ return favSongs().findIndex(s=>s.url===url); }
export function toggleFavSong(song){
  const arr = favSongs();
  const i = arr.findIndex(s=>s.url===song.url);
  if(i>=0) arr.splice(i,1); else arr.push(song);
  set('favSongs', arr);
}

// Recently played
export const recentSongs = ()=> get('recentSongs', []);
export function pushRecent(song){
  const arr = recentSongs();
  const i = arr.findIndex(s => s.url === song.url);
  if (i >= 0) arr.splice(i, 1);
  arr.unshift({ ...song, ts: Date.now() });
  if (arr.length > 100) arr.length = 100;
  set('recentSongs', arr);
}
