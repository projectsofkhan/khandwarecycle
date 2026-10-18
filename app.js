/* ============================================
   Khandwa Recycles — app.js
   Vanilla. No build. No framework.
   ============================================ */
(async function () {
  'use strict';

  const CONFIG = {
    dataUrl: 'data.json',
    geojsonUrl: 'zones.geojson',
    mapCenter: [21.8257, 76.3520],
    mapZoom: 13,
    scoreBands: [
      { max: 20, color: '#b91c1c', label: 'Low' },
      { max: 30, color: '#ca8a04', label: 'Moderate' },
      { max: 100, color: '#15803d', label: 'Higher' }
    ]
  };

  /* ---------- Data load ---------- */
  let cityData, zonesById, geojson, cityAverage;
  try {
    const [cityRes, geoRes] = await Promise.all([
      fetch(CONFIG.dataUrl).then(r => r.json()),
      fetch(CONFIG.geojsonUrl).then(r => r.json())
    ]);
    cityData = cityRes;
    geojson = geoRes;
    zonesById = Object.fromEntries(cityData.zones.map(z => [z.id, z]));
    cityAverage = cityData.zones.reduce((sum, z) => sum + z.recycle_pct, 0) / cityData.zones.length;
  } catch (err) {
    console.error('[Khandwa Recycles] Failed to load data:', err);
    return;
  }

  function colorForScore(score) {
    for (const b of CONFIG.scoreBands) if (score <= b.max) return b.color;
    return CONFIG.scoreBands[CONFIG.scoreBands.length - 1].color;
  }
  function labelForScore(score) {
    for (const b of CONFIG.scoreBands) if (score <= b.max) return b.label;
    return CONFIG.scoreBands[CONFIG.scoreBands.length - 1].label;
  }

  /* ---------- Map init ---------- */
  const map = L.map('map', {
    center: CONFIG.mapCenter,
    zoom: CONFIG.mapZoom,
    scrollWheelZoom: false,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur',  () => map.scrollWheelZoom.disable());

  /* ---------- Layers ---------- */
  let activeLayer = null;

  function styleFor(feature) {
    const zone = zonesById[feature.properties.id];
    const score = zone ? zone.recycle_pct : 0;
    return {
      color: '#ffffff',
      weight: 1,
      opacity: 0.9,
      fillColor: colorForScore(score),
      fillOpacity: 0.55
    };
  }
  function highlightStyle(feature) {
    return Object.assign({}, styleFor(feature), {
      weight: 2.5,
      fillOpacity: 0.75
    });
  }

  const zoneList = document.getElementById('zone-list');
  const panel = document.getElementById('zone-panel');
  const panelContent = document.getElementById('zone-panel-content');
  const panelClose = document.getElementById('zone-panel-close');

  function listButtonFor(id) {
    return zoneList.querySelector(`button[data-zone="${id}"]`);
  }

  const geoLayer = L.geoJSON(geojson, {
    style: styleFor,
    onEachFeature: (feature, layer) => {
      const zone = zonesById[feature.properties.id];
      if (zone) {
        layer.bindTooltip(`${zone.name} — ${zone.recycle_pct}%`, {
          sticky: true,
          direction: 'top',
          className: 'zone-tooltip'
        });
      }
      layer.on('mouseover', () => {
        layer.setStyle(highlightStyle(feature));
        const btn = listButtonFor(feature.properties.id);
        if (btn) btn.classList.add('hover');
      });
      layer.on('mouseout', () => {
        if (layer !== activeLayer) layer.setStyle(styleFor(feature));
        const btn = listButtonFor(feature.properties.id);
        if (btn) btn.classList.remove('hover');
      });
      layer.on('click', () => openZone(feature.properties.id, layer));
    }
  }).addTo(map);

  map.fitBounds(geoLayer.getBounds(), { padding: [24, 24] });

  /* ---------- Legend ---------- */
  (function injectLegend() {
    const dataNote = document.querySelector('.data-note');
    if (!dataNote || !dataNote.parentElement) return;
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.setAttribute('aria-label', 'Recycling score legend');
    legend.innerHTML = CONFIG.scoreBands.map(b =>
      `<span class="legend-item"><span class="legend-dot" style="background:${b.color}"></span>${b.label}</span>`
    ).join('');
    dataNote.parentElement.insertBefore(legend, dataNote);
  })();

  /* ---------- Zone list interaction ---------- */
  zoneList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-zone]');
    if (!btn) return;
    const id = btn.dataset.zone;
    const layer = findLayerById(id);
    openZone(id, layer);
  });

  zoneList.addEventListener('keydown', (e) => {
    const buttons = Array.from(zoneList.querySelectorAll('button[data-zone]'));
    const current = document.activeElement;
    const idx = buttons.indexOf(current);
    if (idx === -1) return;

    let next = -1;
    if (e.key === 'ArrowDown') next = (idx + 1) % buttons.length;
    else if (e.key === 'ArrowUp') next = (idx - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else return;

    e.preventDefault();
    buttons[next].focus();
  });

  function findLayerById(id) {
    let found = null;
    geoLayer.eachLayer(layer => {
      if (layer.feature.properties.id === id) found = layer;
    });
    return found;
  }
  function markActiveButton(id) {
    zoneList.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.zone === id)
    );
  }

  /* ---------- Panel open / close ---------- */
  function openZone(id, layer) {
    const zone = zonesById[id];
    if (!zone) return;

    markActiveButton(id);

    if (activeLayer && activeLayer !== layer) {
      activeLayer.setStyle(styleFor(activeLayer.feature));
    }
    activeLayer = layer;
    if (layer) {
      layer.setStyle(highlightStyle(layer.feature));
      if (layer.bringToFront) layer.bringToFront();
    }

    panelContent.innerHTML = renderZone(zone);
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      const bar = panelContent.querySelector('.bar-fill');
      if (bar) bar.style.width = bar.dataset.width + '%';
    });
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    if (activeLayer) {
      activeLayer.setStyle(styleFor(activeLayer.feature));
      activeLayer = null;
    }
    markActiveButton(null);
  }

  panelClose.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  /* ---------- Panel markup ---------- */
  function renderZone(zone) {
    const score = zone.recycle_pct;
    const scoreLabel = labelForScore(score);
    const scoreColor = colorForScore(score);

    const avg = cityAverage;
    const diff = score - avg;
    const diffAbs = Math.abs(diff).toFixed(1).replace(/\.0$/, '');
    const diffText = diff === 0
      ? 'This zone sits exactly at the Khandwa average.'
      : diff > 0
        ? `This zone sits ${diffAbs} points above the Khandwa average.`
        : `This zone sits ${diffAbs} points below the Khandwa average.`;

    const streetView = zone.streetview_url
      ? `<div class="panel-streetview"><iframe src="${zone.streetview_url}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Street view of ${zone.name}"></iframe></div>`
      : '';

    const badgeClass = zone.source === 'official' ? 'badge-official' : 'badge-estimate';
    const badgeText  = zone.source === 'official' ? 'Official' : 'Estimate';

    return `
      <h3>${zone.name}</h3>
      <p class="panel-wards">Wards ${zone.wards.join(', ')}</p>

      <div class="panel-recycle">
        <div class="panel-recycle-head">
          <span class="panel-label">Recycling access</span>
          <span class="panel-score" style="color:${scoreColor}">${score}%</span>
        </div>
        <div class="bar">
          <div class="bar-fill" data-width="${score}" style="background:${scoreColor}; width:0%"></div>
        </div>
        <p class="panel-score-note">${scoreLabel} — illustrative estimate</p>
      </div>

      <div class="panel-compare">
        <div class="compare-row">
          <span class="compare-label">Khandwa average, eight zones</span>
          <span class="compare-value">${avg.toFixed(1)}%</span>
        </div>
        <div class="compare-row compare-current">
          <span class="compare-label">${zone.name}</span>
          <span class="compare-value">${score}%</span>
        </div>
        <p class="compare-note">${diffText}</p>
      </div>

      <div class="panel-tiles">
        <div class="tile">
          <span class="tile-label">Waste per day</span>
          <span class="tile-value">${zone.waste_tpd}<span class="tile-unit">T</span></span>
        </div>
        <div class="tile">
          <span class="tile-label">Plastic share</span>
          <span class="tile-value">${zone.plastic_pct}<span class="tile-unit">%</span></span>
        </div>
        <div class="tile">
          <span class="tile-label">Greenery</span>
          <span class="tile-value">${zone.greenery_pct}<span class="tile-unit">%</span></span>
        </div>
        <div class="tile">
          <span class="tile-label">Cleanliness</span>
          <span class="tile-value">${zone.cleanliness_pct}<span class="tile-unit">%</span></span>
        </div>
      </div>

      ${zone.notes ? `<p class="panel-notes">${zone.notes}</p>` : ''}

      <p class="panel-def">Recycling access estimates the share of dry waste recovered through formal collection, informal scrap networks, or processing. It is not the same as source segregation, which Khandwa reports at 45% city-wide.</p>

      ${streetView}

      <p class="panel-source"><span class="badge ${badgeClass}">${badgeText}</span></p>
    `;
  }

  console.info('[Khandwa Recycles] Ready.');
})();