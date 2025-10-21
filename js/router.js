const routes = new Map();

export function on(name, fn){ routes.set(name, fn); }

function parse(){
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  const name = parts[0] || 'bands';
  const params = parts.slice(1);
  const key = params.length ? `${name}/${params.join('/')}` : name;
  return { name, params, key };
}

export function route(){
  const r = parse();
  // pick handler: exact key, name, or fallback
  const handler = routes.get(r.key) || routes.get(r.name) || routes.get('bands');
  // dispatch event so header can update
  window.dispatchEvent(new CustomEvent('routechange', { detail: r }));
  handler(r.params);
}
