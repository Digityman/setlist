export const $ = (s)=> document.querySelector(s);
export const $$ = (s)=> Array.from(document.querySelectorAll(s));
export function show(el,on=true){ if(!el) return; el.style.display=on?'':'none'; }
export function hide(el){ show(el, false); }            // <-- add this
export function setHTML(el, html){ el.innerHTML = html; }


export function fmtTime(secs){
  secs = Math.max(0, Math.floor(secs||0));
  const m=Math.floor(secs/60), s=secs%60;
  return m+":"+String(s).padStart(2,"0");
}
export function fmtCompact(n){
  n=Number(n||0);
  if(n>=1e9) return (n/1e9).toFixed(1)+'B';
  if(n>=1e6) return (n/1e6).toFixed(1)+'M';
  if(n>=1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}

export function prettyId(id=''){
  const raw = decodeURIComponent(id).replace(/[_+]+/g, ' ').trim();
  return raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g,' ').trim();
}

export function renderStars(r=0){
  const rating = Math.round((r||0)*2)/2;
  let out = '';
  for(let i=1;i<=5;i++){
    if (rating>=i) out += fullStar();
    else if (rating>=i-0.5) out += halfStar(i);
    else out += emptyStar();
  }
  return `<span class="stars" aria-label="${rating} out of 5 stars">${out}</span>`;
}
function fullStar(){
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M12 2.3l2.9 5.9 6.6 1-4.8 4.7 1.1 6.6L12 17.8 6.2 20.5 7.3 13.9 2.5 9.2l6.6-1z" fill="#ffcc33" stroke="#ffcc33" stroke-width="1"/>
  </svg>`;
}
function halfStar(i){
  const id = 'grad'+i+'_'+Math.random().toString(36).slice(2);
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="50%" stop-color="#ffcc33"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs>
    <path d="M12 2.3l2.9 5.9 6.6 1-4.8 4.7 1.1 6.6L12 17.8 6.2 20.5 7.3 13.9 2.5 9.2l6.6-1z" fill="url(#${id})" stroke="#ffcc33" stroke-width="1"/>
  </svg>`;
}
function emptyStar(){
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M12 2.3l2.9 5.9 6.6 1-4.8 4.7 1.1 6.6L12 17.8 6.2 20.5 7.3 13.9 2.5 9.2l6.6-1z" fill="none" stroke="#ffcc33" stroke-width="1"/>
  </svg>`;
}

export function todayMMDD(){
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return { mm, dd };
}

// cache of band id → title for favorites grid UX
export function bandTitleFromCache(id){
  const map = JSON.parse(localStorage.getItem('bandTitleMap') || '{}');
  return map[id] || prettyId(id);
}
