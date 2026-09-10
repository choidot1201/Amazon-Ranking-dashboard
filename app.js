// ---------- config ----------
const SHEET_ID = '1XQoI7SSuFKbuRAeD23uQIfJu3FBXEv__6rvm68Zfo80';
const XLSX_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

const REGIONS = [
  { code: 'US', flag: '🇺🇸', name: 'US' },
  { code: 'UK', flag: '🇬🇧', name: 'UK' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
];

// brand key(s) -> {name, kr}. Keys are matched as whole-word substrings against a normalized title.
const KBEAUTY_BRANDS = [
  { name: 'Medicube', kr: '메디큐브', keys: ['medicube'] },
  { name: 'Anua', kr: '아누아', keys: ['anua'] },
  { name: 'Biodance', kr: '바이오던스', keys: ['biodance'] },
  { name: "d'Alba", kr: '달바', keys: ['dalba', "d'alba", 'd alba'] },
  { name: 'Beauty of Joseon', kr: '조선미녀', keys: ['beauty of joseon'] },
  { name: 'Celimax', kr: '셀리맥스', keys: ['celimax'] },
  { name: 'Hera', kr: '헤라', keys: ['hera'] },
  { name: 'Dr.Ceuracle', kr: '닥터엘시아', keys: ['dr ceuracle', 'dr.ceuracle'] },
  { name: 'Medi-Peel', kr: '메디필', keys: ['medi peel', 'medipeel'] },
  { name: 'COSRX', kr: '코스알엑스', keys: ['cosrx'] },
  { name: 'innisfree', kr: '이니스프리', keys: ['innisfree'] },
  { name: 'LANEIGE', kr: '라네즈', keys: ['laneige'] },
  { name: 'Some By Mi', kr: '썸바이미', keys: ['some by mi'] },
  { name: 'ISNTREE', kr: '이즈앤트리', keys: ['isntree'] },
  { name: 'SKIN1004', kr: '스킨1004', keys: ['skin1004'] },
  { name: 'Torriden', kr: '토리든', keys: ['torriden'] },
  { name: 'ROUND LAB', kr: '라운드랩', keys: ['roundlab', 'round lab'] },
  { name: 'Meditherapy', kr: '메디테라피', keys: ['meditherapy'] },
  { name: 'NOONI', kr: '누니', keys: ['nooni'] },
  { name: 'amuse', kr: '어뮤즈', keys: ['amuse'] },
  { name: 'TIRTIR', kr: '티르티르', keys: ['tirtir'] },
  { name: 'peripera', kr: '페리페라', keys: ['peripera'] },
  { name: 'rom&nd', kr: '로맨드', keys: ['romand', "rom&nd"] },
  { name: 'ETUDE', kr: '에뛰드', keys: ['etude'] },
  { name: 'MISSHA', kr: '미샤', keys: ['missha'] },
  { name: 'Goodal', kr: '구달', keys: ['goodal'] },
  { name: 'numbuzin', kr: '넘버즈인', keys: ['numbuzin'] },
  { name: 'VT Cosmetics', kr: 'VT코스메틱', keys: ['vt cosmetics'] },
  { name: 'ABIB', kr: '아비브', keys: ['abib'] },
  { name: 'Banila Co', kr: '바닐라코', keys: ['banila co', 'banila'] },
  { name: "Klairs", kr: '클레어스', keys: ['klairs'] },
  { name: 'Purito', kr: '퓨리토', keys: ['purito'] },
  { name: 'iUNIK', kr: '이니크', keys: ['iunik'] },
  { name: 'Mediheal', kr: '메디힐', keys: ['mediheal', 'medi heal'] },
  { name: "I'm From", kr: '아임프롬', keys: ['im from', "i'm from"] },
];

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['".]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchBrand(title) {
  const norm = ' ' + normalize(title) + ' ';
  for (const brand of KBEAUTY_BRANDS) {
    for (const key of brand.keys) {
      const nk = ' ' + normalize(key) + ' ';
      if (norm.includes(nk)) return brand;
    }
  }
  return null;
}

// generic brand guesser for non-K-beauty titles: brand almost always leads the
// title, so walk forward until a product-descriptor word (or delimiter) ends it.
const BRAND_STOPWORDS = new Set([
  'shea','body','lotion','lotions','cream','creams','serum','serums','mask','masks',
  'wipe','wipes','patch','patches','pad','pads','cleanser','cleansers','wash','washes',
  'toner','toners','essence','spray','sprays','balm','balms','moisturizer','moisturizers',
  'moisturizing','gel','gels','oil','oils','powder','powders','brush','brushes','kit','kits',
  'count','pack','packs','fl','oz','ml','extra','original','deep','real','hydrating',
  'double','tipped','cotton','swab','swabs','towel','towels','face','facial','skin','eye',
  'eyes','hair','makeup','remover','removers','micellar','glycolic','acid','niacinamide',
  'vitamin','retinol','peptide','peptides','collagen','sunscreen','spf','anti','aging',
  'wrinkle','wrinkles','pore','pores','exfoliating','exfoliant','pimple','acne','hydrocolloid',
  'waterproof','eyeliner','mascara','concealer','setting','protection','bar','soap',
  'sensitive','fragrance','free','hypoallergenic','round','rounds','biobased','disposable',
  'towelette','association','accepted','shaving','razor','blades','blade','refill','refills',
  'electric','trimmer','beard','protector','thermal','treatment','conditioner','shampoo',
  'dye','permanente','permanent','coloration','professionelle','with','for','and','of','to',
  'up','all','in','one','multi','pro','plus','classic','advanced','daily','night',
  'nighttime','day','overnight','travel','size',
]);

// exact multi-word brands the word-heuristic below tends to mis-split (its stopword
// list needs a common descriptor word, like "skin" or "cotton", to know where a brand
// name ends -- but a few real brands are themselves built from those words). Add an
// entry here whenever a specific title comes back wrong; this list always wins over
// the heuristic guess.
const KNOWN_BRAND_OVERRIDES = [
  { name: 'Clean Skin Club', keys: ['clean skin club'] },
];

function findOverrideBrand(title) {
  const norm = ' ' + normalize(title) + ' ';
  for (const b of KNOWN_BRAND_OVERRIDES) {
    for (const key of b.keys) {
      if (norm.includes(' ' + normalize(key) + ' ')) return b.name;
    }
  }
  return null;
}

// true if this title-word (or any hyphen/slash-joined piece of it, e.g. "Double-Tipped")
// is a generic product-descriptor word rather than part of a brand name.
function isDescriptorWord(word) {
  const parts = word.toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
  return parts.some(p => BRAND_STOPWORDS.has(p) || /^\d+%?$/.test(p));
}

function extractBrandGuess(title) {
  if (!title) return '';
  const override = findOverrideBrand(title);
  if (override) return override;

  // only split on punctuation actually used as a title separator: a comma/pipe
  // anywhere, or a dash with space on both sides. A bare hyphen inside a word
  // (Q-tips, La Roche-Posay, Bio-Oil) must NOT break the brand name apart.
  const seg = String(title).split(/\s[-–—]\s|[|,]/)[0].trim();
  const words = seg.split(/\s+/).filter(Boolean);
  const brandWords = [];
  let contentCount = 0;
  let justSawAmpersand = false;
  for (let i = 0; i < words.length && i < 6; i++) {
    const w = words[i];
    const isAmpersand = w === '&' || w.toLowerCase() === 'and';
    if (i > 0 && !isAmpersand && isDescriptorWord(w)) break;
    brandWords.push(w);
    if (isAmpersand) { justSawAmpersand = true; continue; }
    contentCount++;
    // "X & Y" brands (grace & stella, Dolce & Gabbana) end right after the word
    // that follows the "&" -- don't keep grabbing past it.
    if (justSawAmpersand) break;
    if (contentCount >= 3) break;
  }
  return (brandWords.join(' ') || words[0] || '').trim();
}

// ---------- state ----------
let workbook = null;
let regionData = {};      // code -> { items: [...], updatedAt: '' }
let crossData = [];       // cross-region catalog rows
let brandTimeSeries = { perBrand: {}, dates: [] }; // brand -> date -> region -> count
let selectedBrands = [];  // brand names shown on the trend chart (max 8)
let selectedBrandsInitialized = false;
let chartRegionFilter = 'ALL';
let brandColorSlots = {}; // brand name -> categorical palette slot (stable across renders)
let lineChartInstance = null;
let brandTableViewOn = false;
let activeTab = 'US';     // region code, 'CROSS', 'MOVERS', or 'BRANDS'
let searchTerm = '';
let kbeautyOnly = false;
let sortMode = 'rank_asc';

// ---------- fetch + parse ----------
async function loadData() {
  showLoading();
  try {
    const res = await fetch(XLSX_EXPORT_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    workbook = XLSX.read(buf, { type: 'array', cellDates: true });

    regionData = {};
    for (const r of REGIONS) {
      regionData[r.code] = buildRegion(r.code);
    }
    crossData = buildCrossRegion();
    brandTimeSeries = buildBrandTimeSeries();
    if (!selectedBrandsInitialized) {
      selectedBrands = buildBrandSnapshot().slice(0, 6).map(r => r.name);
      selectedBrands.forEach(ensureColorSlot);
      selectedBrandsInitialized = true;
    }

    document.getElementById('sheetLink').href = SHEET_EDIT_URL;
    renderAll();
    hideStates();
  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
  }
}

function sheetRows(name) {
  const ws = workbook.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
}

function toNum(v) {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function buildRegion(code) {
  const top = sheetRows(`${code} Top 100`);
  const hist = sheetRows(`${code} Rank History`);

  const updatedAt = (top[0] && top[0][0]) ? String(top[0][0]) : '';

  const headerIdx = top.findIndex(r => r[0] && String(r[0]).toLowerCase() === 'rank');
  const items = [];
  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < top.length; i++) {
      const row = top[i];
      if (!row || row[0] === null || row[0] === '') continue;
      const title = row[2] || '';
      items.push({
        rank: toNum(row[0]),
        asin: row[1],
        title,
        rating: toNum(row[3]),
        reviews: toNum(row[4]),
        price: toNum(row[5]),
        url: row[6] || '#',
        brand: matchBrand(title),
        brandGuess: '',
      });
      items[items.length - 1].brandGuess = items[items.length - 1].brand
        ? items[items.length - 1].brand.name
        : extractBrandGuess(title);
    }
  }

  // rank history: asin, title, date cols descending (today, yesterday, ...)
  const histHeaderIdx = hist.findIndex(r => r[0] && String(r[0]).toLowerCase() === 'asin');
  const histMap = {};
  if (histHeaderIdx >= 0) {
    for (let i = histHeaderIdx + 1; i < hist.length; i++) {
      const row = hist[i];
      if (!row || !row[0]) continue;
      histMap[row[0]] = row.slice(2).map(toNum); // [today, yday, ...]
    }
  }

  for (const item of items) {
    const series = histMap[item.asin];
    item.series = series || null;
    if (series && series.length > 1 && series[1] !== null) {
      item.delta = series[1] - item.rank; // positive = moved up (rank number decreased)
      item.isNew = false;
    } else {
      item.delta = null;
      item.isNew = true;
    }
  }

  return { items, updatedAt, region: code };
}

function buildCrossRegion() {
  const rows = sheetRows('Cross-Region Catalog');
  const headerIdx = rows.findIndex(r => r[1] && String(r[1]).toLowerCase() === 'asin');
  if (headerIdx < 0) return [];
  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;
    const title = row[2] || '';
    const perRegion = { US: toNum(row[6]), UK: toNum(row[7]), DE: toNum(row[8]), FR: toNum(row[9]), ES: toNum(row[10]) };
    const ranks = Object.values(perRegion).filter(v => v !== null);
    const avgRank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;
    out.push({
      asin: row[1],
      title,
      rating: toNum(row[3]),
      reviews: toNum(row[4]),
      price: toNum(row[5]),
      perRegion,
      regionsCount: toNum(row[11]) || ranks.length,
      avgRank,
      brand: matchBrand(title),
    });
  }
  out.sort((a, b) => (b.regionsCount - a.regionsCount) || (a.avgRank - b.avgRank));
  return out;
}

