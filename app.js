(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const img = $("#face"), noimg=$("#noimg");
  const elName=$("#name"), elYomi=$("#yomi"), elCat=$("#cat");
  const elCountTotal=$("#countTotal"), elCountLeft=$("#countLeft"), elCountKnown=$("#countKnown");
  const q=$("#q"), filterCat=$("#filterCat");
  const flipBtn=$("#flipBtn"), okBtn=$("#okBtn"), againBtn=$("#againBtn"), shuffleBtn=$("#shuffleBtn"), resetBtn=$("#resetBtn");

  // ---- Data ----
  const ALL = (window.CELEBS || []).map((x,i)=>({ id: x.id || String(i+1).padStart(4,"0"), ...x }));
  const CAT_SET = [...new Set(ALL.map(x=>x.category))].sort();
  CAT_SET.forEach(c=>{
    const o=document.createElement("option"); o.value=c; o.textContent=c; filterCat.appendChild(o);
  });

  // ---- Progress ----
  const KEY = "celeb_known_ids_v1";
  const loadKnown = () => new Set(JSON.parse(localStorage.getItem(KEY)||"[]"));
  const saveKnown = (set) => localStorage.setItem(KEY, JSON.stringify([...set]));
  let known = loadKnown();

  // ---- State ----
  let filtered = [...ALL];
  let idx = 0;
  let flipped = false;

  function sanitizeFilename(str){
    return (str||"").normalize("NFKC").replace(/[^\p{Letter}\p{Number}]+/gu,"_").replace(/^_+|_+$/g,"").toLowerCase();
  }
  function imageCandidates(item){
    const base = "images/";
    const baseId = item.id;
    const slug = sanitizeFilename(item.name);
    const exts = [".jpg",".jpeg",".png",".webp"];
    // Try explicit image property, then id.*, then slug.*
    const list = [];
    if(item.image){ list.push(base+item.image); }
    exts.forEach(e=> list.push(base+baseId+e));
    exts.forEach(e=> list.push(base+slug+e));
    return list;
  }

  function setImage(item){
    const cands = imageCandidates(item);
    let tried = 0;
    function tryNext(){
      if(tried>=cands.length){ img.style.display="none"; noimg.style.display="flex"; return; }
      const src = cands[tried++];
      img.onerror = () => tryNext();
      img.onload = () => { noimg.style.display="none"; img.style.display="block"; };
      img.src = src;
    }
    tryNext();
  }

  function formatRuby(name,yomi){
    if(!yomi) return name;
    return `<ruby>${name}<rt>${yomi}</rt></ruby>`;
  }

  function renderCounts(){
    elCountTotal.textContent = ALL.length;
    elCountKnown.textContent = known.size;
    const left = filtered.filter(x=> !known.has(x.id)).length;
    elCountLeft.textContent = left;
  }

  function applyFilter(){
    const term = (q.value||"").toLowerCase();
    const cat = filterCat.value || "";
    filtered = ALL.filter(x=>{
      if(cat && x.category!==cat) return false;
      const target = `${x.name} ${x.yomi} ${x.category}`.toLowerCase();
      return target.includes(term);
    });
    idx = 0;
    renderCounts();
    renderCard();
  }

  function renderCard(){
    if(filtered.length===0){ $("#front").innerHTML = "<div class='hint'>該当カードがありません</div>"; $("#back").innerHTML=""; img.style.display="none"; noimg.style.display="flex"; return; }
    const item = filtered[idx % filtered.length];
    setImage(item);
    $("#front").innerHTML = "<div class='hint'>写真 → 名前を推測</div>";
    $("#back").innerHTML = "";
    elName.innerHTML = formatRuby(item.name, item.yomi);
    elYomi.textContent = item.yomi? "（"+item.yomi+"）": "";
    elCat.textContent = "カテゴリ: "+item.category;
    flipped = false; document.body.classList.remove("flipped");
    renderCounts();
  }

  function flip(){ flipped = !flipped; document.body.classList.toggle("flipped", flipped); if(flipped){ $("#back").appendChild(elName); $("#back").appendChild(elYomi); $("#back").appendChild(elCat); } }

  function next(markKnown){
    const item = filtered[idx % filtered.length];
    if(markKnown){ known.add(item.id); saveKnown(known); }
    idx = (idx+1) % filtered.length;
    flipped = false; document.body.classList.remove("flipped");
    renderCounts();
    renderCard();
  }

  flipBtn.addEventListener("click", flip);
  okBtn.addEventListener("click", ()=> next(true));
  againBtn.addEventListener("click", ()=> next(false));
  shuffleBtn.addEventListener("click", ()=>{
    for(let i=filtered.length-1;i>0;i--){ const j=(Math.random()* (i+1))|0; [filtered[i],filtered[j]]=[filtered[j],filtered[i]]; }
    idx = 0; renderCard();
  });
  resetBtn.addEventListener("click", ()=>{ if(confirm("進捗（既学習）をリセットしますか？")){ known.clear(); saveKnown(known); renderCounts(); } });

  q.addEventListener("input", applyFilter);
  filterCat.addEventListener("change", applyFilter);

  document.addEventListener("keydown",(e)=>{
    if(e.key===" "){ e.preventDefault(); flip(); }
    if(e.key==="ArrowRight"){ next(true); }
    if(e.key==="ArrowLeft"){ next(false); }
  });

  applyFilter();
})();
