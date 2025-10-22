/* app.js v3.7.2 - single bundle */
(function(){
  'use strict';

  const APP_VERSION = '3.7.2';
  const CACHE_KEY = 'setlist-cache-' + APP_VERSION;

  // ===== 1) Helpers =====
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  function show(el,on=true){ if(!el) return; el.style.display = on ? '' : 'none'; }
  function setHTML(el, html){ if(el) el.innerHTML = html; }
  function fmtTime(secs){
    secs = Math.max(0, Math.floor(secs||0));
    const m = Math.floor(secs/60), s = secs%60;
    return m + ":" + String(s).padStart(2,"0");
  }
  function fmtCompact(n){
    n = Number(n||0);
    if(n >= 1e9) return (n/1e9).toFixed(1)+'B';
    if(n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if(n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return String(n);
  }
  function byDateKey(iso){ // YYYY-MM-DD
    if(!iso) return '';
    const [y,m,d] = iso.split('-').map(x=>parseInt(x,10));
    return String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
  }

  // Drawer toggle
  window.addEventListener('DOMContentLoaded', () => {
    const drawer = $('#drawer');
    $('#menuBtn')?.addEventListener('click', ()=> drawer?.classList.add('open'));
    $('#drawerClose')?.addEventListener('click', ()=> drawer?.classList.remove('open'));
    drawer?.addEventListener('click', (e)=>{
      if(e.target.tagName === 'A') drawer.classList.remove('open');
    });
  });

  // ===== 2) State & config =====
  const State = {
    currentRoute: '',
    currentBand: null,
    currentShow: null,
    currentList: [],     // active playlist context
    currentIndex: -1,
    audio: null,
  };

  // ===== 3) IA fetch with JSONP fallback =====
  async function fetchJSON(url){
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }

  async function iaFetchJSON(url){
    try{
      return await fetchJSON(url);
    }catch(err){
      return new Promise((resolve, reject)=>{
        const cb = 'ia_cb_' + Math.random().toString(36).slice(2);
        const s = document.createElement('script');
        const cleanup = ()=>{ try{ delete window[cb]; }catch{}; s.remove(); };
        window[cb] = (data)=>{ cleanup(); resolve(data); };
        s.onerror = ()=>{ cleanup(); reject(err); };
        s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
        document.head.appendChild(s);
      });
    }
  }

  // IA utilities
  function iaQuery(collection, q, sorts='downloads desc', rows=50, page=1){
    // Example advanced search endpoint (JSON)
    const base = 'https://archive.org/advancedsearch.php';
    const query = encodeURIComponent(`collection:${collection} ${q||''}`.trim());
    const fields = ['identifier','title','date','creator','publicdate','mediatype'].join(',');
    const url = `${base}?q=${query}&fl[]=${fields}&sort[]=${encodeURIComponent(sorts)}&rows=${rows}&page=${page}&output=json`;
    return iaFetchJSON(url);
  }

  // ===== 4) Storage =====
  const Storage = {
    get(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def; }catch{ return def; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
    favorites(){ return Storage.get('favorites', { bands:[], concerts:[], songs:[] }); },
    saveFavorites(f){ Storage.set('favorites', f); },
    recents(){ return Storage.get('recents', []); },
    saveRecents(r){ Storage.set('recents', r); },
  };

  // ===== 5) Router =====
  const Routes = {
    '': renderHome,
    '#/bands': renderBands,
    '#/band': renderBand,          // #/band/:id
    '#/show': renderShow,          // #/show/:id
    '#/favorites': renderFavorites,
    '#/playlist/fav-songs': renderFavSongs,
    '#/recent': renderRecent,
    '#/thisday': renderThisDay,
  };

  function onHashChange(){
    const hash = location.hash || '';
    State.currentRoute = hash;
    if(hash.startsWith('#/band/')) return renderBand(hash.split('/')[2]);
    if(hash.startsWith('#/show/')) return renderShow(hash.split('/')[2]);
    if(Routes[hash]) return Routes[hash]();
    return renderHome();
  }

  // ===== 6) Player =====
  const Player = {
    ensureAudio(){
      if(!State.audio){
        State.audio = new Audio();
        State.audio.preload = 'metadata';
        State.audio.addEventListener('timeupdate', ()=> updateTime());
        State.audio.addEventListener('ended', ()=> next());
        if('mediaSession' in navigator){
          navigator.mediaSession.setActionHandler('play', ()=>State.audio.play());
          navigator.mediaSession.setActionHandler('pause', ()=>State.audio.pause());
          navigator.mediaSession.setActionHandler('previoustrack', ()=> prev());
          navigator.mediaSession.setActionHandler('nexttrack', ()=> next());
        }
        // Wire buttons
        $('#playPauseBtn')?.addEventListener('click', ()=>{
          if(State.audio.paused) State.audio.play(); else State.audio.pause();
        });
        $('#prevBtn')?.addEventListener('click', prev);
        $('#nextBtn')?.addEventListener('click', next);
      }
      return State.audio;
    },
    play(item){ // {url,title,artist,album,artwork}
      const a = Player.ensureAudio();
      if(!item?.url) return;
      a.src = item.url;
      a.play().catch(()=>{});
      $('#nowPlaying').textContent = item.title || 'Track';
      if('mediaSession' in navigator){
        navigator.mediaSession.metadata = new MediaMetadata({
          title: item.title || 'Track',
          artist: item.artist || '',
          album: item.album || '',
          artwork: item.artwork || []
        });
      }
    }
  };

  function updateTime(){
    const a = State.audio;
    if(!a) return;
    $('#time').textContent = fmtTime(a.currentTime||0);
  }
  function prev(){
    if(State.currentList.length < 1) return;
    State.currentIndex = Math.max(0, State.currentIndex - 1);
    Player.play(State.currentList[State.currentIndex]);
  }
  function next(){
    if(State.currentList.length < 1) return;
    State.currentIndex = Math.min(State.currentList.length - 1, State.currentIndex + 1);
    Player.play(State.currentList[State.currentIndex]);
  }

  // ===== 7) UI renderers =====
  async function renderHome(){
    const el = $('#app');
    setHTML(el, `
      <div class="grid">
        <div class="card">
          <h3>Quick Links</h3>
          <div class="row wrap">
            <a class="badge" href="#/bands">Bands</a>
            <a class="badge" href="#/favorites">Favorites</a>
            <a class="badge" href="#/playlist/fav-songs">Fav Songs</a>
            <a class="badge" href="#/thisday">This Day in History</a>
            <a class="badge" href="#/recent">Recent</a>
          </div>
        </div>
        <div class="card">
          <h3>This Day in History</h3>
          <div id="tdih">Loading…</div>
        </div>
      </div>
    `);
    // Quick TDIH preview (Grateful Dead example collection "etree" title:-MM-DD)
    const today = new Date();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    // Search titles containing "-MM-DD"
    const q = `title:"-${mm}-${dd}"`;
    try{
      const data = await iaQuery('etree', q, 'downloads desc', 12, 1);
      const docs = data?.response?.docs || [];
      $('#tdih').innerHTML = docs.slice(0,6).map(d => `
        <div class="small">
          <a href="#/show/${encodeURIComponent(d.identifier)}">${d.title || d.identifier}</a>
        </div>
      `).join('') || '<div class="small">No matches today.</div>';
    }catch{
      $('#tdih').textContent = 'Error loading.';
    }
  }

  async function renderBands(){
    const el = $('#app');
    setHTML(el, `
      <div class="row"><input id="bandSearch" type="search" placeholder="Search bands (Archive.org etree)…"></div>
      <div class="list" id="bandList"></div>
    `);
    const input = $('#bandSearch');
    input.addEventListener('input', async ()=>{
      const term = input.value.trim();
      if(!term){ $('#bandList').innerHTML = ''; return; }
      const data = await iaQuery('etree', `creator:"${term}"`, 'downloads desc', 30, 1);
      const docs = data?.response?.docs || [];
      $('#bandList').innerHTML = docs.map(d=>`
        <a href="#/band/${encodeURIComponent(d.creator || term)}">
          ${d.creator || term} <span class="small">(${d.title || d.identifier})</span>
        </a>
      `).join('');
    });
  }

  async function renderBand(bandName){
    const el = $('#app');
    const name = decodeURIComponent(bandName||'');
    setHTML(el, `<h2>${name}</h2><div class="list" id="shows">Loading…</div>`);
    // List shows by title for this band
    const data = await iaQuery('etree', `creator:"${name}"`, 'date desc', 100, 1);
    const docs = data?.response?.docs || [];
    $('#shows').innerHTML = docs.map(d=>{
      const date = d.date || (d.title?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '');
      return `<a href="#/show/${encodeURIComponent(d.identifier)}">${d.title || d.identifier} <span class="small">${date}</span></a>`;
    }).join('') || '<div class="small">No shows found.</div>';
  }

  async function renderShow(identifier){
    const el = $('#app');
    const id = decodeURIComponent(identifier||'');
    setHTML(el, `<div class="card"><h3>${id}</h3><div id="tracks">Loading…</div></div>`);
    // Fetch the files list via metadata API (details JSON)
    try{
      const meta = await iaFetchJSON(`https://archive.org/metadata/${encodeURIComponent(id)}`);
      const files = meta?.files || [];
      const audio = files.filter(f => /\.mp3$|\.ogg$|\.flac$/i.test(f.name));
      const list = audio.map((f, idx)=>{
        // best-effort title
        const base = f.title || f.name.replace(/\.(mp3|ogg|flac)$/i,'');
        const url = `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(f.name)}`;
        return { url, title: base, artist: meta?.metadata?.creator || '', album: meta?.metadata?.title || id };
      });
      State.currentList = list;
      State.currentIndex = 0;
      $('#tracks').innerHTML = list.map((t,i)=>`
        <a href="javascript:void(0)" data-i="${i}">${String(i+1).padStart(2,'0')}. ${t.title}</a>
      `).join('');
      $('#tracks').addEventListener('click', (e)=>{
        const a = e.target.closest('a[data-i]'); if(!a) return;
        State.currentIndex = parseInt(a.dataset.i,10);
        Player.play(State.currentList[State.currentIndex]);
      });
    }catch(e){
      $('#tracks').innerHTML = '<div class="small">Failed to load tracks.</div>';
    }
  }

  function renderFavorites(){
    const el = $('#app');
    const fav = Storage.favorites();
    setHTML(el, `
      <div class="grid">
        <div class="card"><h3>Favorite Bands</h3>${
          fav.bands.length ? fav.bands.map(b=>`<div>${b}</div>`).join('') : '<div class="small">None yet.</div>'
        }</div>
        <div class="card"><h3>Favorite Concerts</h3>${
          fav.concerts.length ? fav.concerts.map(id=>`<div><a href="#/show/${encodeURIComponent(id)}">${id}</a></div>`).join('') : '<div class="small">None yet.</div>'
        }</div>
        <div class="card"><h3>Favorite Songs</h3>
          <div class="small"><a href="#/playlist/fav-songs">Open as playlist</a></div>
          ${
            fav.songs.length ? fav.songs.map(s=>`<div>${s.title || s}</div>`).join('') : '<div class="small">None yet.</div>'
          }
        </div>
      </div>
    `);
  }

  function renderFavSongs(){
    const el = $('#app');
    const fav = Storage.favorites();
    // Expect songs like { url, title, artist, album }
    const songs = (fav.songs || []).filter(s => s && s.url);
    State.currentList = songs;
    State.currentIndex = 0;
    setHTML(el, `
      <div class="card">
        <h3>Favorite Songs (${songs.length})</h3>
        <div id="favSongs" class="list">
          ${songs.map((s,i)=>`<a href="javascript:void(0)" data-i="${i}">${String(i+1).padStart(2,'0')}. ${s.title || 'Track'}</a>`).join('') || '<div class="small">No favorite songs.</div>'}
        </div>
      </div>
    `);
    $('#favSongs')?.addEventListener('click', (e)=>{
      const a = e.target.closest('a[data-i]'); if(!a) return;
      State.currentIndex = parseInt(a.dataset.i,10);
      Player.play(State.currentList[State.currentIndex]);
    });
  }

  function renderRecent(){
    const el = $('#app');
    const recent = Storage.recents();
    setHTML(el, `
      <div class="card">
        <h3>Recently Played</h3>
        <div class="list">
          ${recent.map(r=>`<div>${r.title || r.url}</div>`).join('') || '<div class="small">Nothing yet.</div>'}
        </div>
      </div>
    `);
  }

  async function renderThisDay(){
    const el = $('#app');
    const today = new Date();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    const q = `title:"-${mm}-${dd}"`;
    setHTML(el, `<div class="card"><h3>Concerts on ${mm}/${dd} (any year)</h3><div id="tdihList">Loading…</div></div>`);
    try{
      const data = await iaQuery('etree', q, 'date desc', 100, 1);
      const docs = data?.response?.docs || [];
      // normalize date display from title or date
      $('#tdihList').innerHTML = docs.map(d=>{
        const guess = d.date || (d.title?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '');
        return `<a href="#/show/${encodeURIComponent(d.identifier)}">${d.title || d.identifier} <span class="small">${guess}</span></a>`;
      }).join('') || '<div class="small">No matches.</div>';
    }catch{
      $('#tdihList').textContent = 'Error loading.';
    }
  }

  // ===== 8) Bootstrap =====
  function start(){
    window.addEventListener('hashchange', onHashChange);
    onHashChange(); // initial
  }
  window.addEventListener('DOMContentLoaded', start);
})();