function isoDate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// per K-Beauty brand, per calendar day, per region: how many of that brand's
// products held a Top 100 rank. Built from the *history* tables (not today's
// Top 100) so a product that has since dropped out still counts for past days.
function buildBrandTimeSeries() {
  const perBrand = {};
  const dateSet = new Set();
  for (const r of REGIONS) {
    const hist = sheetRows(`${r.code} Rank History`);
    const headerIdx = hist.findIndex(row => row[0] && String(row[0]).toLowerCase() === 'asin');
    if (headerIdx < 0) continue;
    const dateCols = hist[headerIdx].slice(2).map(d => (d instanceof Date ? isoDate(d) : null));
    for (let i = headerIdx + 1; i < hist.length; i++) {
      const row = hist[i];
      if (!row || !row[0]) continue;
      const brand = matchBrand(row[1] || '');
      if (!brand) continue;
      for (let c = 0; c < dateCols.length; c++) {
        const dateStr = dateCols[c];
        if (!dateStr) continue;
        if (toNum(row[2 + c]) === null) continue;
        dateSet.add(dateStr);
        const byDate = (perBrand[brand.name] = perBrand[brand.name] || {});
        const byRegion = (byDate[dateStr] = byDate[dateStr] || {});
        byRegion[r.code] = (byRegion[r.code] || 0) + 1;
      }
    }
  }
  return { perBrand, dates: Array.from(dateSet).sort() };
}

