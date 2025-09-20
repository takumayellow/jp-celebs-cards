async function fetchText(url){ const r = await fetch(url,{cache:"no-store"}); if(!r.ok) throw new Error(url+" "+r.status); return await r.text(); }
function parseTSV(txt){
  const lines = txt.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  const [h,...rows] = lines;
  const idx = Object.fromEntries(h.split("\t").map((k,i)=>[k.trim(),i]));
  return rows.map(line=>{
    const c=line.split("\t"); return ({
      id:c[idx.id], name:c[idx.name], yomi:c[idx.yomi]||"", category:c[idx.category]||""
    });
  });
}
function parseCSV(txt){
  const lines = txt.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  const [h,...rows] = lines;
  const idx = Object.fromEntries(h.split(",").map((k,i)=>[k.trim(),i]));
  return rows.map(l=>{
    const c = l.split(/,(.*?),(.*?),(.*?),(.*?),(.*?)/).length>1 ? l.match(/(".*?"|[^,]+)/g).map(s=>s.replace(/^"|"$/g,'')) : l.split(",");
    return {
      id: c[idx.id], name:c[idx.name], source:c[idx.source], filename:c[idx.filename],
      license:c[idx.license], artist:c[idx.artist], credit:c[idx.credit]
    };
  });
}
async function loadData(){
  const [tsv, csv] = await Promise.all([
    fetchText('data/cards.tsv'),
    fetch('data/attributions.csv',{cache:"no-store"}).then(r=>r.ok?r.text():"id,name,source,filename,license,artist,credit\n")
  ]);
  const cards = parseTSV(tsv);
  const attrs = parseCSV(csv);
  const map = {}; const meta = {};
  for(const a of attrs){ if(a.id && a.filename){ map[a.id]=a.filename; meta[a.id]=a; } }
  return {cards, map, meta};
}

// UI
const state = { all:[], filtered:[], i:0, map:{}, meta:{} };

function imgUrlFor(id){
  const file = state.map[id] || (id + '.jpg');
  return 'images/' + encodeURIComponent(file);
}
function renderCounters(){
  const total = state.filtered.length;
  document.querySelector('#count-total').textContent = total;
  document.querySelector('#count-rest').textContent = (total - state.i);
}
function renderCard(){
  const wrap = document.querySelector('#card'); wrap.innerHTML = '';
  if(state.i >= state.filtered.length){ wrap.textContent = '該当カードがありません'; return; }
  const c = state.filtered[state.i];

  const img = new Image(); img.loading='lazy'; img.alt=c.name;
  img.src = imgUrlFor(c.id);
  img.onerror = ()=>{ img.remove(); ph.style.display='block'; };

  const ph = document.createElement('div'); ph.className='placeholder'; ph.textContent='画像なし'; ph.style.display='none';

  const caption = document.createElement('div'); caption.className='caption';
  caption.innerHTML = `<div class="name">${c.name}</div><div class="yomi">${c.yomi||''}</div><div class="cat">${c.category||''}</div>`;

  // credit
  const cr = document.createElement('div'); cr.className='credit';
  const a = state.meta[c.id];
  if(a){
    cr.innerHTML = `Source: ${a.source} / License: ${a.license || 'Unknown'} ${a.artist?(' / © '+a.artist):''}`;
  }

  wrap.append(img, ph, caption, cr);
  renderCounters();
}
function applyFilter(){
  const q  = document.querySelector('#q').value.trim();
  const cat= document.querySelector('#cat').value;
  const norm = s => (s||'').toLowerCase();
  state.filtered = state.all.filter(c=>{
    const okQ = !q || [c.name,c.yomi].some(x=>norm(x).includes(norm(q)));
    const okC = (cat==='__ALL__') || (c.category===cat);
    return okQ && okC;
  });
  state.i = 0;
  renderCard();
}
function populateCategories(cards){
  const sel = document.querySelector('#cat');
  const cats = Array.from(new Set(cards.map(c=>c.category).filter(Boolean))).sort();
  sel.innerHTML = '<option value="__ALL__">すべてのカテゴリ</option>' + cats.map(c=>`<option>${c}</option>`).join('');
}

// Initialize
(async ()=>{
  const {cards, map, meta} = await loadData();
  state.all = cards; state.map = map; state.meta = meta;
  populateCategories(cards);
  state.filtered = [...cards];
  renderCard();

  // controls
  document.querySelector('#q').addEventListener('input', applyFilter);
  document.querySelector('#cat').addEventListener('change', applyFilter);
  document.querySelector('#next').addEventListener('click', ()=>{ if(state.i<state.filtered.length-1){ state.i++; renderCard(); } });
  document.querySelector('#prev').addEventListener('click', ()=>{ if(state.i>0){ state.i--; renderCard(); } });
  document.querySelector('#shuffle').addEventListener('click', ()=>{
    for(let i=state.filtered.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [state.filtered[i],state.filtered[j]]=[state.filtered[j],state.filtered[i]]; }
    state.i=0; renderCard();
  });
  document.querySelector('#reset').addEventListener('click', ()=>{ document.querySelector('#q').value=''; document.querySelector('#cat').value='__ALL__'; applyFilter(); });
})();
