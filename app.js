(function () {
'use strict';
const D = window.NP_DATA, RECIPES = D.recipes, PANTRY = window.NP_PANTRY || { ingredients: D.ingredients, aliases: {}, staples: ['su','tuz','karabiber'] }, INGS = PANTRY.ingredients;
const t = (tr, en) => window.NP_I18N.choose(S.lang, tr, en);
const label = value => t(value, value);
const ingredientName = n => S.lang === 'tr' ? cap(n) : (((window.NP_ING_L10N || {})[S.lang] || {})[n] || (S.lang === 'en' && INGS.find(i => i.n === n) || {}).en || n);
const WORLD_CATEGORIES = D.worldCategories || ['İtalyan','Fransız','İspanyol','Yunan','Uzak Doğu','Hint','Meksika','Amerikan','Orta Doğu','Dünya Seçkisi'];
const worldCategory = r => r.worldCategory || r.cuisine;
const collectionFor = value => WORLD_CATEGORIES.includes(value) ? value : (RECIPES.find(r => r.tier === 'world' && r.cuisine === value) || {}).worldCategory || value;
const OFFER = { preview: true, worldPrice: 39, chefPrice: 149, currency: 'TRY' };
const canonical = (n) => PANTRY.aliases[n] || n;
const BY = {}, EMO = {};
RECIPES.forEach((r) => { BY[r.name] = r; });
INGS.forEach((i) => { EMO[i.n] = i.e; });
const GROUPS = Array.from(new Set(INGS.map((i) => i.g)));
const recipeName = (r) => S.lang === 'tr' ? r.name : (r.translations && r.translations[S.lang] && r.translations[S.lang].name || ((window.NP_RECIPE_NAME_L10N || {})[S.lang] || {})[r.name] || r.enName || r.name);
const COLORS = {
  'Türk': ['#E4572E', '#F6B48F'], 'İtalyan': ['#2E9E5B', '#B5DDB0'], 'Japon': ['#C0392B', '#F5B0A8'], 'Hint': ['#D98E04', '#F9E08B'],
  'Meksika': ['#8E44AD', '#DDBFEA'], 'Fransız': ['#2980B9', '#B9DCF3'], 'Asya': ['#16A085', '#B0E3D8'], 'İspanyol': ['#C0632B', '#F3C9A2'],
  'Yunan': ['#2C6FB5', '#BBD5F0'], 'Amerikan': ['#3B5BDB', '#A5B4FC'], 'Orta Doğu': ['#B8860B', '#F2D58A'], 'Tatlı': ['#D6336C', '#FBB6CE'],
  'Kahvaltı': ['#F59E0B', '#FDE68A'], 'Deniz Ürünü': ['#0284C7', '#BAE6FD'], 'Salata': ['#65A30D', '#D9F99D'],
};
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DIFF = { 'Çok Kolay': 1, 'Kolay': 2, 'Orta': 3, 'Zor': 4 };

// ============================================================ yardımcılar
const TR = 'abcçdefgğhıijklmnoöprsştuüvyz';
const trLower = (s) => String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
const searchKey = (s) => String(s || '').replace(/İ/g,'i').replace(/ı/g,'i').replace(/[Łł]/g,'l').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const trKey = (s) => Array.from(trLower(s)).map((c) => { const i = TR.indexOf(c); return i >= 0 ? i : 100 + c.charCodeAt(0); });
const cmpTr = (a, b) => { const x = trKey(a), y = trKey(b); for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i]; return x.length - y.length; };
const trUpper = (s) => s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
const cap = (s) => (s ? (s[0] === 'i' ? 'İ' : s[0] === 'ı' ? 'I' : s[0].toUpperCase()) + s.slice(1) : s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dots = (d) => { const n = DIFF[d] || 2; return '●'.repeat(n) + '○'.repeat(4 - n); };
const CUISINES = ['Tümü', 'Akdeniz'].concat(Array.from(new Set(RECIPES.filter(r=>r.tier==='local').map(r=>r.cuisine).concat(WORLD_CATEGORIES))).sort(cmpTr));

function fmtQty(q) { return (Math.round(q * 10000) / 10000).toLocaleString(S.lang, { maximumFractionDigits: 4 }); }
function amountText(q, u) {
  if (u === 'g' && q >= 1000) return fmtQty(q / 1000) + ' ' + label('kg');
  if (u === 'ml' && q >= 1000) return fmtQty(q / 1000) + ' ' + label('L');
  return fmtQty(q) + ' ' + label(u);
}
const scaled = (ing, base, serv) => ing.q * serv / base;
const stapleNames = () => PANTRY.alwaysAvailable || ['su','tuz','şeker','karabiber','pul biber'];
const hasIngredient = (n, sel) => { const chosen=sel || new Set(S.sel), name=canonical(n); return stapleNames().includes(name) || chosen.has(name) || (PANTRY.alternatives && (PANTRY.alternatives[name]||[]).some(x=>chosen.has(canonical(x)))); };
function match(r, sel) {
  const have = [], miss = [], seen = new Set();
  r.ingredients.forEach((i) => { const n = canonical(i.n); if (seen.has(n)) return; seen.add(n); (hasIngredient(n, sel) ? have : miss).push(n); });
  return { have, miss, pct: seen.size ? Math.round(100 * have.length / seen.size) : 0, total: seen.size };
}
function filterRecipes(o) {
  const q = searchKey((o.query || '').trim());
  const out = RECIPES.filter((r) => {
    if (o.mode === 'fav' && !o.favs.has(r.name)) return false;
    if (q && !searchKey([r.name, r.enName, recipeName(r), r.cuisine, label(r.cuisine), r.worldCategory, r.origin, r.region].concat(r.ingredients.map((i) => i.n+' '+ingredientName(i.n))).join(' ')).includes(q)) return false;
    if (o.mode === 'world' && r.tier !== 'world') return false;
    if (o.mode === 'chef' && r.tier !== 'chef') return false;
    if (o.region && r.region !== o.region) return false;
    if (o.cuisine && o.cuisine !== 'Tümü') { if (o.cuisine === 'Akdeniz' ? r.tags.indexOf('Akdeniz') < 0 : (r.tier === 'local' ? r.cuisine : worldCategory(r)) !== o.cuisine) return false; }
    if (o.maxTime && o.maxTime < 999 && r.time > o.maxTime) return false;
    if (o.onlyDoable && match(r, o.sel).miss.length) return false;
    return true;
  });
  const s = o.sort;
  if (s === 'Süre ↑') out.sort((a, b) => a.time - b.time || cmpTr(a.name, b.name));
  else if (s === 'Süre ↓') out.sort((a, b) => b.time - a.time || cmpTr(a.name, b.name));
  else if (s === 'A → Z') out.sort((a, b) => cmpTr(a.name, b.name));
  else if (o.sel.size) out.sort((a, b) => match(b, o.sel).pct - match(a, o.sel).pct || a.time - b.time);
  return out;
}
function groupRecipes(o) {
  const recs = filterRecipes(o);
  if (o.mode === 'fav') return recs.length ? [{ title: t('⭐ Favori tariflerin','⭐ Your favorites'), sub: t('kalp ikonuna basarak ekleyebilirsin','tap the heart to add recipes'), gold: false, items: recs }] : [];
  const free = recs, g = [];
  if (o.mode === 'chef') { const latest=recs.filter(r=>r.chefCollection==='ileri50'),previous=recs.filter(r=>r.chefCollection!=='ileri50'); return [{title:t('Yeni şef seçkisi','New chef selection'),sub:t('Çok bileşenli tabaklar ve ayrıntılı teknikler','Multiple components and detailed techniques'),items:latest},{title:t('👨‍🍳 Şef koleksiyonu','👨‍🍳 Chef collection'),sub:t('İleri teknikler ve özel sunumlar','Advanced techniques and special presentations'),items:previous}].filter(g=>g.items.length); }
  if (o.mode === 'world') return recs.length ? [{ title: t('🌍 Dünya mutfağı', '🌍 World cuisine'), sub: t('Şimdilik tüm tarifler ücretsiz', 'All recipes currently free'), items: recs }] : [];
  if (o.sel.size) {
    const ready = free.filter((r) => !match(r, o.sel).miss.length);
    const close = free.filter((r) => { const m = match(r, o.sel); return m.have.length && m.miss.length > 0 && m.miss.length <= 2; });
    const used = new Set(ready.concat(close).map((r) => r.name));
    g.push({ title: t('✅ Hemen yapabileceklerin','✅ Ready to cook'), sub: t('temel malzemeler elinde; tür ve miktarı tarifte kontrol et','ingredient groups available; check varieties and quantities'), items: ready },
      { title: t('🛒 Az eksikle yapılabilir','🛒 Almost ready'), sub: t('1–2 malzeme eksik','1–2 ingredients missing'), items: close },
      { title: t('🔍 Diğer tarifler','🔍 More recipes'), sub: t('elindekilerle az eşleşiyor','fewer ingredients in your pantry'), items: free.filter((r) => !used.has(r.name)) });
  } else g.push({ title: t('🍽️ Tüm tarifler','🍽️ All recipes'), sub: t('malzeme seçerek sana uygun olanları öne çıkar','choose pantry ingredients to find your matches'), items: free });
  
  return g.filter((x) => x.items.length);
}
function featuredRecipe(sel) {
  const pool = RECIPES;
  if (sel.size) {
    let best = null, bp = 0;
    pool.forEach((r) => { const p = match(r, sel).pct; if (p > bp || (p === bp && best && p > 0 && r.time < best.time)) { best = r; bp = p; } });
    if (best && bp > 0) return { r: best, label: '🌟 SANA ÖZEL ÖNERİ' };
  }
  const free = RECIPES;
  return { r: free[Math.floor(Date.now() / 86400000) % free.length], label: '🌟 GÜNÜN ÖNERİSİ' };
}
function similar(r, n) {
  const s = new Set(r.ingredients.map((i) => i.n));
  return RECIPES.filter((o) => o.name !== r.name)
    .map((o) => ({ o, c: o.ingredients.filter((i) => s.has(i.n)).length })).filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c || Math.abs(a.o.time - r.time) - Math.abs(b.o.time - r.time)).slice(0, n || 4).map((x) => x.o);
}
function makePlan(sel) {
  let pool = RECIPES;
  if (sel.size) { pool = pool.slice().sort((a, b) => match(b, sel).pct - match(a, sel).pct); pool = pool.slice(0, Math.max(14, Math.floor(pool.length / 3))); }
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a.slice(0, 7).map((r) => r.name);
}
function ingSections() {
  const q = searchKey(F.ingQ.trim());
  const items = INGS.filter((i) => !q || searchKey(i.n+' '+(i.en||'')+' '+ingredientName(i.n)).includes(q));
  if (F.ingMode === 'az') {
    const sorted = items.slice().sort((a, b) => ingredientName(a.n).localeCompare(ingredientName(b.n),S.lang)), secs = [];
    let cur = null;
    sorted.forEach((it) => { const L = ingredientName(it.n)[0].toLocaleUpperCase(S.lang); if (!cur || cur.title !== L) { cur = { title: L, letter: true, items: [] }; secs.push(cur); } cur.items.push(it); });
    return secs;
  }
  return GROUPS.filter((g) => F.ingCat === 'Tümü' || g === F.ingCat).map((g) => ({ title: g, items: items.filter((i) => i.g === g).sort((a, b) => ingredientName(a.n).localeCompare(ingredientName(b.n), S.lang)) })).filter((s) => s.items.length);
}

// ============================================================ durum
const KEY = 'pisirya:v4';
const defaults = { version: 4, favs: [], sel: [], plan: [null,null,null,null,null,null,null], shopping: [], theme: 'system', palette: 'sage', lang: 'tr', servings: 4, staples: false };
function cleanState(raw){
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw new Error('Invalid backup');
  var x=Object.assign({},defaults), names=Object.keys(BY), ingNames=INGS.map(function(i){return i.n;});
  ['favs','sel'].forEach(function(k){if(raw[k]!==undefined && (!Array.isArray(raw[k])||raw[k].some(function(v){return typeof v!=='string';})))throw new Error('Invalid list');x[k]=Array.from(new Set((raw[k]||[]).map((n) => k === 'sel' ? canonical(n) : n))).filter(function(n){return (k==='favs'?names:ingNames).includes(n);});});
  if(raw.plan!==undefined&&!Array.isArray(raw.plan))throw new Error('Invalid plan');
  x.plan=Array.from({length:7},function(_,i){var p=(raw.plan||[])[i]; if(typeof p==='string')p={name:p,servings:raw.servings||4};return p&&BY[p.name]?{name:p.name,servings:Math.min(24,Math.max(1,Math.round(Number(p.servings)||4)))}:null;});
  if(raw.shopping!==undefined&&!Array.isArray(raw.shopping))throw new Error('Invalid shopping');
  x.shopping=(raw.shopping||[]).slice(0,1000).map(function(i){if(!i||typeof i.n!=='string'||typeof i.u!=='string'||!Number.isFinite(i.q)||i.q<=0||i.q>1e7)throw new Error('Invalid item');return {n:i.n.slice(0,120),u:i.u.slice(0,40),q:i.q,checked:!!i.checked};});
  x.theme=['light','dark','system','auto'].includes(raw.theme)?(raw.theme==='auto'?'system':raw.theme):'system';x.palette=raw.palette==='terracotta'?'terracotta':'sage';x.lang=['tr','en','ru','es','de','ar','pl'].includes(raw.lang)?raw.lang:'tr';x.servings=Math.min(24,Math.max(1,Math.round(Number(raw.servings)||4)));x.staples=raw.staples===true;return x;
}
let S;
try { S = cleanState(JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('pisirya:v3') || localStorage.getItem('pisirya:v2') || localStorage.getItem('nepisirsem:web1') || '{}')); } catch (e) { S = cleanState({}); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { toast(t('Cihazda kayıt yapılamadı. Yedek alın.','Device storage unavailable. Export a backup.')); return false; } };
const F = { limit: 60, q: '', cuisine: 'Tümü', sort: 'Önerilen', maxT: 999, region: '', doable: false, ingQ: '', ingMode: 'cat', ingCat: 'Tümü' };
const cur = { tab: 'recipes', mode: 'all', name: '', serv: 0 };
const recipeServings = {};
const $ = (id) => document.getElementById(id);
const isDark = () => S.theme === 'dark' || (S.theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark() ? 'dark' : 'light');
  document.documentElement.setAttribute('data-palette', S.palette);
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  const m = document.querySelector && document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', isDark() ? '#0A0E0C' : '#17352A');
}
let toastT = null;
function toast(msg) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1900);
}
function copyText(value) {
 const fallback=()=>{const ta=document.createElement('textarea');ta.value=value;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{if(!document.execCommand('copy'))throw new Error('copy');}finally{ta.remove();}};
 if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(value).catch(fallback);
 return Promise.resolve().then(fallback);
}