function brandCountAt(brandName, dateStr, regionFilter) {
  const byRegion = brandTimeSeries.perBrand[brandName] && brandTimeSeries.perBrand[brandName][dateStr];
  if (!byRegion) return 0;
  if (regionFilter === 'ALL') return Object.values(byRegion).reduce((a, b) => a + b, 0);
  return byRegion[regionFilter] || 0;
}

// today's Top 100 snapshot, grouped by brand x region -- the source for both
// the matrix table and the default brand-chip selection.
function buildBrandSnapshot() {
  const rows = {};
  for (const r of REGIONS) {
    const items = regionData[r.code] ? regionData[r.code].items : [];
    for (const it of items) {
      if (!it.brand) continue;
      const row = (rows[it.brand.name] = rows[it.brand.name] || { name: it.brand.name, US: 0, UK: 0, DE: 0, FR: 0, ES: 0, total: 0 });
      row[r.code] += 1;
      row.total += 1;
    }
  }
  return Object.values(rows).sort((a, b) => b.total - a.total);
}

const CATEGORICAL_PALETTE_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const CATEGORICAL_PALETTE_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
function isDarkMode() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function currentPalette() { return isDarkMode() ? CATEGORICAL_PALETTE_DARK : CATEGORICAL_PALETTE_LIGHT; }

