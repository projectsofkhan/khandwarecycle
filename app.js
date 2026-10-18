/* ============================================
   Khandwa Recycles — app.js
   ============================================ */
(async function () {
  'use strict';

  /* ---------- Data ---------- */
  let cityData, geojson, zonesById, averages;
  try {
    const [cityRes, geoRes] = await Promise.all([
      fetch('data.json').then(r => r.json()),
      fetch('zones.geojson').then(r => r.json())
    ]);
    cityData = cityRes;
    geojson = geoRes;
    zonesById = Object.fromEntries(cityData.zones.map(z => [z.id, z]));

    const keys = ['recycle_pct', 'plastic_pct', 'greenery_pct', 'cleanliness_pct'];
    averages = {};
    keys.forEach(k => {
      averages[k] = cityData.zones.reduce((s, z) => s + z[k], 0) / cityData.zones.length;
    });
  } catch (err) {
    console.error('[Khandwa Recycles] Failed to load data:', err);
    return;
  }

  /* ---------- Sentiment ---------- */
  const SENTIMENT_HEX = { bad: '#dc2626', mid: '#d97706', good: '#16a34a' };
  function sentimentHex(s) { return SENTIMENT_HEX[s] || '#111'; }

  function metricInfo(zone, key) {
    const value = zone[key + '_pct'];
    if (key === 'plastic') {
      if (value <= 10) return { value, label: 'Low', sentiment: 'good' };
      if (value <= 12) return { value, label: 'Moderate', sentiment: 'mid' };
      return { value, label: 'High', sentiment: 'bad' };
    }
    if (key === 'recycle') {
      if (value < 20) return { value, label: 'Low', sentiment: 'bad' };
      if (value < 30) return { value, label: 'Moderate', sentiment: 'mid' };
      return { value, label: 'Higher', sentiment: 'good' };
    }
    if (key === 'greenery') {
      if (value < 10) return { value, label: 'Low', sentiment: 'bad' };
      if (value < 15) return { value, label: 'Moderate', sentiment: 'mid' };
      return { value, label: 'Higher', sentiment: 'good' };
    }
    if (key === 'cleanliness') {
      if (value < 50) return { value, label: 'Low', sentiment: 'bad' };
      if (value < 65) return { value, label: 'Moderate', sentiment: 'mid' };
      return { value, label: 'Higher', sentiment: 'good' };
    }
    return { value, label: '—', sentiment: 'mid' };
  }

  function sentimentClass(s) { return s === 'bad' ? 'val-bad' : s === 'mid' ? 'val-mid' : 'val-good'; }

  /* ---------- Tips ---------- */
  const TIP_LIBRARY = {
    recycle_low: { title: 'Separate your dry waste', body: 'Recycling access here is well below the city average. Keep bottles, paper, and metal separate from wet waste, and hand the dry waste directly to a kabadiwala — most pay by weight, and the trip takes ten minutes a week.' },
    recycle_mod: { title: 'Ask about collection', body: 'Recycling access here is moderate. If your collection vehicle does not take dry waste separately, ask the ward office why. Informal scrap networks in this area pick up more than the formal system does.' },
    recycle_high: { title: 'Keep the system working', body: 'This area recycles above the city average. Support your local kabadiwala, and encourage neighbours to segregate — the gap between here and weaker zones is mostly habit.' },
    greenery_low: { title: 'Plant for shade', body: 'Greenery here is far below average. Even one tree per household would change your street. Neem, peepal, and gulmohar need little water and give shade within three years. Give a sapling at weddings and ceremonies instead of a gift item.' },
    greenery_mod: { title: 'Add more green', body: 'Greenery here sits below the city average. Plant along your lane, in your society compound, or on your terrace. Ask your ward councillor to plant on unused plots.' },
    greenery_high: { title: 'Protect what exists', body: 'This area is greener than most of Khandwa. Protect the trees that exist. If you see a tree being cut without permission, report it — trees take decades to replace.' },
    plastic_low: { title: 'Refuse single-use plastic', body: 'Plastic makes up an unusually large share of waste here. Refuse single-use bags at shops — carry a cloth bag. Buy loose grains instead of sachets. Wash bottles before selling them to scrap dealers so they actually get recycled.' },
    plastic_mod: { title: 'Keep plastic out of the mix', body: 'Plastic share here is slightly above average. Small habits help — buy loose, refuse cutlery, reuse containers before discarding them.' },
    plastic_high: { title: 'Plastic is already low here', body: 'Plastic share here is below the city average. Keep it that way — small habits compound over years.' },
    cleanliness_low: { title: 'Put your bins out', body: 'Cleanliness scores are well below average here. Keep wet and dry bins separate, and put them out on collection days. Do not dump on empty plots or in drains — that clogs the system and creates disease vectors. Report missed collection to your ward office.' },
    cleanliness_mod: { title: 'Tighten the daily habit', body: 'Cleanliness here is moderate. The single biggest thing you can do is stop using empty plots or road edges as dumps — those become permanent once started.' },
    cleanliness_high: { title: 'Set the example', body: 'Cleanliness here is above average. Encourage neighbours who slip. Cleanliness in this city is contagious in both directions.' }
  };

  function tipsFor(zone) {
    const picks = [];
    const sent = (k) => metricInfo(zone, k).sentiment;
    const addIf = (metricKey, prefix, priority) => {
      const s = sent(metricKey);
      const suffix = s === 'bad' ? 'low' : s === 'mid' ? 'mod' : 'high';
      picks.push({ key: prefix + '_' + suffix, priority });
    };
    addIf('recycle', 'recycle', 1);
    addIf('greenery', 'greenery', 1.1);
    addIf('plastic', 'plastic', 1.2);
    addIf('cleanliness', 'cleanliness', 1.3);
    const weight = (p) => {
      const parts = p.key.split('_');
      const suffix = parts[parts.length - 1];
      return p.priority * (suffix === 'low' ? 1 : suffix === 'mod' ? 2 : 3);
    };
    picks.sort((a, b) => weight(a) - weight(b));
    return picks.slice(0, 3).map(p => TIP_LIBRARY[p.key]);
  }

  /* ---------- Zone grid ---------- */
  const zoneGrid = document.getElementById('zone-grid');
  zoneGrid.innerHTML = cityData.zones.map(z => {
    const info = metricInfo(z, 'recycle');
    return `
      <button class="zone-btn" type="button" data-zone="${z.id}" data-sentiment="${info.sentiment}">
        <span class="zone-btn-top">
          <span class="zone-name">${z.name}</span>
          <span class="zone-dot" aria-hidden="true"></span>
        </span>
        <span class="zone-pct">${z.recycle_pct}%</span>
        <span class="zone-pct-label">recycling access</span>
      </button>
    `;
  }).join('');

  /* ---------- Compare table ---------- */
  const compareTable = document.getElementById('compare-table');
  const metrics = [
    { key: 'recycle_pct', label: 'Recycling' },
    { key: 'plastic_pct', label: 'Plastic' },
    { key: 'greenery_pct', label: 'Greenery' },
    { key: 'cleanliness_pct', label: 'Cleanliness' }
  ];
  function buildTable() {
    const head = `<tr><th>Area</th>${metrics.map(m => `<th>${m.label}</th>`).join('')}</tr>`;
    const rows = cityData.zones.map(z => {
      const cells = metrics.map(m => {
        const info = metricInfo(z, m.key.replace('_pct', ''));
        return `<td class="${sentimentClass(info.sentiment)}">${info.value}%</td>`;
      }).join('');
      return `<tr><td>${z.name}</td>${cells}</tr>`;
    }).join('');
    const avgCells = metrics.map(m => `<td>${averages[m.key].toFixed(1)}%</td>`).join('');
    const avgRow = `<tr class="row-avg"><td>Khandwa average</td>${avgCells}</tr>`;
    return `<table>${head}${rows}${avgRow}</table>`;
  }
  compareTable.innerHTML = buildTable();

  /* ---------- Map ---------- */
  const map = L.map('map', { scrollWheelZoom: false, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: 'OpenStreetMap' }).addTo(map);
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur',  () => map.scrollWheelZoom.disable());

  function styleFor(feature) {
    const zone = zonesById[feature.properties.id];
    const info = metricInfo(zone || {}, 'recycle');
    return { color: '#ffffff', weight: 1.5, opacity: 1, fillColor: sentimentHex(info.sentiment), fillOpacity: 0.75 };
  }
  function hoverStyle(feature) { return Object.assign({}, styleFor(feature), { weight: 2.5, fillOpacity: 0.95 }); }

  const layer = L.geoJSON(geojson, {
    style: styleFor,
    onEachFeature: (feature, l) => {
      const zone = zonesById[feature.properties.id];
      if (!zone) return;
      l.bindTooltip(zone.name + ' · ' + zone.recycle_pct + '% recycling access', { sticky: true, direction: 'top', className: 'zone-tooltip', offset: [0, -6] });
      l.on('mouseover', () => l.setStyle(hoverStyle(feature)));
      l.on('mouseout',  () => l.setStyle(styleFor(feature)));
      l.on('click', () => showDetail(feature.properties.id));
    }
  }).addTo(map);
  map.fitBounds(layer.getBounds(), { padding: [32, 32] });

  /* ---------- Views ---------- */
  const viewLanding = document.getElementById('view-landing');
  const viewDetail = document.getElementById('view-detail');

  document.querySelectorAll('[data-zone]').forEach(btn => {
    btn.addEventListener('click', () => showDetail(btn.dataset.zone));
  });
  document.getElementById('back-btn').addEventListener('click', showLanding);
  document.getElementById('back-btn-2').addEventListener('click', showLanding);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !viewDetail.hidden) showLanding(); });

  function showDetail(id) {
    const zone = zonesById[id];
    if (!zone) return;
    renderDetail(zone);
    viewLanding.hidden = true;
    viewLanding.classList.add('is-hidden');
    viewDetail.hidden = false;
    viewDetail.classList.remove('is-hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
    observeReveals();
  }
  function showLanding() {
    viewDetail.hidden = true;
    viewDetail.classList.add('is-hidden');
    viewLanding.hidden = false;
    viewLanding.classList.remove('is-hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
    observeReveals();
  }

  /* ---------- Detail ---------- */
  function renderDetail(zone) {
    const recycle = metricInfo(zone, 'recycle');
    document.getElementById('view-detail').style.setProperty('--zone-color', sentimentHex(recycle.sentiment));
    document.getElementById('view-detail').style.setProperty('--zone-tint', recycle.sentiment === 'bad' ? 'var(--red-tint)' : recycle.sentiment === 'mid' ? 'var(--amber-tint)' : 'var(--green-tint)');

    document.getElementById('zone-title').textContent = zone.name;
    document.getElementById('zone-wards').textContent = 'Wards ' + zone.wards.join(', ');
    document.getElementById('zone-status-pill').textContent = recycle.label + ' recycling access';

    const imageEl = document.getElementById('zone-image');
    if (zone.image) {
      imageEl.innerHTML = `<img src="${zone.image}" alt="${zone.name}" loading="lazy" /><figcaption>${zone.image_caption || 'Representative image of Khandwa.'}</figcaption>`;
    } else {
      imageEl.innerHTML = '';
    }

    document.getElementById('zone-metrics').innerHTML = renderMetrics(zone);
    document.getElementById('zone-compare').innerHTML = renderCompare(zone, recycle);
    document.getElementById('tips-list').innerHTML = renderTips(zone);

    const badgeClass = zone.source === 'official' ? 'badge-official' : 'badge-estimate';
    const badgeText  = zone.source === 'official' ? 'Official figures' : 'Illustrative estimates';
    document.getElementById('zone-source').innerHTML = `<span class="${badgeClass}">${badgeText}</span> — area-level figures are modelled from observed service patterns, not official ward data. City-level figures on the main page are official.`;

    requestAnimationFrame(() => {
      document.querySelectorAll('.compare-fill').forEach(el => {
        if (el.dataset.width) el.style.width = el.dataset.width + '%';
      });
    });
  }

  function renderMetrics(zone) {
    const keys = [
      { key: 'recycle', label: 'Recycling access' },
      { key: 'plastic', label: 'Plastic share' },
      { key: 'greenery', label: 'Greenery' },
      { key: 'cleanliness', label: 'Cleanliness' }
    ];
    return keys.map(k => {
      const info = metricInfo(zone, k.key);
      return `
        <div class="metric" data-sentiment="${info.sentiment}">
          <div class="metric-head">
            <span class="metric-dot" aria-hidden="true"></span>
            <span class="metric-label">${k.label}</span>
          </div>
          <span class="metric-value">${info.value}<span class="metric-unit">%</span></span>
          <span class="metric-status">${info.label}</span>
        </div>
      `;
    }).join('');
  }

  function renderCompare(zone, recycle) {
    const rows = metrics.map(m => {
      const key = m.key;
      const zoneVal = zone[key];
      const avgVal = averages[key];
      const info = metricInfo(zone, key.replace('_pct', ''));
      return `
        <div class="compare-row">
          <span class="compare-label">${m.label}</span>
          <div class="compare-track"><div class="compare-fill" data-width="${zoneVal}" style="background:${sentimentHex(info.sentiment)};"></div></div>
          <span class="compare-value">${zoneVal}%</span>
        </div>
        <div class="compare-row">
          <span class="compare-label">${m.label} · Khandwa average</span>
          <div class="compare-track"><div class="compare-fill" data-width="${avgVal.toFixed(1)}" style="background:#a3a3a3;"></div></div>
          <span class="compare-value">${avgVal.toFixed(1)}%</span>
        </div>
      `;
    }).join('');

    const diff = zone.recycle_pct - averages.recycle_pct;
    const absDiff = Math.abs(diff).toFixed(1).replace(/\.0$/, '');
    const summary = Math.abs(diff) < 0.05
      ? `${zone.name} sits exactly at the eight-area average for recycling access.`
      : diff > 0
        ? `${zone.name} sits ${absDiff} points above the eight-area average of ${averages.recycle_pct.toFixed(1)}% for recycling access.`
        : `${zone.name} sits ${absDiff} points below the eight-area average of ${averages.recycle_pct.toFixed(1)}% for recycling access.`;

    return `<p class="compare-heading">Compared with the Khandwa average</p>${rows}<p class="compare-summary">${summary}</p>`;
  }

  function renderTips(zone) {
    return tipsFor(zone).map((tip, i) => `
      <li class="tip">
        <span class="tip-num">${String(i + 1).padStart(2, '0')}</span>
        <div class="tip-content">
          <h3>${tip.title}</h3>
          <p>${tip.body}</p>
        </div>
      </li>
    `).join('');
  }

  /* ---------- Scroll reveal ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  function observeReveals() {
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });
  }
  observeReveals();

  /* ---------- Back to top ---------- */
  const backTop = document.getElementById('back-to-top');
  function updateBackTop() { backTop.classList.toggle('visible', window.scrollY > 400); }
  window.addEventListener('scroll', updateBackTop, { passive: true });
  updateBackTop();
  backTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  console.info('[Khandwa Recycles] Ready.');
})();
