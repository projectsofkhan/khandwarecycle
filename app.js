/* ============================================
   Khandwa Recycles — app.js
   Simple, bulletproof, view-switching.
   ============================================ */

/* ---------- State ---------- */
var cityData = null;
var geojson = null;
var zonesById = {};
var imagePoolById = {};
var map = null;
var currentView = 'landing';
var currentDetailId = null;
var landingScrollPos = 0;

/* ---------- Sentiment helpers ---------- */
var HEX = { bad: '#dc2626', mid: '#d97706', good: '#16a34a' };

function metricInfo(zone, key) {
  var value = zone[key + '_pct'];
  if (key === 'plastic') {
    if (value <= 10) return { value: value, label: 'Low', sentiment: 'good' };
    if (value <= 12) return { value: value, label: 'Moderate', sentiment: 'mid' };
    return { value: value, label: 'High', sentiment: 'bad' };
  }
  if (key === 'recycle') {
    if (value < 20) return { value: value, label: 'Low', sentiment: 'bad' };
    if (value < 30) return { value: value, label: 'Moderate', sentiment: 'mid' };
    return { value: value, label: 'Higher', sentiment: 'good' };
  }
  if (key === 'greenery') {
    if (value < 10) return { value: value, label: 'Low', sentiment: 'bad' };
    if (value < 15) return { value: value, label: 'Moderate', sentiment: 'mid' };
    return { value: value, label: 'Higher', sentiment: 'good' };
  }
  if (key === 'cleanliness') {
    if (value < 50) return { value: value, label: 'Low', sentiment: 'bad' };
    if (value < 65) return { value: value, label: 'Moderate', sentiment: 'mid' };
    return { value: value, label: 'Higher', sentiment: 'good' };
  }
  return { value: value, label: '—', sentiment: 'mid' };
}

/* ---------- Tips library ---------- */
var TIPS = {
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
      { title: 'Give saplings instead of gifts', body: 'At weddings, births, and ceremonies, gift a sapling in a painted pot. It costs less than a decorative item, lasts decades, and becomes a small landmark in your family\u2019s story.' }
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

var FALLBACK_TIPS = [
  { title: 'Separate your waste', body: 'Keep wet and dry waste in separate bins.' },
  { title: 'Compost at home', body: 'A small compost bin turns kitchen waste into soil within weeks.' },
  { title: 'Support local recyclers', body: 'Sell dry waste to a kabadiwala instead of discarding it.' },
  { title: 'Reduce single-use plastic', body: 'Carry a cloth bag and refuse plastic cutlery.' },
  { title: 'Keep your frontage clean', body: 'Sweep the strip outside your home every morning.' }
];

function tipsFor(zone) {
  try {
    var metrics = ['recycle', 'greenery', 'plastic', 'cleanliness'];
    var sorted = metrics.map(function (m) {
      var s = metricInfo(zone, m).sentiment;
      return { metric: m, state: s, weight: s === 'bad' ? 0 : s === 'mid' ? 1 : 2 };
    }).sort(function (a, b) { return a.weight - b.weight; });

    var result = [];
    for (var i = 0; i < sorted.length && result.length < 5; i++) {
      var bucket = TIPS[sorted[i].metric] && TIPS[sorted[i].metric][sorted[i].state];
      if (!Array.isArray(bucket)) continue;
      for (var j = 0; j < bucket.length && result.length < 5; j++) {
        result.push(bucket[j]);
      }
    }
    return result.length ? result : FALLBACK_TIPS;
  } catch (err) {
    console.error('[Khandwa Recycles] tipsFor failed:', err);
    return FALLBACK_TIPS;
  }
}

/* ============================================
   GLOBAL FUNCTIONS (called from onclick attributes)
   ============================================ */

window.goHome = function (event) {
  if (event) event.preventDefault();
  if (currentView === 'detail') {
    closeDetail({ restoreScroll: false });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.goSection = function (event, id) {
  if (event) event.preventDefault();
  if (currentView === 'detail') {
    var detail = document.getElementById('view-detail');
    var landing = document.getElementById('view-landing');
    detail.style.display = 'none';
    landing.style.display = 'block';
    if (map) setTimeout(function () { map.invalidateSize(); }, 50);
    currentView = 'landing';
    currentDetailId = null;
    if (location.hash) {
      history.pushState({}, '', location.pathname + location.search);
    }
  }
  var el = document.getElementById(id);
  if (el) {
    var top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }
};

window.openZone = function (id) {
  var zone = zonesById[id];
  if (!zone) {
    console.warn('[Khandwa Recycles] Unknown zone:', id);
    return;
  }
  landingScrollPos = window.scrollY;
  renderDetail(zone);

  var landing = document.getElementById('view-landing');
  var detail = document.getElementById('view-detail');
  landing.style.display = 'none';
  landing.classList.remove('visible');
  detail.classList.remove('visible');
  detail.style.display = 'block';
  window.scrollTo(0, 0);

  currentView = 'detail';
  currentDetailId = id;

  requestAnimationFrame(function () {
    detail.classList.add('visible');
  });

  if (location.hash !== '#' + id) {
    try {
      history.pushState({ zone: id }, '', '#' + id);
    } catch (e) {
      location.hash = id;
    }
  }
};

window.closeDetail = function (opts) {
  var restore = !opts || opts.restoreScroll !== false;
  var detail = document.getElementById('view-detail');
  var landing = document.getElementById('view-landing');
  detail.style.display = 'none';
  detail.classList.remove('visible');
  landing.style.display = 'block';

  if (map) {
    setTimeout(function () { map.invalidateSize(); }, 50);
  }

  currentView = 'landing';
  currentDetailId = null;

  if (location.hash) {
    try {
      history.pushState({}, '', location.pathname + location.search);
    } catch (e) {
      location.hash = '';
    }
  }

  if (restore) {
    window.scrollTo(0, landingScrollPos);
  } else {
    window.scrollTo(0, 0);
  }

  requestAnimationFrame(function () {
    landing.classList.add('visible');
    // Re-trigger reveal for elements below current scroll
    setTimeout(function () {
      document.querySelectorAll('#view-landing .reveal').forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) el.classList.add('visible');
      });
    }, 60);
  });
};