// stable color-per-brand: an already-assigned slot never changes just because
// other brands are toggled on/off (color follows the entity, not its rank).
function ensureColorSlot(brandName) {
  if (brandColorSlots[brandName] !== undefined) return brandColorSlots[brandName];
  const used = new Set(Object.values(brandColorSlots));
  for (let i = 0; i < CATEGORICAL_PALETTE_LIGHT.length; i++) {
    if (!used.has(i)) { brandColorSlots[brandName] = i; return i; }
  }
  return CATEGORICAL_PALETTE_LIGHT.length - 1;
}
function freeColorSlot(brandName) { delete brandColorSlots[brandName]; }

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function formatDateShort(iso) { const [, m, d] = iso.split('-'); return `${parseInt(m, 10)}/${parseInt(d, 10)}`; }

// ---------- rendering ----------
function showLoading() {
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('panelRegion').classList.add('hidden');
  document.getElementById('panelCross').classList.add('hidden');
  document.getElementById('panelMovers').classList.add('hidden');
  document.querySelector('.controls').style.visibility = 'hidden';
  document.getElementById('statRow').innerHTML = '';
}

function hideStates() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.querySelector('.controls').style.visibility = 'visible';
}

function showError(msg) {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('errorState').classList.remove('hidden');
  document.getElementById('errorDetail').textContent = msg;
}

function fmtUpdated() {
  const stamps = REGIONS.map(r => regionData[r.code] && regionData[r.code].updatedAt).filter(Boolean);
  if (!stamps.length) return '—';
  return stamps.sort().slice(-1)[0];
}

function renderAll() {
  document.getElementById('updatedAt').textContent = `🕒 as of ${fmtUpdated()}`;
  renderTabs();
  renderPanel();
}

function renderTabs() {
  const wrap = document.getElementById('regionTabs');
  wrap.innerHTML = '';
  for (const r of REGIONS) {
    const data = regionData[r.code];
    const kbCount = data ? data.items.filter(i => i.brand).length : 0;
    const btn = document.createElement('button');
    btn.className = 'region-tab' + (activeTab === r.code ? ' active' : '');
    btn.innerHTML = `<span class="flag">${r.flag}</span>${r.name}<span class="kb-count">${kbCount}</span>`;
    btn.onclick = () => { activeTab = r.code; searchTerm = ''; document.getElementById('searchInput').value=''; renderAll(); };
    wrap.appendChild(btn);
  }
  const crossBtn = document.createElement('button');
  crossBtn.className = 'region-tab special' + (activeTab === 'CROSS' ? ' active' : '');
  crossBtn.innerHTML = `🌍 Cross-Region`;
  crossBtn.onclick = () => { activeTab = 'CROSS'; renderAll(); };
  wrap.appendChild(crossBtn);

  const moversBtn = document.createElement('button');
  moversBtn.className = 'region-tab' + (activeTab === 'MOVERS' ? ' active' : '');
  moversBtn.innerHTML = `📈 Movers`;
  moversBtn.onclick = () => { activeTab = 'MOVERS'; renderAll(); };
  wrap.appendChild(moversBtn);

  const brandsBtn = document.createElement('button');
  brandsBtn.className = 'region-tab' + (activeTab === 'BRANDS' ? ' active' : '');
  brandsBtn.innerHTML = `📊 Brand Trends`;
  brandsBtn.onclick = () => { activeTab = 'BRANDS'; renderAll(); };
  wrap.appendChild(brandsBtn);
}

function renderPanel() {
  const regionPanel = document.getElementById('panelRegion');
  const crossPanel = document.getElementById('panelCross');
  const moversPanel = document.getElementById('panelMovers');
  const brandsPanel = document.getElementById('panelBrands');
  const controls = document.querySelector('.controls');

  regionPanel.classList.add('hidden');
  crossPanel.classList.add('hidden');
  moversPanel.classList.add('hidden');
  brandsPanel.classList.add('hidden');

  if (activeTab === 'CROSS') {
    controls.style.display = 'flex';
    document.getElementById('sortSelect').querySelectorAll('option[value^="delta"]').forEach(o => o.disabled = true);
    crossPanel.classList.remove('hidden');
    renderStatsCross();
    renderCrossTable();
  } else if (activeTab === 'MOVERS') {
    controls.style.display = 'none';
    moversPanel.classList.remove('hidden');
    renderStatsMovers();
    renderMovers();
  } else if (activeTab === 'BRANDS') {
    controls.style.display = 'none';
    brandsPanel.classList.remove('hidden');
    renderStatsBrands();
    renderBrandMatrix();
    renderBrandChips();
    renderBrandChart();
  } else {
    controls.style.display = 'flex';
    document.getElementById('sortSelect').querySelectorAll('option[value^="delta"]').forEach(o => o.disabled = false);
    regionPanel.classList.remove('hidden');
    renderStatsRegion();
    renderRegionTable();
  }
}

