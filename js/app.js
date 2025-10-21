import { $, $$, show, setHTML } from './ui.js';
import * as Router from './router.js';
import * as IA from './ia.js';
import * as State from './state.js';
import * as Player from './player.js';

// Routes (they self-register with Router.on)
import './routes/bands.js';
import './routes/band.js';
import './routes/show.js';
import './routes/favorites.js';
import './routes/recent.js';
import './routes/onthisday.js';

// Status banner button
$('#statusRetryBtn')?.addEventListener('click', () => location.reload());

// Drawer
const drawer = $('#drawer');
const drawerBack = $('#drawerBack');
function closeDrawer(){ drawer.classList.remove('open'); drawerBack.classList.remove('open'); }
$('#hamburger').addEventListener('click', ()=>{ drawer.classList.add('open'); drawerBack.classList.add('open'); });
$('#drawerClose').addEventListener('click', closeDrawer);
drawerBack.addEventListener('click', closeDrawer);
$$('.drawer .menuItem').forEach(it => it.addEventListener('click', ()=>{
  const nav = it.getAttribute('data-nav');
  if (nav){ location.hash = nav; closeDrawer(); }
}));

// Header, crumb, subheader toggling
function setHeader(routeName, crumbOverride=null){
  const titleEl = $('#pageTitle');
  const crumbText = crumbOverride ?? (
    routeName==='band' ? '— Concerts' :
    routeName==='show' ? '— Tracks' :
    routeName==='recent' ? '— Recently Played' :
    routeName==='onthisday' ? '— This Day in History' :
    (routeName==='fav' || routeName==='favorites' ? '— Favorites' :
      (routeName?.startsWith('favorites/') ? '— Favorites' :
        (routeName==='playlist' ? '— Playlist' : '— Bands')))
  );
  titleEl.innerHTML = `Setlist Streamer <span class="crumb">${crumbText}</span>`;

  const actions = $('#headerActions');
  actions.innerHTML = '';
  if (routeName === 'band'){
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.title = 'Back';
    btn.textContent = '← Bands';
    btn.onclick = () => { location.hash = '#/bands'; };
    actions.appendChild(btn);
  } else if (routeName === 'show'){
    const cameFrom = State.get('cameFrom', '');
    let backLabel = '← Concerts';
    let backHash = '';
    if (cameFrom === 'favorites-songs'){ backLabel = '← Favorite Songs'; backHash = '#/favorites/songs'; }
    else if (cameFrom === 'favorites-concerts'){ backLabel = '← Favorite Concerts'; backHash = '#/favorites/concerts'; }
    else if (cameFrom === 'recent'){ backLabel = '← Recently Played'; backHash = '#/recent'; }
    else if (cameFrom === 'band'){ backLabel = '← Concerts'; backHash = ''; }
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.title = 'Back';
    btn.textContent = backLabel;
    btn.onclick = ()=>{ backHash ? (location.hash = backHash) : history.back(); };
    actions.appendChild(btn);
  }
  $('#subHeader').classList.toggle('show', routeName==='band');
}

// Route changes → update header
window.addEventListener('routechange', (e)=>{
  const { name, key } = e.detail;
  let crumbOverride = null;
  if (key === 'favorites/bands') crumbOverride = '— Favorite Bands';
  else if (key === 'favorites/concerts') crumbOverride = '— Favorite Concerts';
  else if (key === 'favorites/songs') crumbOverride = '— Favorite Songs';
  setHeader(name, crumbOverride);
});

// Bands toolbar (global listeners simply re-route)
$('#sortSel')?.addEventListener('change', ()=> Router.route());
$('#searchBox')?.addEventListener('change', ()=> Router.route());
$('#favToggle')?.addEventListener('click', ()=>{
  const on = !($('#favToggle').classList.contains('is-on'));
  $('#favToggle').textContent = on ? '★ Favorites' : '☆ Favorites';
  $('#favToggle').classList.toggle('is-on', on);
  Router.route();
});
$('#resetBtn')?.addEventListener('click', ()=>{
  $('#sortSel').value='downloads desc';
  $('#searchBox').value='';
  $('#favToggle').textContent='☆ Favorites';
  $('#favToggle').classList.remove('is-on');
  location.hash='#/bands';
  Router.route();
});

// SW optional
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// Init
window.addEventListener('hashchange', Router.route);
window.addEventListener('DOMContentLoaded', () => {
  Player.initEQ(); // initialize EQ paused state icon
  Router.route();
});
