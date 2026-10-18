(async function () {
  'use strict';

  let cityData, geojson, zonesById, imagePoolById;

  try {
    const [cityRes, geoRes] = await Promise.all([
      fetch('data.json').then(r => r.json()),
      fetch('zones.geojson').then(r => r.json())
    ]);
    cityData = cityRes;
    geojson = geoRes;
    zonesById = Object.fromEntries(cityData.zones.map(z => [z.id, z]));
    imagePoolById = Object.fromEntries(cityData.image_pool.map(i => [i.id, i]));
  } catch (err) {
    console.error('[Khandwa Recycles] Data load failed:', err);
    return;
  }

  /* ---------- Sentiment ---------- */
  const HEX = { bad: '#dc2626', mid: '#d97706', good: '#16a34a' };

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

  /* ---------- Tips ---------- */
  const TIPS = {
    recycle_low: { title: 'Separate your dry waste', body: 'Recycling access here is well below the Khandwa average. Keep bottles, paper, and metal separate from wet waste, and hand the dry waste directly to a kabadiwala — most pay by weight, and the trip takes ten minutes a week.' },
    recycle_mod: { title: 'Ask about collection', body: 'Recycling access here is near the Khandwa average. If your collection vehicle does not take dry waste separately, ask the ward office why. Informal scrap networks in this area pick up more than the formal system does.' },
    recycle_high: { title: 'Keep the system working', body: 'This area recycles above the Khandwa average. Support your local kabadiwala, and encourage neighbours to segregate — the gap between here and weaker zones is mostly habit.' },
    greenery_low: { title: 'Plant for shade', body: 'Greenery here is far below average. Even one tree per household would change your street. Neem, peepal, and gulmohar need little water and give shade within three years. Give a sapling at weddings and ceremonies instead of a gift item.' },
    greenery_mod: { title: 'Add more green', body: 'Greenery here sits near the Khandwa average. Plant along your lane, in your society compound, or on your terrace. Ask your ward councillor to plant on unused plots.' },
    greenery_high: { title: 'Protect what exists', body: 'This area is greener than most of Khandwa. Protect the trees that exist. If you see a tree being cut without permission, report it — trees take decades to replace.' },
    plastic_low: { title: 'Refuse single-use plastic', body: 'Plastic makes up an unusually large share of waste here. Refuse single-use bags at shops — carry a cloth bag. Buy loose grains instead of sachets. Wash bottles before selling them to scrap dealers so they actually get recycled.' },
    plastic_mod: { title: 'Keep plastic out of the mix', body: 'Plastic share here is slightly above average. Small habits help — buy loose, refuse cutlery, reuse containers before discarding them.' },
    plastic_high: { title: 'Plastic is already low here', body: 'Plastic share here is below the Khandwa average. Keep it that way — small habits compound over years.' },
    cleanliness_low: { title: 'Put your bins out', body: 'Cleanliness scores are well below average here. Keep wet and dry bins separate, and put them out on collection days. Do not dump on empty plots or in drains — that clogs the system and creates disease vectors. Report missed collection to your ward office.' },
    cleanliness_mod: { title: 'Tighten the daily habit', body: 'Cleanliness here is near the Khandwa average. The single biggest thing you can do is stop using empty plots or road edges as dumps — those become permanent once started.' },
    cleanliness_high: { title: 'Set the example', body: 'Cleanliness here is above average. Encourage neighbours who slip. Cleanliness in this city is contagious in both directions.' }
  };

  function tipsFor(zone) {
    const picks = [];
    const add = (metricKey, prefix, priority) => {
      const s = metricInfo(zone, metricKey).sentiment;
      const suffix = s === 'bad' ? 'low' : s === 'mid' ? 'mod' : 'high';
      picks.push({ key: prefix + '_' + suffix, priority });
    };
    add('recycle', 'recycle', 1);
    add('greenery', 'greenery', 1.1);
    add('plastic', 'plastic', 1.2);
    add('cleanliness', 'cleanliness', 1.3);
    picks.sort((a, b) => {
      const weight = (p) => {
        const parts = p.key.split('_');
        const s = parts[parts.length - 1];
        return p.priority * (s === 'low' ? 1 : s === 'mod' ? 2 : 3);
      };
      return weight(a) - weight(b);
    });
    return picks.slice(0, 3).map(p => TIPS[p.key]);
  }

  /* ---------- City strip ---------- */
  const city = cityData.city;
  document.getElementById('city-strip').innerHTML = [
    { value: city.swachh_rank, unit: '', label: 'Swachh Survekshan rank' },
    { value: city.segregation_score_pct, unit: '%', label: 'Segregation parameter score' },
    { value: city.plastic_tpd, unit: 'T', label: 'Plastic, per day' },
    { value: city.wards, unit: '', label: 'Administrative wards' },
    { value: '2', unit: 'lakh', label: 'Population' }
  ].map(c => `
    <div class="city-cell">
      <span class="city-cell-value">${c.value}<span class="city-cell-unit">${c.unit}</span></span>
      <span class="city-cell-label">${c.label}</span>
      <span class="city-cell-source">Official</span>
    </div>
  `).join('');

  /* ---------- Area cards (sorted best to worst) ---------- */
  const sortedZones = [...cityData.zones].sort((a, b) => b.recycle_pct - a.recycle_pct);

  const areaGrid = document.getElementById('area-grid');
  areaGrid.innerHTML = sortedZones.map((zone, i) => {
    const info = metricInfo(zone, 'recycle');
    const firstImage = imagePoolById[zone.image_ids[0]];
    const img = firstImage ? firstImage.url : '';
    const metrics = [
      { label: 'Recycle', key: 'recycle_pct' },
      { label: 'Plastic', key: 'plastic_pct' },
      { label: 'Green', key: 'greenery_pct' },
      { label: 'Clean', key: 'cleanliness_pct' }
    ];
    return `
      <button class="area-card" type="button" data-zone="${zone.id}">
        <div class="area-card-media">
          <img src="${img}" alt="${firstImage ? firstImage.caption : zone.name}" loading="lazy" />
          <span class="area-badge" data-sentiment="${info.sentiment}">${info.label}</span>
          <span class="area-rank">
            <span class="num" style="color:${HEX[info.sentiment]}">#${i + 1}</span>
            <span class="lbl">of 8</span>
          </span>
        </div>
        <div class="area-card-body">
          <div class="area-card-top">
            <span class="area-card-name">${zone.name}</span>
          </div>
          <p class="area-card-tagline">${zone.tagline || ''}</p>
          <div class="area-mini">
            ${metrics.map(m => {
              const val = zone[m.key];
              const mi = metricInfo(zone, m.key.replace('_pct', ''));
              return `<div class="area-mini-cell">
                <span class="area-mini-val" style="color:${HEX[mi.sentiment]}">${val}%</span>
                <span class="area-mini-label">${m.label}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </button>
    `;
  }).join('');

  /* ---------- Gallery ---------- */
  const gallery = document.getElementById('gallery-grid');
  gallery.innerHTML = cityData.image_pool.map(img => `
    <div class="gallery-item" data-full="${img.url}" data-caption="${img.caption}">
      <img src="${img.url}" alt="${img.caption}" loading="lazy" />
      <div class="gallery-caption">${img.caption}</div>
    </div>
  `).join('');

  /* ---------- Sources ---------- */
  document.getElementById('sources-list').innerHTML = cityData.city.sources
    .map(s => `<li><em>${s.label}</em> — ${s.note}</li>`)
    .join('');

  /* ---------- Map with labels ---------- */
  const map = L.map('map', { scrollWheelZoom: false, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: 'OpenStreetMap'
  }).addTo(map);
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());

  function styleFor(feature) {
    const zone = zonesById[feature.properties.id];
    if (!zone) return { color: '#fff', weight: 1, fillOpacity: 0 };
    const info = metricInfo(zone, 'recycle');
    return { color: '#fff', weight: 1.5, opacity: 1, fillColor: HEX[info.sentiment], fillOpacity: 0.75 };
  }
  function hoverStyle(feature) {
    return Object.assign({}, styleFor(feature), { weight: 2.5, fillOpacity: 0.95 });
  }

  const layer = L.geoJSON(geojson, {
    style: styleFor,
    onEachFeature: (feature, l) => {
      const zone = zonesById[feature.properties.id];
      if (!zone) return;

      const info = metricInfo(zone, 'recycle');
      const center = l.getBounds().getCenter();

      L.marker(center, {
        icon: L.divIcon({
          className: 'map-label-wrapper',
          html: `<div class="map-label">${zone.name}<span class="pct">${zone.recycle_pct}%</span></div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        }),
        interactive: false
      }).addTo(map);

      l.bindTooltip(`${zone.name} · ${zone.recycle_pct}% recycling access`, {
        sticky: true, direction: 'top', className: 'zone-tooltip', offset: [0, -6]
      });
      l.on('mouseover', () => l.setStyle(hoverStyle(feature)));
      l.on('mouseout', () => l.setStyle(styleFor(feature)));
      l.on('click', () => openZone(zone.id));
    }
  }).addTo(map);
  map.fitBounds(layer.getBounds(), { padding: [40, 40] });

  /* ---------- Overlay ---------- */
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlay-content');
  const overlayClose = document.getElementById('overlay-close');
  const overlayBackdrop = document.getElementById('overlay-backdrop');

  function openZone(id) {
    const zone = zonesById[id];
    if (!zone) return;
    overlayContent.innerHTML = renderZoneOverlay(zone);
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('open'));
    history.replaceState(null, '', '#' + id);
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.hidden = true; }, 440);
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  overlayClose.addEventListener('click', closeOverlay);
  overlayBackdrop.addEventListener('click', closeOverlay);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeOverlay();
  });

  document.querySelectorAll('.area-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      openZone(card.dataset.zone);
    });
  });

  if (window.location.hash) {
    const id = window.location.hash.slice(1);
    if (zonesById[id]) setTimeout(() => openZone(id), 300);
  }

  function renderZoneOverlay(zone) {
    const hero = imagePoolById[zone.image_ids[0]];
    const galleryImgs = zone.image_ids.map(id => imagePoolById[id]).filter(Boolean);

    const metrics = [
      { key: 'recycle', label: 'Recycling access' },
      { key: 'plastic', label: 'Plastic share' },
      { key: 'greenery', label: 'Greenery' },
      { key: 'cleanliness', label: 'Cleanliness' }
    ];

    const tips = tipsFor(zone);

    return `
      <div class="ov-hero">
        ${hero ? `<img src="${hero.url}" alt="${zone.name}" />` : ''}
        <p class="ov-eyebrow">Area profile · Wards ${zone.wards.join(', ')}</p>
        <h2 class="ov-title" id="overlay-title">${zone.name}</h2>
      </div>
      <p class="ov-tagline">${zone.tagline || ''}</p>
      <p class="ov-notes">${zone.notes || ''}</p>

      <div class="ov-metrics">
        ${metrics.map(m => {
          const mi = metricInfo(zone, m.key);
          return `<div class="ov-metric">
            <span class="ov-metric-label">${m.label}</span>
            <span class="ov-metric-value" style="color:${HEX[mi.sentiment]}">${mi.value}%</span>
            <span class="ov-metric-index" style="color:${HEX[mi.sentiment]}">${mi.label}</span>
          </div>`;
        }).join('')}
      </div>

      <div class="ov-gallery">
        ${galleryImgs.map(g => `<img src="${g.url}" alt="${g.caption}" loading="lazy" data-full="${g.url}" data-caption="${g.caption}" />`).join('')}
      </div>

      <div class="ov-tips">
        ${tips.map((t, i) => `
          <div class="ov-tip">
            <span class="ov-tip-num">${String(i + 1).padStart(2, '0')}</span>
            <div>
              <h4>${t.title}</h4>
              <p>${t.body}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <p style="font-size:11px;color:#a8a8a8;margin-top:24px;line-height:1.6;">
        <strong style="color:#d97706;text-transform:uppercase;letter-spacing:0.08em;">Illustrative estimates</strong> —
        area-level figures are modelled from observed service patterns, not official ward data.
        City-level figures on the overview are official.
      </p>
    `;
  }

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxBackdrop = document.getElementById('lightbox-backdrop');

  function openLightbox(src, caption) {
    lightboxImg.src = src;
    lightboxImg.alt = caption || '';
    lightboxCaption.textContent = caption || '';
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('open'));
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    setTimeout(() => { lightbox.hidden = true; }, 300);
  }

  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-full]');
    if (item) {
      e.preventDefault();
      openLightbox(item.dataset.full, item.dataset.caption);
    }
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxBackdrop.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });

  /* ---------- Scroll reveal ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ---------- Nav + topbar ---------- */
  const topbar = document.getElementById('topbar');
  const navLinks = document.querySelectorAll('.topnav-link');
  const sections = ['overview', 'areas', 'map', 'gallery', 'about']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  function updateNav() {
    const y = window.scrollY;
    topbar.classList.toggle('scrolled', y > 8);
    let current = sections[0];
    sections.forEach(s => { if (s.offsetTop <= y + 160) current = s; });
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.section === current.id));
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ---------- Back to top ---------- */
  const backTop = document.getElementById('back-to-top');
  function updateBackTop() { backTop.classList.toggle('visible', window.scrollY > 480); }
  window.addEventListener('scroll', updateBackTop, { passive: true });
  updateBackTop();
  backTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  console.info('[Khandwa Recycles] Ready.');
})();