function stars(rating) {
  if (rating === null) return '<span class="stars">–</span>';
  const full = Math.round(rating);
  return `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}

function deltaPill(item) {
  if (item.isNew) return `<span class="delta-pill new">NEW</span>`;
  if (item.delta === null) return `<span class="delta-pill flat">–</span>`;
  if (item.delta > 0) return `<span class="delta-pill up">▲ ${item.delta}</span>`;
  if (item.delta < 0) return `<span class="delta-pill down">▼ ${Math.abs(item.delta)}</span>`;
  return `<span class="delta-pill flat">– 0</span>`;
}

function brandBadge(item) {
  if (!item.brand) return '';
  return `<span class="kb-badge" title="${item.brand.kr}">🇰🇷 ${item.brand.name}</span>`;
}

function brandCell(item) {
  if (item.brand) return `<span class="kb-badge" title="${item.brand.kr}">🇰🇷 ${item.brand.name}</span>`;
  if (item.brandGuess) return `<span class="brand-pill" title="${escapeHtml(item.brandGuess)}">${escapeHtml(item.brandGuess)}</span>`;
  return `<span class="brand-pill empty">–</span>`;
}

function filterAndSort(items) {
  let list = items.slice();
  if (kbeautyOnly) list = list.filter(i => i.brand);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(i => (i.title || '').toLowerCase().includes(q) || (i.brandGuess || '').toLowerCase().includes(q));
  }
  switch (sortMode) {
    case 'rank_asc': list.sort((a, b) => a.rank - b.rank); break;
    case 'delta_desc': list.sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999)); break;
    case 'delta_asc': list.sort((a, b) => (a.delta ?? 999) - (b.delta ?? 999)); break;
    case 'rating_desc': list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1)); break;
    case 'reviews_desc': list.sort((a, b) => (b.reviews ?? -1) - (a.reviews ?? -1)); break;
    case 'price_asc': list.sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12)); break;
    case 'price_desc': list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1)); break;
  }
  return list;
}

function renderStatsRegion() {
  const data = regionData[activeTab];
  const items = data ? data.items : [];
  const kbItems = items.filter(i => i.brand);
  const avgKbRank = kbItems.length ? Math.round(kbItems.reduce((a, i) => a + i.rank, 0) / kbItems.length) : '–';
  const newCount = items.filter(i => i.isNew).length;
  const topBrandCounts = {};
  kbItems.forEach(i => { topBrandCounts[i.brand.name] = (topBrandCounts[i.brand.name] || 0) + 1; });
  const topBrand = Object.entries(topBrandCounts).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('statRow').innerHTML = `
    ${statCard('K-Beauty in Top 100', `${kbItems.length}`, `${items.length ? Math.round(kbItems.length/items.length*100) : 0}% of total`, true)}
    ${statCard('K-Beauty Avg Rank', avgKbRank === '–' ? '–' : `#${avgKbRank}`, 'among entries')}
    ${statCard('Top Brand', topBrand ? topBrand[0] : '–', topBrand ? `${topBrand[1]} products` : '')}
    ${statCard('New Entries Today', `${newCount}`, 'across Top 100')}
  `;
}

function renderStatsCross() {
  const kbCross = crossData.filter(i => i.brand);
  const fiveRegion = crossData.filter(i => i.regionsCount >= 5).length;
  const kbFive = kbCross.filter(i => i.regionsCount >= 5).length;
  document.getElementById('statRow').innerHTML = `
    ${statCard('Cross-Region Products', `${crossData.length}`, 'in 2+ regions’ Top 100')}
    ${statCard('K-Beauty Products', `${kbCross.length}`, `${crossData.length ? Math.round(kbCross.length/crossData.length*100) : 0}% of total`, true)}
    ${statCard('In All 5 Regions', `${fiveRegion}`, `${kbFive} of these are K-Beauty`)}
    ${statCard('Regions Tracked', '5', 'US · UK · DE · FR · ES')}
  `;
}

function renderStatsMovers() {
  const all = REGIONS.flatMap(r => (regionData[r.code] ? regionData[r.code].items.map(i => ({...i, region: r.code})) : []));
  const newCount = all.filter(i => i.isNew).length;
  const kbNew = all.filter(i => i.isNew && i.brand).length;
  const gainers = all.filter(i => i.delta > 0);
  const avgGain = gainers.length ? Math.round(gainers.reduce((a,i)=>a+i.delta,0)/gainers.length) : 0;
  document.getElementById('statRow').innerHTML = `
    ${statCard('New Entries', `${newCount}`, `${kbNew} of these are K-Beauty`, true)}
    ${statCard('Rising Products', `${gainers.length}`, `avg +${avgGain} spots`)}
    ${statCard('Falling Products', `${all.filter(i=>i.delta<0).length}`, 'vs yesterday')}
    ${statCard('Regions Tracked', '5', 'US · UK · DE · FR · ES')}
  `;
}

function renderStatsBrands() {
  const snap = buildBrandSnapshot();
  const top = snap[0];
  const allFive = snap.filter(r => r.US > 0 && r.UK > 0 && r.DE > 0 && r.FR > 0 && r.ES > 0).length;
  const days = brandTimeSeries.dates.length;
  const firstDay = brandTimeSeries.dates[0];
  document.getElementById('statRow').innerHTML = `
    ${statCard('K-Beauty Brands Tracked', `${snap.length}`, 'with a Top 100 entry')}
    ${statCard('Top Brand', top ? top.name : '–', top ? `${top.total} total entries` : '', true)}
    ${statCard('In All 5 Regions', `${allFive}`, 'brands')}
    ${statCard('Days Tracked', `${days}`, firstDay ? `since ${firstDay}` : '')}
  `;
}

function renderBrandMatrix() {
  const snap = buildBrandSnapshot();
  const body = document.getElementById('brandMatrixBody');
  if (!snap.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty-note">No data available.</td></tr>`;
    return;
  }
  const maxTotal = snap[0].total || 1;
  const matrixCell = count => {
    if (!count) return `<td class="col-regions matrix-cell"><span class="matrix-empty">–</span></td>`;
    const alpha = (0.12 + Math.min(1, count / maxTotal) * 0.55).toFixed(2);
    return `<td class="col-regions matrix-cell"><span class="matrix-value" style="background: rgba(130,220,40,${alpha})">${count}</span></td>`;
  };
  body.innerHTML = snap.map(r => `
    <tr>
      <td class="brand-name-cell">${escapeHtml(r.name)}</td>
      ${REGIONS.map(rg => matrixCell(r[rg.code])).join('')}
      <td class="col-count"><span class="count-badge">${r.total}</span></td>
    </tr>
  `).join('');
}