window.openLightbox = function (src) {
  var lb = document.getElementById('lightbox');
  var img = document.getElementById('lightbox-img');
  if (!lb || !img) return;
  img.src = src;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function () {
  var lb = document.getElementById('lightbox');
  var img = document.getElementById('lightbox-img');
  if (!lb) return;
  lb.style.display = 'none';
  if (img) img.src = '';
  document.body.style.overflow = '';
};

window.scrollToTop = function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ============================================
   DETAIL RENDERING
   ============================================ */

function renderDetail(zone) {
  var container = document.getElementById('detail-content');
  if (!container) return;

  var hero = zone.image_ids && imagePoolById[zone.image_ids[0]];
  var galleryImgs = (zone.image_ids || []).map(function (id) { return imagePoolById[id]; }).filter(Boolean);
  var metrics = [
    { key: 'recycle', label: 'Recycling access' },
    { key: 'plastic', label: 'Plastic share' },
    { key: 'greenery', label: 'Greenery' },
    { key: 'cleanliness', label: 'Cleanliness' }
  ];
  var tips = tipsFor(zone);

  var heroHtml = hero
    ? '<div class="detail-hero"><img src="' + hero.url + '" alt="' + hero.caption + '" loading="eager" />' +
      '<div class="detail-hero-meta">' +
        '<p class="detail-eyebrow">Area profile · Wards ' + (zone.wards || []).join(', ') + '</p>' +
        '<h1 class="detail-title">' + zone.name + '</h1>' +
        '<p class="detail-tagline">' + (zone.tagline || '') + '</p>' +
      '</div>' +
      '</div>'
    : '<h1 class="detail-title" style="margin:0 0 12px;color:var(--ink);">' + zone.name + '</h1>' +
      '<p class="detail-eyebrow" style="color:var(--muted);margin-bottom:20px;">Area profile · Wards ' + (zone.wards || []).join(', ') + '</p>';

  var metricsHtml = metrics.map(function (m) {
    var mi = metricInfo(zone, m.key);
    return '<div class="detail-metric">' +
      '<span class="detail-metric-label">' + m.label + '</span>' +
      '<span class="detail-metric-value" style="color:' + HEX[mi.sentiment] + '">' + mi.value + '<span class="detail-metric-unit">%</span></span>' +
      '<span class="detail-metric-status" style="color:' + HEX[mi.sentiment] + '">' + mi.label + '</span>' +
      '</div>';
  }).join('');

  var galleryHtml = galleryImgs.length
    ? '<h3 class="detail-gallery-heading">Photographs</h3>' +
      '<div class="detail-gallery">' +
        galleryImgs.map(function (g) {
          return '<img src="' + g.url + '" alt="' + g.caption + '" loading="lazy" onclick="openLightbox(\'' + g.url.replace(/'/g, "\\'") + '\')" />';
        }).join('') +
      '</div>'
    : '';

  var tipsHtml = '<h3 class="detail-tips-heading">Five things this area can improve</h3>' +
    '<p class="detail-tips-sub">Specific actions, based on the numbers above.</p>' +
    '<div class="detail-tips">' +
      tips.map(function (t, i) {
        return '<div class="detail-tip">' +
          '<span class="detail-tip-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<div>' +
            '<h4 class="detail-tip-title">' + t.title + '</h4>' +
            '<p class="detail-tip-body">' + t.body + '</p>' +
          '</div>' +
          '</div>';
      }).join('') +
    '</div>';

  container.innerHTML =
    heroHtml +
    '<p class="detail-notes">' + (zone.notes || '') + '</p>' +
    '<div class="detail-metrics">' + metricsHtml + '</div>' +
    galleryHtml +
    tipsHtml +
    '<p class="detail-source">' +
      '<strong>Illustrative estimates</strong> — area-level figures are modelled from observed service patterns, not official ward data. City-level figures on the overview are official.' +
    '</p>' +
    '<div class="detail-back"><button class="back-btn" type="button" onclick="closeDetail()"><span class="back-arrow">←</span> Back to all areas</button></div>';
}

/* ============================================
   BOOT
   ============================================ */

function boot() {
  Promise.all([
    fetch('data.json').then(function (r) { if (!r.ok) throw new Error('data.json HTTP ' + r.status); return r.json(); }),
    fetch('zones.geojson').then(function (r) { if (!r.ok) throw new Error('zones.geojson HTTP ' + r.status); return r.json(); })
  ]).then(function (results) {
    cityData = results[0];
    geojson = results[1];

    cityData.zones.forEach(function (z) { zonesById[z.id] = z; });
    cityData.image_pool.forEach(function (i) { imagePoolById[i.id] = i; });

    renderCityStrip();
    renderAreaCards();
    renderGallery();
    renderSources();
    renderMap();

    // Show landing view
    document.getElementById('view-landing').classList.add('visible');

    // Deep link: if hash in URL, open that zone
    var initialHash = location.hash.slice(1);
    if (initialHash && zonesById[initialHash]) {
      window.openZone(initialHash);
    }

    // Reveal observer
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    }

    // Scroll handlers
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    console.log('[Khandwa Recycles] Ready. Zones:', Object.keys(zonesById).length);
  }).catch(function (err) {
    console.error('[Khandwa Recycles] Load failed:', err);
    var banner = document.createElement('div');
    banner.style.cssText = 'padding:16px 24px;background:#fef2f2;border-bottom:1px solid #fecaca;font-family:system-ui;font-size:14px;color:#991b1b;line-height:1.6;';
    banner.innerHTML = '<strong>Data failed to load.</strong> The browser blocked <code>fetch()</code>. ' +
      'Open this site through a local server (<code>python3 -m http.server</code> or <code>npx serve</code>) ' +
      'or the deployed Vercel URL — not by double-clicking index.html.<br><br>' +
      'Error: <code>' + String((err && err.message) || err) + '</code>';
    document.body.insertBefore(banner, document.body.firstChild);
  });
}

/* ---------- Renderers ---------- */

function renderCityStrip() {
  var city = cityData.city;
  var cells = [
    { value: city.swachh_rank, unit: '', label: 'Swachh Survekshan rank' },
    { value: city.segregation_score_pct, unit: '%', label: 'Segregation parameter score' },
    { value: city.plastic_tpd, unit: 'T', label: 'Plastic, per day' },
    { value: city.wards, unit: '', label: 'Administrative wards' },
    { value: '2', unit: 'lakh', label: 'Population' }
  ];
  document.getElementById('city-strip').innerHTML = cells.map(function (c) {
    return '<div class="city-cell">' +
      '<span class="city-cell-value">' + c.value + '<span class="city-cell-unit">' + c.unit + '</span></span>' +
      '<span class="city-cell-label">' + c.label + '</span>' +
      '<span class="city-cell-source">Official</span>' +
      '</div>';
  }).join('');
}

function renderAreaCards() {
  var sorted = cityData.zones.slice().sort(function (a, b) { return b.recycle_pct - a.recycle_pct; });
  var html = sorted.map(function (zone, i) {
    var info = metricInfo(zone, 'recycle');
    var firstImg = imagePoolById[zone.image_ids[0]];
    var img = firstImg ? firstImg.url : '';
    var miniMetrics = [
      { label: 'Recycle', key: 'recycle_pct' },
      { label: 'Plastic', key: 'plastic_pct' },
      { label: 'Green', key: 'greenery_pct' },
      { label: 'Clean', key: 'cleanliness_pct' }
    ];
    return '<button class="area-card" type="button" onclick="openZone(\'' + zone.id + '\')">' +
      '<div class="area-card-media">' +
        (img ? '<img src="' + img + '" alt="' + (firstImg.caption || zone.name) + '" loading="lazy" />' : '') +
        '<span class="area-badge" data-sentiment="' + info.sentiment + '">' + info.label + '</span>' +
        '<span class="area-rank">' +
          '<span class="num" style="color:' + HEX[info.sentiment] + '">#' + (i + 1) + '</span>' +
          '<span class="lbl">of 8</span>' +
        '</span>' +
      '</div>' +
      '<div class="area-card-body">' +
        '<h3 class="area-card-name">' + zone.name + '</h3>' +
        '<p class="area-card-tagline">' + (zone.tagline || '') + '</p>' +
        '<div class="area-mini">' +
          miniMetrics.map(function (m) {
            var mi = metricInfo(zone, m.key.replace('_pct', ''));
            return '<div class="area-mini-cell">' +
              '<span class="area-mini-val" style="color:' + HEX[mi.sentiment] + '">' + zone[m.key] + '%</span>' +
              '<span class="area-mini-label">' + m.label + '</span>' +
              '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '</button>';
  }).join('');
  document.getElementById('area-grid').innerHTML = html;
}

function renderGallery() {
  var html = cityData.image_pool.map(function (img) {
    return '<div class="gallery-item" onclick="openLightbox(\'' + img.url.replace(/'/g, "\\'") + '\')">' +
      '<img src="' + img.url + '" alt="' + img.caption + '" loading="lazy" />' +
      '<div class="gallery-caption">' + img.caption + '</div>' +
      '</div>';
  }).join('');
  document.getElementById('gallery-grid').innerHTML = html;
}

function renderSources() {
  var html = cityData.city.sources.map(function (s) {
    return '<li><em>' + s.label + '</em> — ' + s.note + '</li>';
  }).join('');
  document.getElementById('sources-list').innerHTML = html;
}

function renderMap() {
  var mapEl = document.getElementById('map');
  if (!mapEl) return;

  map = L.map('map', { scrollWheelZoom: false, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: 'OpenStreetMap'
  }).addTo(map);

  map.on('focus', function () { map.scrollWheelZoom.enable(); });
  map.on('blur', function () { map.scrollWheelZoom.disable(); });

  function styleFor(feature) {
    var zone = zonesById[feature.properties.id];
    if (!zone) return { color: '#fff', weight: 1, fillOpacity: 0 };
    var info = metricInfo(zone, 'recycle');
    return { color: '#fff', weight: 1.5, opacity: 1, fillColor: HEX[info.sentiment], fillOpacity: 0.75 };
  }
  function hoverStyle(feature) {
    var base = styleFor(feature);
    return { color: '#fff', weight: 2.5, opacity: 1, fillColor: base.fillColor, fillOpacity: 0.95 };
  }

  var layer = L.geoJSON(geojson, {
    style: styleFor,
    onEachFeature: function (feature, l) {
      var zone = zonesById[feature.properties.id];
      if (!zone) return;

      var center = l.getBounds().getCenter();
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
}

/* ---------- Scroll handlers ---------- */
function onScroll() {
  var y = window.scrollY;
  var backTop = document.getElementById('back-to-top');
  if (backTop) backTop.classList.toggle('visible', y > 480);

  // Update nav active state
  var navLinks = document.querySelectorAll('.topnav-link');
  var sections = ['overview', 'areas', 'map', 'gallery', 'about'].map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);

  var current = sections[0];
  sections.forEach(function (s) {
    if (s.offsetTop <= y + 160) current = s;
  });
  navLinks.forEach(function (a) {
    a.classList.toggle('active', a.dataset.section === (current && current.id));
  });
}

/* ---------- Browser history support ---------- */
window.addEventListener('popstate', function () {
  var hash = location.hash.slice(1);
  if (hash && zonesById[hash]) {
    if (currentView !== 'detail' || currentDetailId !== hash) {
      renderDetail(zonesById[hash]);
      var landing = document.getElementById('view-landing');
      var detail = document.getElementById('view-detail');
      landing.style.display = 'none';
      detail.style.display = 'block';
      window.scrollTo(0, 0);
      currentView = 'detail';
      currentDetailId = hash;
      requestAnimationFrame(function () { detail.classList.add('visible'); });
    }
  } else {
    if (currentView === 'detail') {
      document.getElementById('view-detail').style.display = 'none';
      document.getElementById('view-detail').classList.remove('visible');
      document.getElementById('view-landing').style.display = 'block';
      if (map) setTimeout(function () { map.invalidateSize(); }, 50);
      window.scrollTo(0, landingScrollPos);
      currentView = 'landing';
      currentDetailId = null;
    }
  }
});

/* ---------- Escape key ---------- */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    var lb = document.getElementById('lightbox');
    if (lb && lb.style.display === 'flex') {
      window.closeLightbox();
    }
  }
});

/* ---------- Start ---------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}