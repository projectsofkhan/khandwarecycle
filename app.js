/* ============================================
   Khandwa Recycles — app.js
   ============================================ */
(async function () {
  'use strict';

  /* ---------- Data ---------- */
  let cityData, geojson, zonesById, cityAvgRecycle;
  try {
    const [cityRes, geoRes] = await Promise.all([
      fetch('data.json').then(r => r.json()),
      fetch('zones.geojson').then(r => r.json())
    ]);
    cityData = cityRes;
    geojson = geoRes;
    zonesById = Object.fromEntries(cityData.zones.map(z => [z.id, z]));
    cityAvgRecycle = cityData.zones.reduce((s, z) => s + z.recycle_pct, 0) / cityData.zones.length;
  } catch (err) {
    console.error('[Khandwa Recycles] Failed to load data:', err);
    return;
  }

  /* ---------- Metric status helpers ---------- */
  const BANDS = {
    recycle:     { lowMax: 20, midMax: 30, invert: false },
    greenery:    { lowMax: 10, midMax: 15, invert: false },
    plastic:     { lowMax: 10, midMax: 12, invert: true },
    cleanliness: { lowMax: 50, midMax: 65, invert: false }
  };

  function statusFor(metric, value) {
    const b = BANDS[metric];
    if (!b) return 'moderate';
    if (b.invert) {
      if (value <= b.lowMax) return 'higher';
      if (value <= b.midMax) return 'moderate';
      return 'low';
    } else {
      if (value < b.lowMax) return 'low';
      if (value < b.midMax) return 'moderate';
      return 'higher';
    }
  }

  const STATUS_LABEL = {
    recycle:     { low: 'Low', moderate: 'Moderate', higher: 'Higher' },
    greenery:    { low: 'Low', moderate: 'Moderate', higher: 'Higher' },
    plastic:     { low: 'High', moderate: 'Moderate', higher: 'Low' },
    cleanliness: { low: 'Low', moderate: 'Moderate', higher: 'Higher' }
  };

  const STATUS_COLOR = {
    low: 'var(--red)',
    moderate: 'var(--amber)',
    higher: 'var(--green)'
  };

  const STATUS_HEX = {
    low: '#b3231c',
    moderate: '#b17300',
    higher: '#126b35'
  };

  /* ---------- Tips ---------- */
  const TIP_LIBRARY = {
    recycle_low: {
      title: 'Separate your dry waste',
      body: 'Recycling access here is well below the city average. The simplest fix is at home. Keep bottles, paper, and metal separate from wet waste, and hand the dry waste directly to a kabadiwala — most pay by weight, and the trip takes ten minutes a week.'
    },
    recycle_mod: {
      title: 'Ask about collection',
      body: 'Recycling access is moderate here. If your collection vehicle does not take dry waste separately, ask the ward office why. Informal scrap networks in this area pick up more than the formal system does.'
    },
    recycle_high: {
      title: 'Keep the system working',
      body: 'This zone recycles above the city average. Keep going. Support your local kabadiwala, and encourage neighbours to segregate — the gap between here and better zones is mostly habit.'
    },

    greenery_low: {
      title: 'Plant for shade',
      body: 'Greenery is far below average here. Even one tree per household would change your street. Neem, peepal, and gulmohar need little water and give shade within three years. Give a sapling at weddings and ceremonies instead of a gift item.'
    },
    greenery_mod: {
      title: 'Add more green',
      body: 'Greenery sits below the city average. Plant along your lane, in your society compound, or on your terrace. Ask your ward councillor to plant on unused plots.'
    },
    greenery_high: {
      title: 'Protect what exists',
      body: 'This area is greener than most of Khandwa. Protect the trees that exist. If you see a tree being cut without permission, report it — trees take decades to replace.'
    },

    plastic_low: {
      title: 'Refuse single-use plastic',
      body: 'Plastic makes up an unusually large share of waste here. Refuse single-use bags at shops — carry a cloth bag. Buy loose grains instead of sachets. Wash bottles before selling them to scrap dealers so they actually get recycled.'
    },
    plastic_mod: {
      title: 'Keep plastic out of the mix',
      body: 'Plastic share is slightly above average. Small habits help — buy loose, refuse cutlery, reuse containers before discarding them.'
    },
    plastic_high: {
      title: 'Plastic is already low here',
      body: 'Plastic share is below the city average. Keep it that way — small habits compound over years.'
    },

    cleanliness_low: {
      title: 'Put your bins out',
      body: 'Cleanliness scores are well below average. Keep wet and dry bins separate, and put them out on collection days. Do not dump on empty plots or in drains — that clogs the system and creates disease vectors. Report missed collection to your ward office.'
    },
    cleanliness_mod: {
      title: 'Tighten the daily habit',
      body: 'Cleanliness is moderate here. The single biggest thing you can do is stop using empty plots or road edges as dumps — those become permanent once started.'
    },
    cleanliness_high: {
      title: 'Set the example',
      body: 'Cleanliness is above average. Encourage neighbours who slip. Cleanliness in this city is contagious both ways.'
    }
  };

  function getTipsFor(zone) {
    const candidates = [];

    const recycleStatus = statusFor('recycle', zone.recycle_pct);
    if (recycleStatus === 'low') candidates.push({ key: 'recycle_low', priority: 1 });
    else if (recycleStatus === 'moderate') candidates.push({ key: 'recycle_mod', priority: 3 });
    else candidates.push({ key: 'recycle_high', priority: 5 });

    const greeneryStatus = statusFor('greenery', zone.greenery_pct);
    if (greeneryStatus === 'low') candidates.push({ key: 'greenery_low', priority: 1 });
    else if (greeneryStatus === 'moderate') candidates.push({ key: 'greenery_mod', priority: 3 });
    else candidates.push({ key: 'greenery_high', priority: 5.1 });

    const plasticStatus = statusFor('plastic', zone.plastic_pct);
    if (plasticStatus === 'low') candidates.push({ key: 'plastic_low', priority: 1 });
    else if (plasticStatus === 'moderate') candidates.push({ key: 'plastic_mod', priority: 3 });
    else candidates.push({ key: 'plastic_high', priority: 5.2 });

    const cleanlinessStatus = statusFor('cleanliness', zone.cleanliness_pct);
    if (cleanlinessStatus === 'low') candidates.push({ key: 'cleanliness_low', priority: 1 });
    else if (cleanlinessStatus === 'moderate') candidates.push({ key: 'cleanliness_mod', priority: 3 });
    else candidates.push({ key: 'cleanliness_high', priority: 5.3 });

    candidates.sort((a, b) => a.priority - b.priority);
    return candidates.slice(0, 3).map(c => TIP_LIBRARY[c.key]);
  }

  /* ---------- Landing map ---------- */
  const landingMap = L.map('map', {
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'OpenStreetMap'
  }).addTo(landingMap);

  landingMap.on('focus', () => landingMap.scrollWheelZoom.enable());
  landingMap.on('blur',  () => landingMap.scrollWheelZoom.disable());

  function hexForScore(score) {
    const s = statusFor('recycle', score);
    return STATUS_HEX[s];
  }

  function landingStyle(feature) {
    const zone = zonesById[feature.properties.id];
    const score = zone ? zone.recycle_pct : 0;
    return {
      color: '#ffffff',
      weight: 1.5,
      opacity: 1,
      fillColor: hexForScore(score),
      fillOpacity: 0.72
    };
  }

  function landingHoverStyle(feature) {
    return Object.assign({}, landingStyle(feature), {
      weight: 2.5,
      fillOpacity: 0.9
    });
  }

  const landingLayer = L.geoJSON(geojson, {
    style: landingStyle,
    onEachFeature: (feature, layer) => {
      const zone = zonesById[feature.properties.id];
      if (!zone) return;

      layer.bindTooltip(`${zone.name} · ${zone.recycle_pct}% recycling access`, {
        sticky: true,
        direction: 'top',
        className: 'zone-tooltip',
        offset: [0, -4]
      });

      layer.on('mouseover', () => layer.setStyle(landingHoverStyle(feature)));
      layer.on('mouseout', () => layer.setStyle(landingStyle(feature)));
      layer.on('click', () => showDetail(feature.properties.id));
    }
  }).addTo(landingMap);

  landingMap.fitBounds(landingLayer.getBounds(), { padding: [32, 32] });

  /* ---------- Views ---------- */
  const viewLanding = document.getElementById('view-landing');
  const viewDetail = document.getElementById('view-detail');

  function showDetail(zoneId) {
    const zone = zonesById[zoneId];
    if (!zone) return;

    renderDetail(zone);

    viewLanding.hidden = true;
    viewLanding.classList.add('is-hidden');
    viewDetail.hidden = false;
    viewDetail.classList.remove('is-hidden');

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function showLanding() {
    viewDetail.hidden = true;
    viewDetail.classList.add('is-hidden');
    viewLanding.hidden = false;
    viewLanding.classList.remove('is-hidden');

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  document.querySelectorAll('[data-zone]').forEach(btn => {
    btn.addEventListener('click', () => showDetail(btn.dataset.zone));
  });
  document.getElementById('back-btn').addEventListener('click', showLanding);
  document.getElementById('back-btn-2').addEventListener('click', showLanding);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !viewDetail.hidden) showLanding();
  });

  /* ---------- Render detail ---------- */
  function renderDetail(zone) {
    document.getElementById('zone-title').textContent = zone.name;
    document.getElementById('zone-wards').textContent = 'Wards ' + zone.wards.join(', ');

    document.getElementById('zone-metrics').innerHTML = renderMetrics(zone);
    document.getElementById('zone-compare').innerHTML = renderCompare(zone);
    document.getElementById('tips-list').innerHTML = renderTips(zone);

    const badgeClass = zone.source === 'official' ? 'badge-official' : 'badge-estimate';
    const badgeText  = zone.source === 'official' ? 'Official figures' : 'Illustrative estimates';
    document.getElementById('zone-source').innerHTML =
      `<span class="${badgeClass}">${badgeText}</span> — area-level recycling, greenery, plastic, and cleanliness figures are modelled from observed service patterns, not official ward data. City-level figures on the main page are official.`;

    // Animate compare fills after paint
    requestAnimationFrame(() => {
      document.querySelectorAll('.compare-fill').forEach(el => {
        const w = el.dataset.width;
        if (w) el.style.width = w + '%';
      });
    });
  }

  function metricCard(label, value, unit, metric) {
    const status = statusFor(metric, value);
    const statusText = STATUS_LABEL[metric][status];
    return `
      <div class="metric" data-status="${status}">
        <p class="metric-label">${label}</p>
        <p class="metric-value">${value}<span class="metric-unit">${unit}</span></p>
        <p class="metric-status">${statusText}</p>
      </div>
    `;
  }

  function renderMetrics(zone) {
    return [
      metricCard('Recycling access', zone.recycle_pct, '%', 'recycle'),
      metricCard('Plastic share',    zone.plastic_pct, '%', 'plastic'),
      metricCard('Greenery',         zone.greenery_pct, '%', 'greenery'),
      metricCard('Cleanliness',      zone.cleanliness_pct, '%', 'cleanliness')
    ].join('');
  }

  function renderCompare(zone) {
    const zoneVal = zone.recycle_pct;
    const avgVal = cityAvgRecycle;
    const diff = zoneVal - avgVal;
    const absDiff = Math.abs(diff).toFixed(1).replace(/\.0$/, '');

    let summary;
    if (Math.abs(diff) < 0.05) {
      summary = `${zone.name} sits exactly at the Khandwa average for recycling access across the eight zones.`;
    } else if (diff > 0) {
      summary = `${zone.name} sits ${absDiff} points above the Khandwa average of ${avgVal.toFixed(1)}% across the eight zones.`;
    } else {
      summary = `${zone.name} sits ${absDiff} points below the Khandwa average of ${avgVal.toFixed(1)}% across the eight zones.`;
    }

    const zoneStatus = statusFor('recycle', zoneVal);
    const zoneColor = STATUS_HEX[zoneStatus];

    return `
      <p class="compare-heading">Recycling access, compared</p>
      <div class="compare-row">
        <span class="compare-label">${zone.name}</span>
        <div class="compare-track"><div class="compare-fill" data-width="${zoneVal}" style="background:${zoneColor};"></div></div>
        <span class="compare-value">${zoneVal}%</span>
      </div>
      <div class="compare-row">
        <span class="compare-label">Khandwa average</span>
        <div class="compare-track"><div class="compare-fill" data-width="${avgVal.toFixed(1)}" style="background:#999;"></div></div>
        <span class="compare-value">${avgVal.toFixed(1)}%</span>
      </div>
      <p class="compare-summary">${summary}</p>
    `;
  }

  function renderTips(zone) {
    const tips = getTipsFor(zone);
    return tips.map((tip, i) => `
      <li class="tip">
        <span class="tip-num">${String(i + 1).padStart(2, '0')}</span>
        <div class="tip-content">
          <h3>${tip.title}</h3>
          <p>${tip.body}</p>
        </div>
      </li>
    `).join('');
  }

  /* ---------- Zone list scores: apply colour at load ---------- */
  document.querySelectorAll('.zone-score').forEach(el => {
    const v = parseFloat(el.dataset.score);
    if (Number.isFinite(v)) {
      el.dataset.status = statusFor('recycle', v);
    }
  });

  console.info('[Khandwa Recycles] Ready.');
})();