function renderBrandChips() {
  const snap = buildBrandSnapshot();
  const snapTotals = Object.fromEntries(snap.map(r => [r.name, r.total]));
  const allNames = new Set([...Object.keys(brandTimeSeries.perBrand), ...snap.map(r => r.name)]);
  const list = Array.from(allNames).sort((a, b) => (snapTotals[b] || 0) - (snapTotals[a] || 0) || a.localeCompare(b));

  const wrap = document.getElementById('brandChips');
  const palette = currentPalette();
  wrap.innerHTML = list.map(name => {
    const active = selectedBrands.includes(name);
    const dot = active ? palette[ensureColorSlot(name)] : '';
    return `<button class="brand-chip${active ? ' active' : ''}" onclick="toggleBrandSelection('${escapeAttr(name)}')">
      <span class="brand-chip-dot" style="${dot ? `background:${dot}` : ''}"></span>${escapeHtml(name)}
    </button>`;
  }).join('');
}

function toggleBrandSelection(name) {
  if (selectedBrands.includes(name)) {
    selectedBrands = selectedBrands.filter(n => n !== name);
    freeColorSlot(name);
  } else {
    if (selectedBrands.length >= 8) return; // categorical palette caps out at 8 series
    selectedBrands.push(name);
    ensureColorSlot(name);
  }
  renderBrandChips();
  renderBrandChart();
}