// Only verified bundled images or licensed source URLs are displayed. No live image searches.
const allowedImage = (r) => typeof r.image === 'string' && (!/^https?:/i.test(r.image) || /^https:\/\/(?:images\.pexels\.com|upload\.wikimedia\.org)\//i.test(r.image)) ? r.image : null;
function hydrate(root) { /* native loading=lazy handles image loading */ }
const safeLink = (u) => typeof u === 'string' && /^https:\/\//.test(u) ? u : '';
function creditHTML(r) {
  if(r.imageGenerated)return '<p class="credit">'+t('Pişirya için yapay zekâ ile oluşturuldu. Sunum farklılık gösterebilir.','Created with AI for Pişirya. Presentation may vary.')+'</p>';
  const c = r.imageCredit; if (!c) return '';
  const page = safeLink(c.page || c.source), license = safeLink(c.licenseUrl);
  return '<p class="credit">' + t('Görsel: ', 'Image: ') + esc(c.author || '') + ' · ' + (license ? '<a href="' + esc(license) + '" target="_blank" rel="noopener noreferrer">' + esc(c.license || '') + '</a>' : esc(c.license || '')) + (page ? ' · <a href="' + esc(page) + '" target="_blank" rel="noopener noreferrer">' + t('Kaynak', 'Source') + '</a>' : '') + '</p>';
}

// ============================================================ HTML parçaları
function cover(r, h, big) {
  const c = COLORS[r.cuisine] || ['#497d61', '#d8e5d2'], image = allowedImage(r);
  return '<div class="cover' + (image ? ' has' : '') + '" style="height:' + h + 'px;--c1:' + c[0] + ';--c2:' + c[1] + '"><div class="emo" style="font-size:' + Math.round(h * (big || 0.36)) + 'px">' + esc(r.emoji || '🍲') + '</div>' + (image ? '<img src="' + esc(image) + '" alt="' + esc(recipeName(r)) + '" class="ok" loading="lazy" onerror="this.hidden=true;this.parentNode.classList.remove(\'has\')">' : '') + '<span class="badge l">⏱ ' + r.time + ' ' + t('dk','min') + '</span><span class="badge r">' + esc(label(r.region || r.cuisine)) + '</span>' + (image && r.imageGenerated ? '<span class="image-caption">'+t('Yapay zekâ görseli','AI-generated image')+'</span>' : '') + (image && (r.imageRepresentative || r.imageCredit && r.imageCredit.representative) ? '<span class="image-caption">' + t('Temsili görsel', 'Illustrative photo') + '</span>' : '') + '</div>';
}
function pillsHTML(r, sel, max) {
  const m = max || 7;
  return r.ingredients.slice(0, m).map((i) => `<span class="pill${hasIngredient(i.n, sel) ? ' on' : ''}">${EMO[canonical(i.n)] || '•'}</span>`).join('') + (r.ingredients.length > m ? `<span class="more">+${r.ingredients.length - m}</span>` : '');
}
function card(r, sel, favs) {
  const fav = favs.has(r.name), m = match(r, sel);
  const foot = sel.size ? `<div class="match"><div class="bar"><i style="width:${m.pct}%;background:${m.miss.length ? 'var(--warn)' : 'var(--ok)'}"></i></div><b>${m.pct}% ${t('uyum','match')} · ${m.miss.length ? t('Eksik: ','Missing: ') + esc(m.miss.map(ingredientName).join(', ')) : t('Hepsi elinde!','You have everything!')}</b></div>` : `<div class="cta">${t('Tarifi gör →','View recipe →')}</div>`;
  return `<article class="card"><button class="card-open" data-act="open" data-arg="${esc(r.name)}">${cover(r,165)}<div class="cbody"><div class="row"><h3>${esc(recipeName(r))}</h3></div>${r.tier==='chef'||r.tier==='world'?`<small class="tier-label">${r.tier==='chef'?'👨‍🍳 '+t('Şef modu','Chef mode'):'🌍 '+label(worldCategory(r))} · ${r.tier==='chef'?149:39} TL · ${t('Ücretsiz önizleme','Free preview')}</small>`:''}<div class="meta">${dots(r.difficulty)} ${esc(label(r.difficulty))} · 👥 ${r.servings} ${t('kişilik','servings')}</div><div class="pills">${pillsHTML(r,sel)}</div>${foot}</div></button><button class="heart${fav ? ' on' : ''}" data-act="fav" data-arg="${esc(r.name)}" aria-pressed="${fav}" aria-label="${esc(recipeName(r))} — ${t('Favori','Favorite')}">${fav ? '♥':'♡'}</button></article>`;
}
function featHTML(f) {
  const r=f.r,sel=new Set(S.sel);
  return `<button class="feat" data-act="open" data-arg="${esc(r.name)}">${cover(r,140,.34)}<div class="ft"><small>${sel.size?t('🌟 SANA ÖZEL ÖNERİ','🌟 YOUR PANTRY PICK'):t('🌟 GÜNÜN ÖNERİSİ','🌟 TODAY’S PICK')}</small><h2>${esc(recipeName(r))}</h2><div class="meta">⏱ ${r.time} ${t('dk','min')} · 👥 ${r.servings} ${t('kişilik','servings')}</div><span class="btn primary small">${t('Tarifi aç →','Open recipe →')}</span></div></button>`;
}
const heroHTML=(title,sub,btn,act,arg,deco,kind)=>`<section class="hero${kind==='gold'?' gold':''}"><div class="deco" aria-hidden="true">${deco||''}</div><h1>${title}</h1><p>${sub}</p>${btn?`<button class="btn primary" data-act="${act}" data-arg="${esc(arg||'')}">${btn}</button>`:''}</section>`;
function tabs(){return [['recipes','🍽',t('Tarifler','Recipes'),t('Tarifler','Recipes')],['ing','🧺',t('Malzeme','Pantry'),t('Malzemelerim','My pantry')],['fav','⭐',t('Favoriler','Favorites'),t('Favoriler','Favorites')],['plan','📅',t('Menü','Plan'),t('Haftalık Menü','Weekly plan')],['world','🌍',t('Dünya','World'),t('Dünya Mutfağı','World cuisine')]];}
function renderShell(){
  const TABS=tabs();
  $('app').innerHTML=`<a class="skip-link" href="#page">${t('İçeriğe geç','Skip to content')}</a><header class="top"><div class="wrap"><a class="brand" href="#/"><img src="icons/logo.png" alt=""><span>Pişirya<small>${t('Bugün ne pişirsem?','What shall I cook today?')}</small></span></a><nav class="tabs" aria-label="${t('Ana gezinme','Main navigation')}">${TABS.map(x=>`<button class="tab" data-act="tab" data-arg="${x[0]}" data-tab="${x[0]}">${x[1]} ${x[3]}${x[0]==='ing'?'<span class="cnt"></span>':''}</button>`).join('')}</nav><div class="sp"></div><button class="iconbtn surprise" data-act="surprise" aria-label="${t('Rastgele tarif öner','Suggest a random recipe')}">🎲 ${t('Şaşırt','Surprise')}</button><button class="iconbtn" data-act="tab" data-arg="settings" aria-label="${t('Ayarlar','Settings')}">⚙️</button></div></header><main id="page" tabindex="-1"></main><nav class="bnav" aria-label="${t('Ana gezinme','Main navigation')}">${TABS.map(x=>`<button data-act="tab" data-arg="${x[0]}" data-tab="${x[0]}"><span>${x[1]}</span>${x[2]}${x[0]==='ing'?'<i class="cnt"></i>':''}</button>`).join('')}</nav><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  updateChrome();
}
function updateChrome(){
  document.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===cur.tab;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  document.querySelectorAll('.cnt').forEach(e=>{e.textContent=S.sel.length||'';e.style.display=S.sel.length?'':'none';});
}
function optHTML(arr,value){return arr.map(x=>`<option value="${esc(x[0])}"${String(x[0])===String(value)?' selected':''}>${esc(x[1])}</option>`).join('');}
function pageRecipes(mode){
  F.limit=60;
  cur.tab=mode==='fav'?'fav':(mode==='world'||mode==='chef')?'world':'recipes';cur.mode=mode;
  const sel=new Set(S.sel),ready=RECIPES.filter(r=>!match(r,sel).miss.length).length;
  let hero=mode==='fav'?heroHTML(t('⭐ Favorilerim','⭐ My favorites'),t('Beğendiğin tarifler burada.','Your favorite recipes are here.'),t('🍽 Tüm Tarifler','🍽 All recipes'),'tab','recipes',''):
    mode==='chef'?heroHTML(t('👨‍🍳 Şef modu','👨‍🍳 Chef mode'),t('İleri teknikler ve özel sunumlar','Advanced techniques and special presentations'),'','','','','gold'):
    mode==='world'?heroHTML(label(F.cuisine==='Tümü'?'Dünya Mutfağı':F.cuisine),t('Her mutfak ayrı bir koleksiyondur.','Each cuisine is a separate collection.'),'','','',''):
    heroHTML(t('Bugün ne pişirelim?','What shall we cook today?'),sel.size?`${sel.size} ${t('malzeme seçili','ingredients selected')} · ${ready} ${t('tarif hazır','recipes ready')}`:`${RECIPES.length} ${t('tarif · Evdeki malzemeleri seç, uygun tarifleri bul.','recipes · Choose your pantry and find a match.')}`,t('🧺 Malzemelerimi Seç','🧺 Choose my pantry'),'tab','ing','');
  const regions=Array.from(new Set(RECIPES.map(r=>r.region).filter(Boolean))).sort(cmpTr);
  $('page').innerHTML=`<div class="wrap">${hero}${mode==='world'||mode==='chef'?`<button class="chip" data-act="tab" data-arg="world">🌍 ${t('Dünya mutfakları','World cuisines')}</button>`+offerHTML(mode):mode==='all'?collectionLinks():''}<div class="toolbar"><label class="search">🔎<input id="q" data-input="q" type="search" placeholder="${t('Tarif, malzeme veya mutfak ara…','Search recipes, ingredients or cuisines…')}" aria-label="${t('Tarif ara','Search recipes')}" value="${esc(F.q)}" autocomplete="off"></label></div><details class="filter-panel"${F.cuisine!=='Tümü'||F.maxT!==999||F.region||F.doable?' open':''}><summary>${t('Filtreler ve sıralama','Filters and sort')}</summary><div class="filter-controls"><div class="toolbar"><select data-change="sort" aria-label="${t('Sırala','Sort')}">${optHTML([['Önerilen',t('Önerilen','Recommended')],['Süre ↑',t('Süre ↑ (kısa)','Time ↑ (short)')],['Süre ↓',t('Süre ↓ (uzun)','Time ↓ (long)')],['A → Z','A → Z']],F.sort)}</select><select data-change="maxT" aria-label="${t('Süre','Time')}">${optHTML([['999',t('⏱ Her süre','⏱ Any time')],['10','⏱ 10 '+t('dk','min')],['20','⏱ 20 '+t('dk','min')],['30','⏱ 30 '+t('dk','min')],['45','⏱ 45 '+t('dk','min')],['60','⏱ 60 '+t('dk','min')]],F.maxT)}</select><select data-change="region" aria-label="${t('Yöre','Region')}">${optHTML([['',t('Tüm yöreler','All regions')]].concat(regions.map(r=>[r,r])),F.region)}</select><button class="chip${F.doable?' on':''}" data-act="doable" aria-pressed="${F.doable}">✅ ${t('Yapılabilenler','Ready to cook')}</button><button class="chip" data-act="clearfilters">${t('Filtreleri temizle','Clear filters')}</button></div><div class="chips" id="cc">${(mode==='world'?['Tümü'].concat(WORLD_CATEGORIES):CUISINES).map(c=>`<button class="chip${F.cuisine===c?' on':''}" data-act="cuisine" data-arg="${esc(c)}" aria-pressed="${F.cuisine===c}">${c==='Tümü'?t('Tümü','All'):esc(label(c))}</button>`).join('')}</div></div></details><div id="results"></div></div>`;
  refreshResults();
}
function refreshResults(){
  const el=$('results');if(!el)return;
  const sel=new Set(S.sel),favs=new Set(S.favs),groups=groupRecipes({query:F.q,cuisine:F.cuisine,region:F.region,maxTime:F.maxT,onlyDoable:F.doable,mode:cur.mode,favs,sel,sort:F.sort});
  let html='';if(cur.mode==='all'&&!F.q&&F.cuisine==='Tümü'&&!F.region&&!F.doable)html+=featHTML(featuredRecipe(sel));
  if(!groups.length)html+=`<div class="empty">${cur.mode==='fav'?t('♡ Henüz favori tarifin yok.<br>Kartlardaki kalbe dokun.','♡ No favorites yet.<br>Tap the heart on a recipe.'):t('Bu filtrelere uygun tarif yok.<br>Filtreleri genişletmeyi dene.','No recipes match.<br>Try broader filters.')}</div>`;
  const total=groups.reduce((n,g)=>n+g.items.length,0);let remaining=F.limit;
  groups.forEach(g=>{const visible=g.items.slice(0,remaining);remaining-=visible.length;if(!visible.length)return;html+=`<section><div class="gh"><i></i><div><h2>${g.title}</h2><small>${g.items.length} ${t('tarif','recipes')} · ${g.sub}</small></div></div><div class="grid">${visible.map(r=>card(r,sel,favs)).join('')}</div></section>`;});
  if(total>F.limit)html+=`<div class="load-more"><p>${F.limit} / ${total} ${t('tarif','recipes')}</p><button class="btn primary" data-act="more">${t('Daha fazla tarif göster','Show more recipes')}</button></div>`;
  el.innerHTML=html;
}
function pageIng(){
  cur.tab='ing';
  $('page').innerHTML=`<div class="wrap ihead" style="padding-bottom:90px"><h1>${t('Evinde neler var?','What’s in your kitchen?')}</h1><p>${INGS.length} ${t('günlük malzeme · dokunarak seç','everyday ingredients · tap to select')}</p><p class="pantry-hint">${t('Pirinç, bakliyat, et ve balık türünü; kuru/pişmiş ölçüsünü tarifte kontrol et. Eşleşme stok miktarını ölçmez. Su, tuz, şeker, karabiber ve pul biber her zaman mevcut sayılır.','Check rice, pulse, meat and fish varieties and raw/cooked quantities in the recipe. Matching does not track stock quantities. Water, salt, sugar, black pepper and red pepper flakes are always assumed available.')}</p><div class="toolbar"><label class="search">🔎<input data-input="ingq" type="search" placeholder="${t('Malzeme ara…','Search ingredients…')}" aria-label="${t('Malzeme ara','Search ingredients')}" value="${esc(F.ingQ)}" autocomplete="off"></label></div><div class="chips"><button class="chip${F.ingMode==='az'?' on':''}" data-act="imode" data-arg="az" aria-pressed="${F.ingMode==='az'}">A → Z</button><button class="chip${F.ingMode==='cat'?' on':''}" data-act="imode" data-arg="cat" aria-pressed="${F.ingMode==='cat'}">${t('Kategoriler','Categories')}</button></div><div class="chips" id="icats" style="${F.ingMode==='cat'?'':'display:none'}">${['Tümü'].concat(GROUPS).map(c=>`<button class="chip${F.ingCat===c?' on':''}" data-act="icat" data-arg="${esc(c)}" aria-pressed="${F.ingCat===c}">${c==='Tümü'?t('Tümü','All'):esc(label(c))}</button>`).join('')}</div><div id="tiles"></div></div><div class="foot"><div class="wrap"><div><b id="fcount"></b><small id="fready"></small></div><div class="sp"></div><button class="btn outline small" data-act="clearing">${t('Temizle','Clear')}</button><button class="btn primary" data-act="tab" data-arg="recipes">${t('Tarifleri Göster →','Show recipes →')}</button></div></div>`;
  refreshTiles();updateIngFoot();
}
function refreshTiles(){
  const el=$('tiles');if(!el)return;const sel=new Set(S.sel),secs=ingSections();
  el.innerHTML=secs.length?secs.map(s=>`<div class="${s.letter?'letter':'sect'}">${esc(s.letter?s.title:label(s.title))}</div><div class="tiles">${s.items.map(i=>`<button class="tile${hasIngredient(i.n,sel)?' on':''}" data-act="ing" data-arg="${esc(i.n)}" aria-pressed="${hasIngredient(i.n,sel)}"${stapleNames().includes(canonical(i.n))?' disabled':''}><span class="te" aria-hidden="true">${i.e}</span><span class="tn">${esc(ingredientName(i.n))}</span><span class="ck" aria-hidden="true">✓</span></button>`).join('')}</div>`).join(''):`<div class="empty">${t('Bu aramaya uyan malzeme yok.','No matching ingredients.')}</div>`;
}
function updateIngFoot(){const sel=new Set(S.sel),c=$('fcount'),r=$('fready');if(!c)return;const ready=RECIPES.filter(x=>!match(x,sel).miss.length).length;c.textContent=`${sel.size} ${t('malzeme seçili','ingredients selected')}`;r.textContent=sel.size?`${ready} ${t('tarifi hemen yapabilirsin','recipes ready to cook')}`:'';}
function aggregate(items){const map={};items.forEach(i=>{let u=i.u,q=i.q;if(u==='kg'){u='g';q*=1000;}if(['litre','l','L'].includes(u)){u='ml';q*=1000;}const key=i.n+'\u0000'+u;if(!map[key])map[key]={n:i.n,u,q:0,checked:false};map[key].q+=q;});return Object.keys(map).map(k=>{map[k].q=Math.round(map[k].q*1e8)/1e8;return map[k];}).sort((a,b)=>cmpTr(a.n,b.n));}
function recipeNeed(r,serv){return r.ingredients.filter(i=>!hasIngredient(i.n)&&Number.isFinite(i.q)&&i.q>0).map(i=>({n:i.n,u:i.u,q:scaled(i,r.servings,serv)}));}
function planNeed(){let items=[];S.plan.forEach(p=>{if(p&&BY[p.name])items=items.concat(recipeNeed(BY[p.name],p.servings));});return aggregate(items);}
function addShopping(items){const checked={},added={};S.shopping.forEach(i=>{checked[i.n+'\u0000'+i.u]=i.checked;});aggregate(items).forEach(i=>{added[i.n+'\u0000'+i.u]=true;});S.shopping=aggregate(S.shopping.concat(items));S.shopping.forEach(i=>{const key=i.n+'\u0000'+i.u;i.checked=added[key]?false:checked[key]||false;});save();toast(items.length?t('🛒 Alışveriş listesine eklendi','🛒 Added to shopping list'):t('Eksik malzeme yok','No missing ingredients'));}
function shoppingHTML(){return `<section class="shopping-section"><div class="gh"><i></i><div><h2>${t('🛒 Alışveriş listem','🛒 My shopping list')}</h2><small>${t('Kilerde olanlar eklenmez; miktarları evde kontrol et.','Pantry ingredients are omitted; check stock quantities yourself.')}</small></div></div>${S.shopping.length?S.shopping.map((i,k)=>`<label class="shopping-row"><input type="checkbox" data-shopping="${k}"${i.checked?' checked':''}><span>${esc(ingredientName(i.n))}</span><b>${esc(amountText(i.q,i.u))}</b></label>`).join(''):`<div class="empty">${t('Tariften veya menüden eksikleri ekle.','Add missing ingredients from a recipe or your plan.')}</div>`}<div class="shopping-actions"><button class="btn outline small" data-act="copyshopping">${t('Kopyala','Copy')}</button><button class="btn outline small" data-act="removechecked">${t('Alınanları kaldır','Remove bought')}</button><button class="btn outline small" data-act="clearshopping">${t('Temizle','Clear')}</button></div></section>`;}
function dayName(i){return t(DAYS[i],['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]);}
function pagePlan(){
  cur.tab='plan';const need=planNeed();
  $('page').innerHTML=`<div class="wrap" style="padding-bottom:90px">${heroHTML(t('📅 Haftalık Menü','📅 Weekly plan'),t('Her günü seç veya boş günleri önerilerle doldur. Mevcut menün korunur.','Choose each day or fill empty days with suggestions. Your existing plan is preserved.'),t('Boş Günleri Doldur','Fill empty days'),'fillplan','','')}<div class="plan-list">${S.plan.map((p,i)=>{const r=p&&BY[p.name];return `<section class="plan-entry"><div class="plan"><div class="pe" aria-hidden="true">${r?r.emoji:'🍽'}</div><div class="pt"><small>${trUpper(dayName(i))}</small>${r?`<button class="plan-open" data-act="open" data-arg="${esc(r.name)}">${esc(recipeName(r))}</button><span>${esc(label(r.cuisine))} · ⏱ ${r.time} ${t('dk','min')} · ${p.servings} ${t('kişilik','servings')}</span>`:`<b>${t('Henüz tarif seçilmedi','No recipe selected')}</b>`}</div><button class="re" data-act="replace" data-arg="${i}" aria-label="${esc(dayName(i))} — ${t('Farklı tarif öner','Suggest another recipe')}">🔄</button></div><div class="plan-edit"><label>${t('Tarif','Recipe')}<select data-plan="${i}"><option value="">${t('Boş bırak','Leave empty')}</option>${RECIPES.map(o=>`<option value="${esc(o.name)}"${r&&r.name===o.name?' selected':''}>${esc(recipeName(o))}</option>`).join('')}</select></label><label>${t('Kişi','Servings')}<input type="number" min="1" max="24" data-plan-serv="${i}" value="${p?p.servings:S.servings}"${!p?' disabled':''}></label></div></section>`;}).join('')}</div><div class="shopping-actions"><button class="btn outline" data-act="reshuffle">${t('🔀 Menüyü yeniden öner','🔀 Suggest a new plan')}</button></div>${shoppingHTML()}</div><div class="foot"><div class="wrap"><div><b>${need.length+' '+t('ürün eksik','items missing')}</b></div><div class="sp"></div><button class="btn primary" data-act="planshop">${t('🛒 Eksikleri Ekle','🛒 Add missing')}</button><button class="btn outline small" data-act="copyplan">${t('Kopyala','Copy')}</button></div></div>`;
}
function offerHTML(mode){const chef=mode==='chef';return `<aside class="offer-note"><strong>${t('Ücretsiz önizleme','Free preview')}</strong><span>${t('Planlanan fiyat','Planned price')}: <b>${chef?OFFER.chefPrice:OFFER.worldPrice} TL</b>${chef?'':' / '+t('mutfak','cuisine')}</span><small>${t('Şu an ödeme alınmaz. Tüm içerik açık.','No payment is collected now. All content is open.')}</small></aside>`;}
function collectionLinks(){return `<div class="collection-links"><button class="chip" data-act="tab" data-arg="world">🌍 ${t('Dünya mutfakları','World cuisines')} · 39 TL</button><button class="chip chef-link" data-act="tab" data-arg="chef">👨‍🍳 ${t('Şef modu','Chef mode')} · 149 TL</button><small>${t('Şimdilik ücretsiz önizleme','Free preview for now')}</small></div>`;}
function pageWorld(){cur.tab='world';cur.mode='world';const cuisines=WORLD_CATEGORIES.filter(c=>RECIPES.some(r=>r.tier==='world'&&worldCategory(r)===c));$('page').innerHTML=`<div class="wrap">${heroHTML(t('🌍 Dünya Mutfağı','🌍 World cuisine'),t('Her mutfak ayrı bir koleksiyondur.','Each cuisine is a separate collection.'),'','','','')}${offerHTML('world')}<div class="collection-grid">${cuisines.map(c=>`<button class="collection-card" data-act="collection" data-arg="${esc(c)}"><span class="collection-emoji">${({İtalyan:'🇮🇹',Japon:'🇯🇵',Hint:'🇮🇳',Meksika:'🇲🇽',Fransız:'🇫🇷',İspanyol:'🇪🇸',Yunan:'🇬🇷',Amerikan:'🇺🇸',Asya:'🥢','Uzak Doğu':'🥢','Dünya Seçkisi':'🌍','Orta Doğu':'🧆'})[c]||'🌍'}</span><strong>${esc(label(c))}</strong><span>${RECIPES.filter(r=>r.tier==='world'&&worldCategory(r)===c).length} ${t('tarif','recipes')}</span><small>39 TL · ${t('Planlanan fiyat','Planned price')}</small><b>${t('Ücretsiz keşfet →','Explore free →')}</b></button>`).join('')}</div><section class="chef-promo"><h2>👨‍🍳 ${t('Şef modu','Chef mode')}</h2><p>${t('İleri teknikler ve özel sunumlar','Advanced techniques and special presentations')}</p><p>149 TL · ${t('Planlanan fiyat','Planned price')}</p><button class="btn primary" data-act="tab" data-arg="chef">${t('Ücretsiz keşfet →','Explore free →')}</button></section></div>`;}
function pageChef(){Object.assign(F,{q:'',cuisine:'Tümü',region:'',maxT:999,doable:false});pageRecipes('chef');}
function amountsHTML(r,serv){return r.ingredients.map(i=>`<div class="ing"><span class="ie" aria-hidden="true">${EMO[canonical(i.n)]||'•'}</span><span class="in">${esc(ingredientName(i.n))}${i.note?`<small>${esc(i.note)}</small>`:''}</span><span class="iq">${esc(amountText(scaled(i,r.servings,serv),i.u))}</span><span class="ik" aria-label="${hasIngredient(i.n)?t('Kilerde var','In pantry'):t('Eksik','Missing')}">${hasIngredient(i.n)?'✓':''}</span></div>`).join('');}
function pageDetail(name){
  const r=BY[name];if(!r){go('');return;}cur.name=name;cur.serv=recipeServings[name]||S.servings;recipeServings[name]=cur.serv;
  const sel=new Set(S.sel),m=match(r,sel),fav=S.favs.includes(name),sim=similar(r,4);cur.tab='detail';
  $('page').innerHTML=`<div class="dwrap"><div class="dtop"><button class="btn outline small" data-act="back">${t('← Geri','← Back')}</button><button class="heart${fav?' on':''}" data-act="fav" data-arg="${esc(name)}" aria-label="${t('Favori','Favorite')}" aria-pressed="${fav}">${fav?'♥':'♡'}</button></div>${cover(r,240,.4)}${creditHTML(r)}<h1>${r.emoji} ${esc(recipeName(r))}</h1><div class="dsub">${esc(label(r.region||r.cuisine))} · ⏱ ${r.time} ${t('dk','min')} · ${dots(r.difficulty)} ${esc(label(r.difficulty))}</div><p class="note recipe-origin"><b>${t('Menşei','Origin')}:</b> ${esc(label(r.origin || r.cuisine))}</p><div class="time-breakdown">${[r.prepTime?t('Hazırlık','Prep')+': '+r.prepTime+' '+t('dk','min'):'',r.cookTime?t('Pişirme','Cook')+': '+r.cookTime+' '+t('dk','min'):'',r.restTime?t('Bekleme','Rest')+': '+r.restTime+' '+t('dk','min'):''].filter(Boolean).join(' · ')}</div>${S.lang!=='tr'?'<p class="note">'+t('Tarif adımları ve özel malzeme açıklamaları şimdilik Türkçedir.','Recipe instructions and special ingredient notes are currently in Turkish.')+'</p>':''}${r.tier==='chef'||r.tier==='world'?offerHTML(r.tier):''}<div class="dhr"><h2>${t('Malzemeler','Ingredients')}</h2><div class="serv"><button data-act="serv" data-arg="-1" aria-label="${t('Azalt','Fewer servings')}">−</button><span id="servn">👥 ${cur.serv} ${t('kişilik','servings')}</span><button data-act="serv" data-arg="1" aria-label="${t('Artır','More servings')}">+</button></div></div>${sel.size?`<p class="note">${m.have.length}/${m.total} ${t('malzeme grubu elinde','ingredient groups available')}</p>`:''}<div class="ings" id="amts">${amountsHTML(r,cur.serv)}</div><p class="note">${t('Ölçüler kişi sayısına göre orantılı hesaplanır. Tuz ve baharatı tadına göre ayarla. Bardak 200 ml, yemek kaşığı 15 ml, çay kaşığı 5 ml kabul edilir.','Quantities scale by servings. Season to taste. Cup 200 ml, tablespoon 15 ml, teaspoon 5 ml.')}</p><div class="dh">${t('Hazırlanışı','Preparation')} <small>${t('(dokunarak işaretle)','(tap to mark)')}</small></div><p class="note">${t('Adımlardaki miktarlar orijinal '+r.servings+' kişilik ölçüyü anlatır. Seçtiğin kişi sayısı için yukarıdaki listeyi kullan; paylaştırılan malzemeleri aynı oranda ayarla. Sıcaklıkları orantılı artırma.','Amounts within steps describe the original '+r.servings+' servings. Use the scaled list above and divide ingredients proportionally. Do not scale temperatures.')}</p>${r.steps.map((step,i)=>`<button class="step" data-act="step" data-arg="${i}" aria-pressed="false"><span class="num">${i+1}</span><span class="step-text">${esc(typeof step==='string'?step:step.text)}</span></button>`).join('')}${r.tip?`<div class="tip">💡 <b>${t('İpucu:','Tip:')}</b> ${esc(r.tip)}</div>`:''}${sim.length?`<div class="dh">${t('Benzer tarifler','Similar recipes')}</div><div class="simlist">${sim.map(o=>`<button class="chip" data-act="open" data-arg="${esc(o.name)}">${o.emoji} ${esc(recipeName(o))}</button>`).join('')}</div>`:''}<p class="legal">${t('Alerjenler için tüm malzemeleri ve ürün etiketlerini kontrol et.','Check all ingredients and product labels for allergens.')}</p></div><div class="dbar"><div class="wrap"><button class="btn outline" data-act="recipeshop">${t('🛒 Eksikleri Ekle','🛒 Add missing')}</button><button class="btn outline small" data-act="copyshop">${t('Kopyala','Copy')}</button><button class="btn primary" data-act="startcook" data-arg="${esc(name)}">${t('▶ Pişirmeye Başla','▶ Start cooking')}</button></div></div>`;
}

function selectSetting(label,key,options){return `<label class="setting-row"><span>${label}</span><select data-setting="${key}">${optHTML(options,S[key])}</select></label>`;}
function pageSettings(){
 cur.tab='settings';
 $('page').innerHTML=`<div class="wrap">${heroHTML(t('⚙️ Ayarlar','⚙️ Settings'),t('Tercihlerin bu cihazda saklanır.','Your preferences are saved on this device.'),'','','','')}<section class="settings-group"><h2>${t('Görünüm ve dil','Appearance & language')}</h2>${selectSetting(t('Tema','Theme'),'theme',[['system',t('Sistem','System')],['light',t('Açık','Light')],['dark',t('Koyu','Dark')]])}${selectSetting(t('Renk paleti','Color palette'),'palette',[['sage',t('Adaçayı','Sage')],['terracotta',t('Toprak','Terracotta')]])}${selectSetting(t('Dil','Language'),'lang',[['tr','Türkçe'],['en','English'],['ru','Русский'],['es','Español'],['de','Deutsch'],['ar','العربية'],['pl','Polski']])}<p>${t('Arayüz yedi dilde kullanılabilir. Tarif adımları ve özel malzeme açıklamaları şimdilik Türkçedir.','The interface supports seven languages. Recipe instructions and special ingredient notes are currently in Turkish.')}</p></section><section class="settings-group"><h2>${t('Mutfak tercihleri','Kitchen preferences')}</h2><label class="setting-row"><span>${t('Varsayılan kişi sayısı','Default servings')}</span><input type="number" min="1" max="24" data-setting="servings" value="${S.servings}"></label><p>${t('Su, tuz, şeker, karabiber ve pul biber evde var kabul edilir. Yağlar ve diğer baharatları kendin seç.','Water, salt, sugar, black pepper and red pepper flakes are assumed available. Select oils and other spices yourself.')}</p></section><section class="settings-group"><h2>${t('Yedekleme','Backup')}</h2><p>${t('Favorilerini, malzemelerini, menünü ve alışveriş listeni yedekle. Yedek yüklemek mevcut kayıtları değiştirir.','Back up favorites, pantry, plan and shopping list. Import replaces your current data.')}</p><div class="backup-actions"><button class="btn primary" data-act="export">${t('Yedeği indir','Export backup')}</button><label class="btn outline">${t('Yedek yükle','Import backup')}<input type="file" id="importFile" accept="application/json,.json" class="visually-hidden"></label><button class="btn outline" data-act="reset">${t('Kayıtları sıfırla','Reset data')}</button></div></section><section class="settings-group"><h2>${t('Pişirya hakkında','About Pişirya')}</h2><p>${t('iPhone’da Safari paylaş menüsünden Ana Ekrana Ekle seçeneğini kullan. İlk çevrimiçi açılıştan sonra tarifler çevrimdışı kullanılabilir; fotoğraflar için bağlantı gerekebilir.','On iPhone, use Safari’s Share → Add to Home Screen. Recipes work offline after the first online visit; photos may require a connection.')}</p><p>${t('Dünya mutfakları ayrı ayrı 39 TL, Şef modu 149 TL olarak planlanmıştır. Şu an tamamı ücretsiz önizlemededir.','Each world cuisine is planned at 39 TL; Chef mode at 149 TL. Everything is currently a free preview.')}</p><p><a href="credits.html">${t('Görsel kaynakları ve lisanslar','Image sources and licenses')}</a></p></section></div>`;
}
function exportBackup(){const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pisirya-yedek-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function importBackup(file){if(!file)return;if(file.size>2e6){toast(t('Yedek 2 MB sınırını aşıyor','Backup exceeds 2 MB'));return;}const reader=new FileReader();reader.onload=()=>{try{const raw=JSON.parse(reader.result);if(![2,3,4].includes(raw.version))throw new Error('version');const next=cleanState(raw);if(!confirm(t('Yedek mevcut kayıtları değiştirecek. Devam edilsin mi?','Replace your current data with this backup?')))return;Object.assign(S,next);save();applyTheme();renderShell();route();toast(t('Yedek yüklendi','Backup imported'));}catch(e){toast(t('Geçersiz veya desteklenmeyen yedek','Invalid or unsupported backup'));}};reader.onerror=()=>toast(t('Dosya okunamadı','Could not read file'));reader.readAsText(file);}
// Timer uses a real deadline, so background tab throttling does not add minutes.
const tm={mins:10,left:0,run:false,id:null,end:0,done:false};let cook=null,audio=null,wake=null;
function stopTimer(){tm.run=false;if(tm.id){clearInterval(tm.id);tm.id=null;}}
function releaseWake(){try{if(wake){wake.release();wake=null;}}catch(e){}}
function requestWake(){try{if(cook&&navigator.wakeLock&&!wake)navigator.wakeLock.request('screen').then(l=>{if(!cook){l.release();return;}wake=l;if(l.addEventListener)l.addEventListener('release',()=>{if(wake===l)wake=null;});}).catch(()=>{});}catch(e){}}
function beep(){try{if(!audio)return;[0,.35,.7].forEach(delay=>{const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=880;g.gain.value=.2;o.start(audio.currentTime+delay);o.stop(audio.currentTime+delay+.2);});}catch(e){}}
function pageCook(name){const r=BY[name];if(!r){go('');return;}cur.tab='cook';cur.name=name;cur.serv=recipeServings[name]||S.servings;stopTimer();Object.assign(tm,{mins:10,left:0,end:0,done:false});cook={r,i:0};requestWake();$('page').innerHTML=`<div class="cook"><div class="ch"><b>${t('▶ PİŞİRME MODU','▶ COOKING MODE')}</b><button class="btn outline small" data-act="exitcook">${t('✕ Çık','✕ Exit')}</button></div><h1>${r.emoji} ${esc(recipeName(r))}</h1>${S.lang!=='tr'?'<p class="note">'+t('Tarif adımları ve özel malzeme açıklamaları şimdilik Türkçedir.','Recipe instructions and special ingredient notes are currently in Turkish.')+'</p>':''}<p class="note">${cur.serv} ${t('kişilik malzeme listesini tarif ekranından takip et. Adımlardaki ölçüler orijinal '+r.servings+' kişiliktir.','servings selected. Refer to the recipe ingredient list; quantities within steps describe the original '+r.servings+' servings.')}</p><div class="bar"><i id="cbar" style="background:var(--accent);width:0"></i></div><div class="cnt" id="ccount"></div><div class="big" id="cstep"></div><div class="timer"><span aria-hidden="true">⏲</span><button class="adj" data-act="tadj" data-arg="-1" aria-label="${t('Dakika azalt','Fewer minutes')}">−</button><b id="tmins"></b><button class="adj" data-act="tadj" data-arg="1" aria-label="${t('Dakika artır','More minutes')}">+</button><div class="clock" id="clock" role="timer">00:00</div><button class="btn primary small" id="tbtn" data-act="timer"></button><button class="btn outline small" data-act="timerreset">${t('Sıfırla','Reset')}</button></div><p class="note">${t('Sayaç uygulamaya döndüğünde gerçek geçen süreyi gösterir. iPhone arka plandayken sesli uyarı garanti edilmez.','The timer shows elapsed real time when you return. Sound alerts are not guaranteed while iPhone keeps the app in the background.')}</p><div class="nav"><button class="btn" id="pbtn" data-act="prevstep">${t('← Önceki','← Previous')}</button><button class="btn primary" id="nbtn" data-act="nextstep"></button></div></div>`;updateCook();tick();}
function updateCook(){if(!cook)return;const n=cook.r.steps.length,step=cook.r.steps[cook.i];$('cstep').textContent=typeof step==='string'?step:step.text;$('ccount').textContent=t('ADIM ','STEP ')+(cook.i+1)+' / '+n;$('cbar').style.width=((cook.i+1)/n)*100+'%';$('nbtn').textContent=cook.i===n-1?t('Bitir 🎉','Finish 🎉'):t('Sonraki →','Next →');$('pbtn').disabled=cook.i===0;$('tmins').textContent=tm.mins+' '+t('dk','min');}
function remaining(){return tm.run?Math.max(0,Math.ceil((tm.end-Date.now())/1000)):tm.left;}
function tick(){const c=$('clock');if(!c)return;if(tm.run){tm.left=remaining();if(tm.left===0){stopTimer();tm.done=true;beep();try{if(navigator.vibrate)navigator.vibrate([400,200,400]);}catch(e){}toast(t('⏲ Süre doldu!','⏲ Time is up!'));}}c.textContent=tm.done?t('Bitti!','Done!'):String(Math.floor(tm.left/60)).padStart(2,'0')+':'+String(tm.left%60).padStart(2,'0');c.classList.toggle('run',tm.run);$('tbtn').textContent=tm.run?t('Duraklat','Pause'):tm.left?t('Devam','Resume'):t('Başlat','Start');}
const pos={};let curKey=null,returnRoute='';
function go(h){const target='#/'+h;if(location.hash===target)route();else location.hash=target;}
function route(){const raw=(location.hash||'').replace(/^#\/?/,'');if(curKey!==null&&typeof window.scrollY==='number')pos[curKey]=window.scrollY;const i=raw.indexOf('/'),p=i<0?raw:raw.slice(0,i);let arg='';try{arg=i<0?'':decodeURIComponent(raw.slice(i+1));}catch(e){}if(cook){stopTimer();releaseWake();cook=null;}const special=p==='r'||p==='cook';document.body.classList.toggle('hasnav',!special);document.body.classList.toggle('detail-mode',p==='r');document.body.classList.toggle('cook-mode',p==='cook');document.body.classList.toggle('hasfoot',['ing','pantry','plan'].includes(p));if(!special)returnRoute=raw;
 if(p==='ing'||p==='pantry')pageIng();else if(p==='fav'||p==='favorites')pageRecipes('fav');else if(p==='plan')pagePlan();else if(p==='chef')pageChef();else if(p==='world'&&arg){Object.assign(F,{q:'',cuisine:collectionFor(arg),region:'',maxT:999,doable:false});pageRecipes('world');}else if(p==='world')pageWorld();else if(p==='settings')pageSettings();else if(p==='r')pageDetail(arg);else if(p==='cook')pageCook(arg);else pageRecipes('all');curKey=raw;updateChrome();if(window.scrollTo){const y=pos[raw]||0;if(window.requestAnimationFrame)window.requestAnimationFrame(()=>window.scrollTo(0,y));else window.scrollTo(0,y);}try{$('page').focus({preventScroll:true});}catch(e){} }
function copyList(title,items){return copyText(title+'\n'+items.map(i=>'- '+cap(i.n)+' — '+amountText(i.q,i.u)).join('\n')).then(()=>toast(t('Liste kopyalandı','List copied'))).catch(()=>toast(t('Kopyalanamadı. Ayarlardan yedek indirebilirsin.','Copy failed. You can export a backup from settings.')));}
function freshPlan(){return makePlan(new Set(S.sel)).map(name=>({name,servings:S.servings}));}
const ACTS={
 more:()=>{F.limit+=60;refreshResults();},
 tab:a=>go(a==='recipes'?'':a),collection:a=>{Object.assign(F,{q:'',cuisine:a,region:'',doable:false,maxT:999});go('world/'+encodeURIComponent(a));},back:()=>go(returnRoute),open:a=>{if(BY[a])go('r/'+encodeURIComponent(a));},
 fav:(a,el)=>{if(!BY[a])return;const k=S.favs.indexOf(a),on=k<0;if(on)S.favs.push(a);else S.favs.splice(k,1);save();if(cur.tab==='fav')refreshResults();else if(el){el.classList.toggle('on',on);el.setAttribute('aria-pressed',on);el.textContent=on?'♥':'♡';}toast(on?t('♥ Favorilere eklendi','♥ Added to favorites'):t('Favorilerden çıkarıldı','Removed from favorites'));},
 ing:(a,el)=>{if(!INGS.some(i=>i.n===a)||stapleNames().includes(canonical(a)))return;const k=S.sel.indexOf(a);if(k<0)S.sel.push(a);else S.sel.splice(k,1);save();if(el){el.classList.toggle('on',k<0);el.setAttribute('aria-pressed',k<0);}updateIngFoot();updateChrome();},
 imode:a=>{F.ingMode=a;pageIng();},icat:a=>{F.ingCat=a;pageIng();},clearing:()=>{S.sel=[];save();refreshTiles();updateIngFoot();updateChrome();},cuisine:a=>{if(cur.mode==='world'){if(a==='Tümü')go('world');else ACTS.collection(a);return;}F.cuisine=a;pageRecipes(cur.mode);},doable:()=>{F.doable=!F.doable;pageRecipes(cur.mode);},clearfilters:()=>{const cuisine=cur.mode==='world'?F.cuisine:'Tümü';Object.assign(F,{q:'',cuisine,sort:'Önerilen',maxT:999,region:'',doable:false});pageRecipes(cur.mode);},
 surprise:()=>{const pool=RECIPES;ACTS.open(pool[Math.floor(Math.random()*pool.length)].name);},
 fillplan:()=>{const used=new Set(S.plan.filter(Boolean).map(p=>p.name)),pool=RECIPES.slice().sort((a,b)=>match(b,new Set(S.sel)).pct-match(a,new Set(S.sel)).pct);S.plan=S.plan.map(p=>{if(p)return p;const r=pool.find(o=>!used.has(o.name));if(!r)return null;used.add(r.name);return {name:r.name,servings:S.servings};});save();pagePlan();},
 reshuffle:()=>{S.plan=freshPlan();save();pagePlan();toast(t('📅 Yeni menü hazır','📅 New plan ready'));},
 replace:a=>{const i=Number(a);if(!Number.isInteger(i)||i<0||i>6)return;const used=new Set(S.plan.filter(Boolean).map(p=>p.name)),pool=RECIPES.filter(r=>!used.has(r.name));if(pool.length){const r=pool[Math.floor(Math.random()*pool.length)];S.plan[i]={name:r.name,servings:S.plan[i]?S.plan[i].servings:S.servings};save();pagePlan();}},
 planshop:()=>{addShopping(planNeed());pagePlan();},recipeshop:()=>{if(BY[cur.name])addShopping(recipeNeed(BY[cur.name],cur.serv));},removechecked:()=>{S.shopping=S.shopping.filter(i=>!i.checked);save();pagePlan();},clearshopping:()=>{if(!confirm(t('Alışveriş listesi temizlensin mi?','Clear the shopping list?')))return;S.shopping=[];save();pagePlan();},copyshopping:()=>copyList(t('Pişirya alışveriş listesi','Pişirya shopping list'),S.shopping.filter(i=>!i.checked)),copyplan:()=>copyList(t('Haftalık menünün eksikleri','Missing ingredients for weekly plan'),planNeed()),copyshop:()=>{if(BY[cur.name])copyList(recipeName(BY[cur.name])+' · '+cur.serv+' '+t('kişilik','servings'),recipeNeed(BY[cur.name],cur.serv));},
 serv:a=>{const r=BY[cur.name];if(!r)return;cur.serv=Math.min(24,Math.max(1,cur.serv+Number(a)));recipeServings[cur.name]=cur.serv;$('servn').textContent='👥 '+cur.serv+' '+t('kişilik','servings');$('amts').innerHTML=amountsHTML(r,cur.serv);},step:(a,el)=>{if(!el)return;el.classList.toggle('done');const done=el.classList.contains('done');el.setAttribute('aria-pressed',done);const num=el.querySelector('.num');if(num)num.textContent=done?'✓':String(Number(a)+1);},
 export:exportBackup,reset:()=>{if(!confirm(t('Bu cihazdaki favoriler, malzemeler, menü ve alışveriş listesi silinsin mi?','Delete favorites, pantry, plan and shopping list on this device?')))return;Object.assign(S,cleanState({}));save();applyTheme();renderShell();route();},
 startcook:a=>{if(BY[a])go('cook/'+encodeURIComponent(a));},exitcook:()=>go('r/'+encodeURIComponent(cur.name)),prevstep:()=>{if(cook&&cook.i>0){cook.i--;updateCook();}},nextstep:()=>{if(!cook)return;if(cook.i<cook.r.steps.length-1){cook.i++;updateCook();}else{go('r/'+encodeURIComponent(cook.r.name));toast(t('🎉 Afiyet olsun!','🎉 Enjoy your meal!'));}},
 tadj:a=>{if(tm.run)return;tm.mins=Math.min(240,Math.max(1,tm.mins+Number(a)));tm.left=0;tm.done=false;updateCook();tick();},timer:()=>{if(!cook)return;if(tm.run){tm.left=remaining();stopTimer();}else{try{const A=window.AudioContext||window.webkitAudioContext;if(A&&!audio)audio=new A();if(audio&&audio.resume)audio.resume();}catch(e){}tm.left=tm.left||tm.mins*60;tm.end=Date.now()+tm.left*1000;tm.run=true;tm.done=false;tm.id=setInterval(tick,500);}tick();},timerreset:()=>{stopTimer();tm.left=0;tm.done=false;tick();}
};
let deb=null;
const INPUTS={q:v=>{F.limit=60;F.q=v;clearTimeout(deb);deb=setTimeout(refreshResults,160);},ingq:v=>{F.ingQ=v;clearTimeout(deb);deb=setTimeout(refreshTiles,120);}};
const CHANGES={sort:v=>{F.limit=60;F.sort=v;refreshResults();},maxT:v=>{F.limit=60;F.maxT=Number(v)||999;refreshResults();},region:v=>{F.limit=60;F.region=v;refreshResults();}};
function handleChange(el){const ds=el.dataset||{},f=CHANGES[ds.change];if(f)f(el.value);if(ds.plan!==undefined){const i=Number(ds.plan);if(Number.isInteger(i)&&i>=0&&i<7){S.plan[i]=BY[el.value]?{name:el.value,servings:S.plan[i]?S.plan[i].servings:S.servings}:null;save();pagePlan();}}if(ds.planServ!==undefined){const p=S.plan[Number(ds.planServ)];if(p){p.servings=Math.min(24,Math.max(1,Math.round(Number(el.value)||1)));save();pagePlan();}}if(ds.shopping!==undefined&&S.shopping[Number(ds.shopping)]){S.shopping[Number(ds.shopping)].checked=el.checked;save();}if(ds.setting){const key=ds.setting;if(!['theme','palette','lang','servings','staples'].includes(key))return;const value=key==='staples'?el.checked:key==='servings'?Math.min(24,Math.max(1,Math.round(Number(el.value)||4))):el.value;Object.assign(S,cleanState(Object.assign({},S,{[key]:value})));save();applyTheme();if(key==='lang'){renderShell();route();}else if(key==='servings')el.value=S.servings;}if(el.id==='importFile')importBackup(el.files&&el.files[0]);}
function init(){applyTheme();renderShell();document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-act]');if(el&&ACTS[el.dataset.act]){e.preventDefault();ACTS[el.dataset.act](el.dataset.arg,el,e);}});document.addEventListener('input',e=>{const f=e.target.dataset&&INPUTS[e.target.dataset.input];if(f)f(e.target.value);});document.addEventListener('change',e=>handleChange(e.target));window.addEventListener('hashchange',route);document.addEventListener('visibilitychange',()=>{if(cook)tick();if(document.visibilityState==='visible')requestWake();});if(window.matchMedia){try{const media=window.matchMedia('(prefers-color-scheme: dark)');if(media.addEventListener)media.addEventListener('change',applyTheme);else if(media.addListener)media.addListener(applyTheme);}catch(e){}}route();save();if('serviceWorker'in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});}
if(window.__NP_TEST__)window.__NP={S,F,cur,ACTS,INPUTS,CHANGES,route,go,filterRecipes,groupRecipes,makePlan,amountText,fmt:fmtQty,scaled,ingSections,cmpTr,RECIPES,BY,tm,init,cleanState,canonical,hasIngredient,match,aggregate,recipeNeed,planNeed,addShopping,handleChange,pageSettings,pageDetail,pageCook,remaining,tick,recipeServings,t,label,ingredientName,applyTheme,pageWorld,pageChef,OFFER};else init();
})();
