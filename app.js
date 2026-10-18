(function () {
  'use strict';

  console.log('[Khandwa Recycles] Script loaded.');

  /* ---------- Global state ---------- */
  let cityData, geojson, zonesById, imagePoolById;
  let overlay, overlayContent, overlayCloseBtn, overlayBackdrop;
  let lightbox, lightboxImg, lightboxCaption, lightboxCloseBtn, lightboxBackdrop;
  let map;

  /* ---------- Helpers ---------- */
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

  /* ---------- Tips library (keys = bad / mid / good) ---------- */
  const TIPS = {
    recycle: {
      bad: [
        { title: 'Separate your dry waste', body: 'Recycling access here is well below the Khandwa average. Keep bottles, paper, and metal separate from wet waste, and hand dry waste directly to a kabadiwala — most pay by weight, and it takes ten minutes a week.' },
        { title: 'Find your nearest kabadiwala', body: 'Informal scrap dealers recover far more than the formal system does in this area. Know who yours is, what they pay for, and how often they pass. A single WhatsApp message establishes a route.' }
      ],
      mid: [
        { title: 'Ask the ward office about dry-waste collection', body: 'Recycling access here is near the Khandwa average. If your collection vehicle does not take dry waste separately, ask why. Informal scrap networks pick up more than the formal system in this area.' },
        { title: 'Wash before you hand over', body: 'Contaminated bottles and containers get rejected by recyclers. Rinsing a bottle takes five seconds and roughly doubles its recovery rate.' }
      ],
      good: [
        { title: 'Keep the system working', body: 'This area recycles above the Khandwa average. Support your local kabadiwala and encourage neighbours to segregate — the gap between here and weaker zones is mostly habit.' },
        { title: 'Share your method', body: 'Whatever your household does that works, teach it to one neighbour. Word of mouth is faster than any municipal campaign.' }
      ]
    },
    greenery: {
      bad: [
        { title: 'Plant one tree per household', body: 'Greenery here is far below average. Neem, peepal, and gulmohar need little water and give shade within three years. One tree per household would change your street within a decade.' },
        { title: 'Give saplings instead of gifts', body: 'At weddings, births, and ceremonies, gift a sapling in a painted pot. It costs less than a decorative item, lasts decades, and becomes a small landmark in your family’s story.' }
      ],
      mid: [
        { title: 'Plant along your lane', body: 'Greenery here sits near the Khandwa average. Plant along your lane, in your society compound, or on your terrace. Ask your ward councillor to plant on unused plots.' },
        { title: 'Terrace and balcony greening', body: 'Even small flats can grow tulsi, curry leaf, chillies, and small flowering plants. Terrace shade reduces household temperatures by two to three degrees in summer.' }
      ],
      good: [
        { title: 'Protect what exists', body: 'This area is greener than most of Khandwa. If you see a tree being cut without permission, report it — trees take decades to replace, and inspections are quick.' },
        { title: 'Water the young ones', body: 'Newly planted saplings die from neglect far more often than drought. If your society plants, offer to water for the first two summers.' }
      ]
    },
    plastic: {
      bad: [
        { title: 'Refuse single-use plastic', body: 'Plastic makes up an unusually large share of waste here. Refuse single-use bags at shops — carry a cloth bag. Buy loose grains instead of sachets, and wash bottles before handing them to scrap dealers.' },
        { title: 'Carry a cloth bag', body: 'A folded cloth bag in your pocket or purse costs nothing and eliminates hundreds of plastic bags a year per household.' }
      ],
      mid: [
        { title: 'Buy loose, not packaged', body: 'Plastic share here is slightly above average. Buying dal, rice, and spices loose saves the sachet and often costs less per kilogram too.' },
        { title: 'Reuse before discarding', body: 'Plastic containers reused for storage, tiffins, or plant pots stay out of the waste stream for years. Wash and reuse before you throw.' }
      ],
      good: [
        { title: 'Plastic is already low here', body: 'Plastic share here is below the Khandwa average. Keep it that way — small habits compound over years.' },
        { title: 'Avoid the hidden plastics', body: 'The plastic in a household budget is rarely the bag. It is the packaging, the sachet, the wrapper, the straw. Notice one today.' }
      ]
    },
    cleanliness: {
      bad: [
        { title: 'Put your bins out', body: 'Cleanliness scores are well below average here. Keep wet and dry bins separate, put them out on collection days, and do not dump on empty plots or in drains — that clogs the system and creates disease vectors.' },
        { title: 'Report missed collection', body: 'If your collection vehicle skips your lane, report it to the ward office. Repeated misses are often a route problem, not a habit problem.' }
      ],
      mid: [
        { title: 'Stop the empty-plot dump', body: 'Cleanliness here is near the Khandwa average. The single biggest thing you can do is stop using empty plots or road edges as dumps — those become permanent the moment they start.' },
        { title: 'Clean your frontage', body: 'Ten minutes sweeping the strip outside your gate every morning is the cheapest civic act available, and it is contagious.' }
      ],
      good: [
        { title: 'Set the example', body: 'Cleanliness here is above average. Encourage neighbours who slip. Cleanliness in this city is contagious in both directions.' },
        { title: 'Adopt a public spot', body: 'A park corner, a bus stop, a wall. Ten minutes a week keeping it clean communicates more than any poster.' }
      ]
    }
  };

  const FALLBACK_TIPS = [
    { title: 'Separate your waste', body: 'Keep wet and dry waste in separate bins.' },
    { title: 'Compost at home', body: 'A small compost bin turns kitchen waste into soil within weeks.' },
    { title: 'Support local recyclers', body: 'Sell dry waste to a kabadiwala instead of discarding it.' },
    { title: 'Reduce single-use plastic', body: 'Carry a cloth bag and refuse plastic cutlery.' },
    { title: 'Keep your frontage clean', body: 'Sweep the strip outside your home every morning.' }
  ];

  function tipsFor(zone) {
    try {
      const metrics = ['recycle', 'greenery', 'plastic', 'cleanliness'];
      const sorted = metrics
        .map(m => {
          const s = metricInfo(zone, m).sentiment;
          return { metric: m, state: s, weight: s === 'bad' ? 0 : s === 'mid' ? 1 : 2 };
        })
        .sort((a, b) => a.weight - b.weight);

      const result = [];
      for (const item of sorted) {
        const bucket = TIPS[item.metric] && TIPS[item.metric][item.state];
        if (!Array.isArray(bucket)) continue;
        for (const tip of bucket) {
          if (result.length < 5) result.push(tip);
          else break;
        }
        if (result.length >= 5) break;
      }
      return result.length ? result.slice(0, 5) : FALLBACK_TIPS;
    } catch (err) {
      console.error('[Khandwa Recycles] tipsFor failed:', err);
      return FALLBACK_TIPS;
    }
  }

  /* ---------- Render overlay content ---------- */
  function renderZoneOverlay(zone) {
    const hero = zone.image_ids && imagePoolById[zone.image_ids[0]];
    const galleryImgs = (zone.image_ids || []).map(id => imagePoolById[id]).filter(Boolean);
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
        <p class="ov-eyebrow">Area profile · Wards ${(zone.wards || []).join(', ')}</p>
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

      <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:var(--ink);font-weight:700;margin:0 0 16px;">Five things this area can improve</h3>
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

  /* ---------- GLOBAL: open a zone ---------- */
  window.openZone = function (id, cardEl) {
    console.log('[Khandwa Recycles] openZone called for:', id, '| element:', !!cardEl);
    const zone = zonesById && zonesById[id];
    if (!zone) {
      console.error('[Khandwa Recycles] Unknown zone id:', id);
      return;
    }

    const doOpen = function () {
      let html = '';
      try {
        html = renderZoneOverlay(zone);
      } catch (err) {
        console.error('[Khandwa Recycles] renderZoneOverlay failed:', err);
        html = `<div style="padding:56px 44px;">
          <h2 style="font-family:var(--display);font-size:36px;margin:0 0 12px;">${zone.name}</h2>
          <p style="color:#991b1b;font-size:14px;line-height:1.6;">This profile failed to render. Error: <code>${String((err && err.message) || err)}</code></p>
        </div>`;
      }
      overlayContent.innerHTML = html;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () {
        overlay.classList.add('open');
        console.log('[Khandwa Recycles] Overlay visible for:', id);
      });
      try {
        history.replaceState(null, '', '#' + id);
      } catch (e) { /* ignore file:// */ }
    };

    if (cardEl) {
      cardEl.classList.add('expanding');
      setTimeout(function () {
        cardEl.classList.remove('expanding');
        doOpen();
      }, 220);
    } else {
      doOpen();
    }
  };

  /* ---------- GLOBAL: close overlay ---------- */
  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () {
      overlay.style.display = 'none';
      overlayContent.innerHTML = '';
    }, 440);
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { /* ignore */ }
  }
  window.closeOverlay = closeOverlay;

  /* ---------- GLOBAL: lightbox ---------- */
  window.openLightbox = function (src, caption) {
    if (!lightbox) return;
    lightboxImg.src = src;
    lightboxImg.alt = caption || '';
    lightboxCaption.textContent = caption || '';
    lightbox.style.display = 'flex';
    requestAnimationFrame(function () {
      lightbox.classList.add('open');
    });
  };

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    setTimeout(function () {
      lightbox.style.display = 'none';
      lightboxImg.src = '';
    }, 300);
  }
  window.closeLightbox = closeLightbox;

  /* ---------- Boot: load data ---------- */
  async function boot() {
    try {
      const results = await Promise.all([
        fetch('data.json').then(r => { if (!r.ok) throw new Error('data.json HTTP ' + r.status); return r.json(); }),
        fetch('zones.geojson').then(r => { if (!r.ok) throw new Error('zones.geojson HTTP ' + r.status); return r.json(); })
      ]);
      cityData = results[0];
      geojson = results[1];
      zonesById = {};
      cityData.zones.forEach(z => { zonesById[z.id] = z; });
      imagePoolById = {};
      cityData.image_pool.forEach(i => { imagePoolById[i.id] = i; });
      console.log('[Khandwa Recycles] Data loaded. Zones:', Object.keys(zonesById).length);
    } catch (err) {
      console.error('[Khandwa Recycles] Data load failed:', err);
      document.body.insertAdjacentHTML('afterbegin',
        '<div style="padding:16px 24px;background:#fef2f2;border-bottom:1px solid #fecaca;font-family:system-ui;font-size:14px;color:#991b1b;">' +
        '<strong>Data failed to load.</strong> The browser blocked <code>fetch()</code>. Open the site through a local server ' +
        '(<code>python3 -m http.server</code> or <code>npx serve</code>) or through the Vercel URL — not by double-clicking index.html.' +
        '<br><br>Error: <code>' + String((err && err.message) || err) + '</code></div>'
      );
      return;
    }

    /* Cache DOM refs */
    overlay = document.getElementById('overlay');
    overlayContent = document.getElementById('overlay-content');
    overlayCloseBtn = document.getElementById('overlay-close');
    overlayBackdrop = document.getElementById('overlay-backdrop');
    lightbox = document.getElementById('lightbox');
    lightboxImg = document.getElementById('lightbox-img');
    lightboxCaption = document.getElementById('lightbox-caption');
    lightboxCloseBtn = document.getElementById('lightbox-close');
    lightboxBackdrop = document.getElementById('lightbox-backdrop');

    /* Wire overlay close buttons */
    overlayCloseBtn.addEventListener('click', closeOverlay);
    overlayBackdrop.addEventListener('click', closeOverlay);

    /* Wire lightbox close buttons */
    lightboxCloseBtn.addEventListener('click', closeLightbox);
    lightboxBackdrop.addEventListener('click', closeLightbox);

    /* Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (lightbox.style.display === 'flex') closeLightbox();
        else if (overlay.style.display === 'flex') closeOverlay();
      }
    });

    /* Global delegation for lightbox images (any [data-full]) */
    document.addEventListener('click', function (e) {
      const item = e.target.closest('[data-full]');
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        window.openLightbox(item.dataset.full, item.dataset.caption);
      }
    });

    /* ---------- City strip ---------- */
    const city = cityData.city;
    document.getElementById('city-strip').innerHTML = [
      { value: city.swachh_rank, unit: '', label: 'Swachh Survekshan rank' },
      { value: city.segregation_score_pct, unit: '%', label: 'Segregation parameter score' },
      { value: city.plastic_tpd, unit: 'T', label: 'Plastic, per day' },
      { value: city.wards, unit: '', label: 'Administrative wards' },
      { value: '2', unit: 'lakh', label: 'Population' }
    ].map(function (c) {
      return '<div class="city-cell">' +
        '<span class="city-cell-value">' + c.value + '<span class="city-cell-unit">' + c.unit + '</span></span>' +
        '<span class="city-cell-label">' + c.label + '</span>' +
        '<span class="city-cell-source">Official</span>' +
      '</div>';
    }).join('');

    /* ---------- Area cards with inline onclick ---------- */
    const sortedZones = cityData.zones.slice().sort(function (a, b) { return b.recycle_pct - a.recycle_pct; });
    const areaGrid = document.getElementById('area-grid');
    areaGrid.innerHTML = sortedZones.map(function (zone, i) {
      const info = metricInfo(zone, 'recycle');
      const firstImage = imagePoolById[zone.image_ids[0]];
      const img = firstImage ? firstImage.url : '';
      const metrics = [
        { label: 'Recycle', key: 'recycle_pct' },
        { label: 'Plastic', key: 'plastic_pct' },
        { label: 'Green', key: 'greenery_pct' },
        { label: 'Clean', key: 'cleanliness_pct' }
      ];
      return '<button class="area-card" type="button" data-zone="' + zone.id + '" onclick="window.openZone(\'' + zone.id + '\', this)">' +
        '<div class="area-card-media">' +
          '<img src="' + img + '" alt="' + (firstImage ? firstImage.caption : zone.name) + '" loading="lazy" />' +
          '<span class="area-badge" data-sentiment="' + info.sentiment + '">' + info.label + '</span>' +
          '<span class="area-rank">' +
            '<span class="num" style="color:' + HEX[info.sentiment] + '">#' + (i + 1) + '</span>' +
            '<span class="lbl">of 8</span>' +
          '</span>' +
        '</div>' +
        '<div class="area-card-body">' +
          '<div class="area-card-top">' +
            '<span class="area-card-name">' + zone.name + '</span>' +
          '</div>' +
          '<p class="area-card-tagline">' + (zone.tagline || '') + '</p>' +
          '<div class="area-mini">' +
            metrics.map(function (m) {
              const val = zone[m.key];
              const mi = metricInfo(zone, m.key.replace('_pct', ''));
              return '<div class="area-mini-cell">' +
                '<span class="area-mini-val" style="color:' + HEX[mi.sentiment] + '">' + val + '%</span>' +
                '<span class="area-mini-label">' + m.label + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</button>';
    }).join('');
    console.log('[Khandwa Recycles] Cards rendered:', sortedZones.length);

    /* ---------- Gallery ---------- */
    const gallery = document.getElementById('gallery-grid');
    gallery.innerHTML = cityData.image_pool.map(function (img) {
      return '<div class="gallery-item" data-full="' + img.url + '" data-caption="' + img.caption + '">' +
        '<img src="' + img.url + '" alt="' + img.caption + '" loading="lazy" />' +
        '<div class="gallery-caption">' + img.caption + '</div>' +
      '</div>';
    }).join('');

    /* ---------- Sources ---------- */
    document.getElementById('sources-list').innerHTML = cityData.city.sources.map(function (s) {
      return '<li><em>' + s.label + '</em> — ' + s.note + '</li>';
    }).join('');

    /* ---------- Map ---------- */
    map = L.map('map', { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: 'OpenStreetMap'
    }).addTo(map);
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });

    function styleFor(feature) {
      const zone = zonesById[feature.properties.id];
      if (!zone) return { color: '#fff', weight: 1, fillOpacity: 0 };
      const info = metricInfo(zone, 'recycle');
      return { color: '#fff', weight: 1.5, opacity: 1, fillColor: HEX[info.sentiment], fillOpacity: 0.75 };
    }
    function hoverStyle(feature) {
      const base = styleFor(feature);
      return { color: '#fff', weight: 2.5, opacity: 1, fillColor: base.fillColor, fillOpacity: 0.95 };
    }

    const layer = L.geoJSON(geojson, {
      style: styleFor,
      onEachFeature: function (feature, l) {
        const zone = zonesById[feature.properties.id];
        if (!zone) return;

        const center = l.getBounds().getCenter();
        L.marker(center, {
          icon: L.divIcon({
            className: 'map-label-wrapper',
            html: '<div class="map-label">' + zone.name + '<span class="pct">' + zone.recycle_pct + '%</span></div>',
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          }),
          interactive: false
        }).addTo(map);

        l.bindTooltip(zone.name + ' · ' + zone.recycle_pct + '% recycling access', {
          sticky: true, direction: 'top', className: 'zone-tooltip', offset: [0, -6]
        });
        l.on('mouseover', function () { l.setStyle(hoverStyle(feature)); });
        l.on('mouseout', function () { l.setStyle(styleFor(feature)); });
        l.on('click', function () { window.openZone(zone.id); });
      }
    }).addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [40, 40] });

    /* ---------- Deep link ---------- */
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      if (zonesById[id]) setTimeout(function () { window.openZone(id); }, 300);
    }

    /* ---------- Scroll reveal ---------- */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    }

    /* ---------- Nav + topbar ---------- */
    const topbar = document.getElementById('topbar');
    const navLinks = document.querySelectorAll('.topnav-link');
    const sections = ['overview', 'areas', 'map', 'gallery', 'about']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    function updateNav() {
      const y = window.scrollY;
      topbar.classList.toggle('scrolled', y > 8);
      let current = sections[0];
      sections.forEach(function (s) { if (s.offsetTop <= y + 160) current = s; });
      navLinks.forEach(function (a) { a.classList.toggle('active', a.dataset.section === current.id); });
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    /* ---------- Back to top ---------- */
    const backTop = document.getElementById('back-to-top');
    function updateBackTop() { backTop.classList.toggle('visible', window.scrollY > 480); }
    window.addEventListener('scroll', updateBackTop, { passive: true });
    updateBackTop();
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    console.log('[Khandwa Recycles] Ready.');
  }

  /* ---------- Start ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();