function renderBrandChart() {
  const canvasWrap = document.querySelector('#panelBrands .chart-wrap');
  const tableWrap = document.getElementById('brandTableWrap');
  const toggleBtn = document.getElementById('chartTableToggle');

  if (brandTableViewOn) {
    canvasWrap.classList.add('hidden');
    tableWrap.classList.remove('hidden');
    toggleBtn.textContent = 'View as chart';
    renderBrandDataTable();
    return;
  }
  canvasWrap.classList.remove('hidden');
  tableWrap.classList.add('hidden');
  toggleBtn.textContent = 'View as table';

  const dates = brandTimeSeries.dates;
  const labels = dates.map(formatDateShort);
  const palette = currentPalette();
  const datasets = selectedBrands.map(name => {
    const color = palette[ensureColorSlot(name)];
    return {
      label: name,
      data: dates.map(d => brandCountAt(name, d, chartRegionFilter)),
      borderColor: color,
      backgroundColor: color,
      pointBackgroundColor: color,
      pointBorderColor: cssVar('--surface'),
      pointBorderWidth: 2,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.25,
      fill: false,
    };
  });

  const canvas = document.getElementById('brandLineChart');
  if (lineChartInstance) lineChartInstance.destroy();

  if (!dates.length || !selectedBrands.length) {
    lineChartInstance = null;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  lineChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: cssVar('--surface'),
          titleColor: cssVar('--text'),
          bodyColor: cssVar('--text-soft'),
          borderColor: cssVar('--border'),
          borderWidth: 1,
          padding: 10,
          usePointStyle: true,
          boxPadding: 4,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: cssVar('--text-faint'), font: { size: 11 } } },
        y: { beginAtZero: true, ticks: { precision: 0, color: cssVar('--text-faint'), font: { size: 11 } }, grid: { color: cssVar('--border') } },
      },
    },
  });
}

function renderBrandDataTable() {
  const head = document.getElementById('brandDataTableHead');
  const body = document.getElementById('brandDataTableBody');
  const dates = brandTimeSeries.dates;
  head.innerHTML = `<tr><th>Date</th>${selectedBrands.map(n => `<th>${escapeHtml(n)}</th>`).join('')}</tr>`;
  if (!dates.length || !selectedBrands.length) {
    body.innerHTML = `<tr><td class="empty-note">Select a brand to display.</td></tr>`;
    return;
  }
  body.innerHTML = dates.slice().reverse().map(d => `
    <tr><td>${d}</td>${selectedBrands.map(n => `<td>${brandCountAt(n, d, chartRegionFilter)}</td>`).join('')}</tr>
  `).join('');
}

function statCard(label, value, sub, accent) {
  return `<div class="stat-card${accent ? ' accent' : ''}">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-sub">${sub || ''}</div>
  </div>`;
}

function renderRegionTable() {
  const data = regionData[activeTab];
  const items = data ? filterAndSort(data.items) : [];
  const body = document.getElementById('regionTableBody');
  if (!items.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty-note">No products match the current filters.</td></tr>`;
    return;
  }
  body.innerHTML = items.map(item => `
    <tr class="${item.brand ? 'is-kbeauty' : ''}" onclick="openDetail('${escapeAttr(item.asin)}', '${activeTab}')">
      <td class="col-rank"><span class="rank-badge ${item.rank <= 3 ? 'top3' : ''}">${item.rank}</span></td>
      <td class="col-brand">${brandCell(item)}</td>
      <td class="col-product">
        <div class="product-cell">
          <div>
            <div class="product-title">${escapeHtml(item.title)}</div>
            <div class="product-meta"><span class="reviews-count">${item.reviews !== null ? item.reviews.toLocaleString() : '–'} reviews</span></div>
          </div>
        </div>
      </td>
      <td class="col-rating rating-cell"><span class="rating-num">${item.rating ?? '–'}</span>${stars(item.rating)}</td>
      <td class="col-price price-cell">${item.price !== null ? '$' + item.price.toFixed(2) : '–'}</td>
      <td class="col-delta">${deltaPill(item)}</td>
    </tr>
  `).join('');
}

function regionPill(rank) {
  if (rank === null || rank === undefined) return `<span class="region-rank-pill empty">–</span>`;
  return `<span class="region-rank-pill">${rank}</span>`;
}

function renderCrossTable() {
  let list = crossData.slice();
  if (kbeautyOnly) list = list.filter(i => i.brand);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(i => (i.title || '').toLowerCase().includes(q) || (i.brand && i.brand.name.toLowerCase().includes(q)));
  }
  switch (sortMode) {
    case 'rating_desc': list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1)); break;
    case 'reviews_desc': list.sort((a, b) => (b.reviews ?? -1) - (a.reviews ?? -1)); break;
    case 'price_asc': list.sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12)); break;
    case 'price_desc': list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1)); break;
    default: list.sort((a, b) => (b.regionsCount - a.regionsCount) || (a.avgRank - b.avgRank));
  }

  const body = document.getElementById('crossTableBody');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8" class="empty-note">No products match the current filters.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(item => `
    <tr class="${item.brand ? 'is-kbeauty' : ''}" onclick="openCrossDetail('${escapeAttr(item.asin)}')">
      <td class="col-rank"><span class="rank-badge">${item.avgRank ? item.avgRank.toFixed(1) : '–'}</span></td>
      <td class="col-product">
        <div class="product-cell">
          <div>
            <div class="product-title">${escapeHtml(item.title)}</div>
            <div class="product-meta">${brandBadge(item)}<span class="reviews-count">${item.reviews !== null ? item.reviews.toLocaleString() : '–'} reviews</span></div>
          </div>
        </div>
      </td>
      <td class="col-regions">${regionPill(item.perRegion.US)}</td>
      <td class="col-regions">${regionPill(item.perRegion.UK)}</td>
      <td class="col-regions">${regionPill(item.perRegion.DE)}</td>
      <td class="col-regions">${regionPill(item.perRegion.FR)}</td>
      <td class="col-regions">${regionPill(item.perRegion.ES)}</td>
      <td class="col-count"><span class="count-badge">${item.regionsCount}</span></td>
    </tr>
  `).join('');
}

function renderMovers() {
  const all = REGIONS.flatMap(r => (regionData[r.code] ? regionData[r.code].items.map(i => ({ ...i, region: r.code })) : []));
  const flagOf = code => REGIONS.find(r => r.code === code).flag;

  const newItems = all.filter(i => i.isNew).sort((a, b) => a.rank - b.rank).slice(0, 15);
  const upItems = all.filter(i => i.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 15);
  const downItems = all.filter(i => i.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 15);

  const card = (i, kind) => `
    <div class="mover-item" onclick="openDetail('${escapeAttr(i.asin)}', '${i.region}')">
      <div class="mover-top">
        <span class="mover-flag">${flagOf(i.region)} #${i.rank}</span>
        ${kind === 'new' ? `<span class="delta-pill new">NEW</span>` : deltaPill(i)}
      </div>
      <div class="mover-title">${escapeHtml(i.title)}${i.brand ? ' 🇰🇷' : ''}</div>
    </div>`;

  document.getElementById('moversNew').innerHTML = newItems.length ? newItems.map(i => card(i, 'new')).join('') : `<div class="empty-note">No new entries today.</div>`;
  document.getElementById('moversUp').innerHTML = upItems.length ? upItems.map(i => card(i, 'up')).join('') : `<div class="empty-note">No gainer data.</div>`;
  document.getElementById('moversDown').innerHTML = downItems.length ? downItems.map(i => card(i, 'down')).join('') : `<div class="empty-note">No decliner data.</div>`;
}

// ---------- detail modal ----------
function openDetail(asin, regionCode) {
  const item = regionData[regionCode].items.find(i => i.asin === asin);
  if (!item) return;
  renderModal(item, [regionCode]);
}
function openCrossDetail(asin) {
  const item = crossData.find(i => i.asin === asin);
  if (!item) return;
  const regions = Object.entries(item.perRegion).filter(([,v]) => v !== null).map(([k]) => k);
  renderModal(item, regions, item.perRegion);
}
function renderModal(item, regions, perRegion) {
  const flagLine = regions.map(code => {
    const r = REGIONS.find(x => x.code === code);
    const rank = perRegion ? perRegion[code] : item.rank;
    return `${r.flag} #${rank}`;
  }).join('  ·  ');
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-title">${escapeHtml(item.title)}</div>
    ${item.brand ? `<div class="product-meta">${brandBadge(item)}</div>` : ''}
    <div class="modal-row"><span>Rank</span><span>${flagLine}</span></div>
    <div class="modal-row"><span>Rating</span><span>${item.rating ?? '–'} ${stars(item.rating)}</span></div>
    <div class="modal-row"><span>Reviews</span><span>${item.reviews !== null ? item.reviews.toLocaleString() : '–'}</span></div>
    <div class="modal-row"><span>Price</span><span>${item.price !== null ? '$' + item.price.toFixed(2) : '–'}</span></div>
    ${item.asin ? `<div class="modal-row"><span>ASIN</span><span>${item.asin}</span></div>` : ''}
    <a class="modal-link" href="${item.url || ('https://www.amazon.com/dp/' + item.asin)}" target="_blank" rel="noopener">View on Amazon ↗</a>
  `;
  document.getElementById('detailModal').classList.remove('hidden');
}
function closeModal() { document.getElementById('detailModal').classList.add('hidden'); }

// ---------- helpers ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return String(s).replace(/'/g, "\\'"); }

// ---------- events ----------
document.getElementById('refreshBtn').addEventListener('click', () => {
  document.getElementById('refreshBtn').classList.add('spinning');
  loadData().finally(() => document.getElementById('refreshBtn').classList.remove('spinning'));
});
document.getElementById('searchInput').addEventListener('input', e => { searchTerm = e.target.value; renderPanel(); });
document.getElementById('kbeautyToggle').addEventListener('change', e => { kbeautyOnly = e.target.checked; renderPanel(); });
document.getElementById('sortSelect').addEventListener('change', e => { sortMode = e.target.value; renderPanel(); });
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('chartRegionSelect').addEventListener('change', e => { chartRegionFilter = e.target.value; renderBrandChart(); });
document.getElementById('chartTableToggle').addEventListener('click', () => { brandTableViewOn = !brandTableViewOn; renderBrandChart(); });
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (activeTab === 'BRANDS' && !brandTableViewOn) renderBrandChart();
  });
}

loadData();
