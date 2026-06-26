let mapInitialized = false;
let mapInstance = null;
let mapLayers = {};
let activeLayers = {};
let fetchCache = {};
var subLayers = {};
var lastToggled = null;

LAYER_GROUPS.forEach(function(g) {
  g.layers.forEach(function(l) { activeLayers[l.id] = false; });
});

function getLayerConfig(id) {
  for (var i = 0; i < LAYER_GROUPS.length; i++)
    for (var j = 0; j < LAYER_GROUPS[i].layers.length; j++)
      if (LAYER_GROUPS[i].layers[j].id === id) return LAYER_GROUPS[i].layers[j];
  return null;
}

var LegendControl = L.Control.extend({
  onAdd: function() {
    var div = L.DomUtil.create('div', 'map-legend');
    var html = '<div style="background:rgba(255,255,255,0.95);padding:8px 12px;border-radius:6px;font-size:12px;font-family:\'IBM Plex Sans\',sans-serif;line-height:1.6;border:1px solid #dcdfd2">' +
      '<div style="font-weight:600;margin-bottom:4px;color:#23251d">Legenda</div>';
    LAYER_GROUPS.forEach(function(g) { g.layers.forEach(function(l) { html += legendEntry(l); }); });
    html += '</div>';
    div.innerHTML = html;
    return div;
  }
});

function legendEntry(lc) {
  var cls = lc.subtype === 'point' || lc.type === 'polos'
    ? 'width:10px;height:10px;border-radius:50%;background:' + lc.color + ';margin-right:6px;vertical-align:middle'
    : lc.geometry === 'line' || lc.subtype === 'line'
      ? 'width:12px;height:2px;background:' + lc.color + ';margin-right:6px;vertical-align:middle'
      : 'width:12px;height:10px;background:' + lc.color + ';margin-right:6px;vertical-align:middle;opacity:0.25;border:1px solid ' + lc.color;
  return '<div><span style="display:inline-block;' + cls + '"></span>' + lc.label + '</div>';
}

function initMap() {
  var loadStart = Date.now();
  if (mapInitialized) { if (mapInstance) mapInstance.invalidateSize(); return; }
  mapInitialized = true;
  var container = document.getElementById('map-container');
  if (!container || container._leaflet_id) return;
  mapInstance = L.map('map-container', {
    center: [-13.5, -42.0], zoom: 6, zoomControl: true, attributionControl: true
  });
  window.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  window.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18, attribution: 'Tiles &copy; Esri'
  });
  window.currentBaseLayer = window.osmLayer;
  window.currentBaseLayer.addTo(mapInstance);
  loadBahiaOutline();
  buildLayerControls();
  LAYER_GROUPS.forEach(function(g) {
    g.layers.forEach(function(lc) {
      mapLayers[lc.id] = L.layerGroup();
      loadLayer(lc);
    });
  });
  new LegendControl({ position: 'bottomleft' }).addTo(mapInstance);
  L.control.scale({ position: 'bottomright', metric: true, imperial: false }).addTo(mapInstance);
  addCenterBox();
  setTimeout(function() { mapInstance.invalidateSize(); }, 100);
  var loading = document.getElementById('map-loading');
  if (loading) {
    var elapsed = Date.now() - loadStart;
    var delay = Math.max(0, 3000 - elapsed);
    setTimeout(function() { loading.classList.add('hidden'); }, delay);
  }
}

function fetchFile(url) {
  if (!fetchCache[url])
    fetchCache[url] = fetch(url).then(function(r) { if (!r.ok) throw new Error(); return r.json(); });
  return fetchCache[url];
}

function loadLayer(lc) {
  switch (lc.type) {
    case 'geojson': loadGeoJSON(lc); break;
    case 'esri': loadESRI(lc); break;
    case 'bts': loadBTS(lc); break;
    case 'polos': loadPolos(lc); break;
  }
}

function makeStyle(lc) {
  return function(f) {
    var t = f.geometry.type;
    if (t === 'Polygon' || t === 'MultiPolygon')
      return { color: lc.color, weight: 2, fillColor: lc.color, fillOpacity: 0.12 };
    if (t === 'LineString' || t === 'MultiLineString') {
      var s = { color: lc.color, weight: 2.5, opacity: 0.7 };
      if (lc.dashed) s.dashArray = '6 4';
      return s;
    }
    return { color: lc.color, weight: 2 };
  };
}

function loadGeoJSON(lc) {
  fetchFile(lc.file).then(function(gj) {
    L.geoJSON(gj, {
      style: makeStyle(lc),
      pointToLayer: function(f, latlng) {
        return L.circleMarker(latlng, { radius: 6, color: lc.color, fillColor: lc.color, fillOpacity: 0.6, weight: 2 });
      },
      onEachFeature: function(f, l) { var n = f.properties.name || f.properties.Nome || ''; if (n) l.bindPopup(n); }
    }).addTo(mapLayers[lc.id]);
    if (activeLayers[lc.id]) mapInstance.addLayer(mapLayers[lc.id]);
  }).catch(function() {});
}

function loadESRI(lc) {
  fetchFile(lc.file).then(function(esriJson) {
    var gj = esriJsonToGeoJSON(esriJson);
    if (!gj) return;
    L.geoJSON(gj, {
      style: { color: lc.color, weight: 2, fillColor: lc.color, fillOpacity: 0.15 },
      onEachFeature: function(f, l) { var n = f.properties.name || f.properties.nome || ''; if (n) l.bindPopup(n); }
    }).addTo(mapLayers[lc.id]);
    if (activeLayers[lc.id]) mapInstance.addLayer(mapLayers[lc.id]);
  }).catch(function() {});
}

function filterFeature(f, lc) {
  if (lc.nameFilter) return f.properties.name === lc.nameFilter;
  if (lc.namePrefix) return (f.properties.name || '').indexOf(lc.namePrefix) === 0;
  if (lc.nameList) return lc.nameList.indexOf(f.properties.name) !== -1;
  var t = f.geometry.type;
  if (lc.subtype === 'point') {
    if (lc.excludeNames && lc.excludeNames.indexOf(f.properties.name) !== -1) return false;
    return t === 'Point';
  }
  if (lc.subtype === 'line') return t === 'LineString' || t === 'MultiLineString';
  if (lc.subtype === 'polygon') return t === 'Polygon' || t === 'MultiPolygon';
  return false;
}

function loadBTS(lc) {
  fetchFile(lc.file).then(function(gj) {
    var features = gj.features.filter(function(f) { return filterFeature(f, lc); });
    if (!features.length) return;

    if (lc.submenu) {
      subLayers[lc.id] = { features: features, items: {}, active: {}, names: {} };
      features.forEach(function(f, idx) {
        var name = f.properties.name || f.properties.Nome || f.properties.type || ('Item ' + (idx + 1));
        var itemId = lc.id + '_' + idx;
        subLayers[lc.id].names[itemId] = name;
        subLayers[lc.id].active[itemId] = false;
        subLayers[lc.id].items[itemId] = L.geoJSON({ type: 'FeatureCollection', features: [f] }, {
          style: makeStyle(lc),
          pointToLayer: function(feat, latlng) {
            return L.circleMarker(latlng, { radius: 5, color: lc.color, fillColor: lc.color, fillOpacity: 0.6, weight: 2 });
          },
          onEachFeature: function(feat, layer) { var n = feat.properties.name || feat.properties.Nome || ''; if (n) layer.bindPopup(n); }
        });
      });
    } else {
      L.geoJSON({ type: 'FeatureCollection', features: features }, {
        style: makeStyle(lc),
        pointToLayer: function(f, latlng) {
          return L.circleMarker(latlng, { radius: 5, color: lc.color, fillColor: lc.color, fillOpacity: 0.6, weight: 2 });
        },
        onEachFeature: function(f, l) { var n = f.properties.name || f.properties.Nome || f.properties.type || ''; if (n) l.bindPopup(n); }
      }).addTo(mapLayers[lc.id]);
    }
    if (activeLayers[lc.id]) mapInstance.addLayer(mapLayers[lc.id]);
  }).catch(function() {});
}

function loadPolos(lc) {
  var icon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;border-radius:50%;background:' + lc.color + ';border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10]
  });
  fetchFile(lc.file).then(function(gj) {
    L.geoJSON(gj, {
      pointToLayer: function(f, latlng) { return L.marker(latlng, { icon: icon }); },
      onEachFeature: function(f, l) { l.bindPopup('<strong>' + f.properties.name + '</strong><br>' + f.properties.type); }
    }).addTo(mapLayers[lc.id]);
    if (activeLayers[lc.id]) mapInstance.addLayer(mapLayers[lc.id]);
  }).catch(function() {});
}

function buildLayerControls() {
  var container = document.getElementById('layer-controls');
  var html = '';
  LAYER_GROUPS.forEach(function(g) {
    html += '<div class="layer-group">';
    html += '<div class="group-header" data-group="' + g.id + '"><span class="group-arrow">' + (g.expanded ? '\u25BC' : '\u25B6') + '</span> ' + g.icon + ' ' + g.label + '</div>';
    html += '<div class="group-body"' + (g.expanded ? '' : ' style="display:none"') + '>';
    g.layers.forEach(function(l) {
      var isActive = activeLayers[l.id];
      html += '<div class="layer-row">';
      html += '<button class="layer-btn' + (isActive ? ' active' : '') + '" data-layer="' + l.id + '"><span class="dot" style="background:' + l.color + '"></span> ' + l.label + '</button>';
      if (l.submenu) {
        html += '<button class="sub-arrow" data-submenu="' + l.id + '">\u25B6</button>';
      }
      html += '</div>';
      if (l.submenu) {
        html += '<div class="sub-items" data-parent="' + l.id + '"></div>';
      }
    });
    html += '</div></div>';
  });
  container.innerHTML = html;
}

function populateSubItems(parentId) {
  var sl = subLayers[parentId];
  if (!sl) return;
  var container = document.querySelector('.sub-items[data-parent="' + parentId + '"]');
  if (!container) return;
  var lc = getLayerConfig(parentId);
  var html = '';
  Object.keys(sl.names).forEach(function(itemId) {
    html += '<button class="sub-item' + (sl.active[itemId] ? ' active' : '') + '" data-parent="' + parentId + '" data-item="' + itemId + '">';
    html += '<span class="sub-dot" style="background:' + lc.color + '"></span> ' + sl.names[itemId];
    html += '</button>';
  });
  container.innerHTML = html;
}

function toggleLayer(id) {
  var lc = getLayerConfig(id);
  if (!lc || !mapLayers[id]) return;
  activeLayers[id] = !activeLayers[id];

  if (activeLayers[id]) {
    if (lc.submenu && subLayers[id]) {
      var sl = subLayers[id];
      Object.keys(sl.items).forEach(function(itemId) {
        mapInstance.addLayer(sl.items[itemId]);
        sl.active[itemId] = true;
      });
    }
    mapInstance.addLayer(mapLayers[id]);
    lastToggled = id;
  } else {
    if (lc.submenu && subLayers[id]) {
      var sl = subLayers[id];
      Object.keys(sl.items).forEach(function(itemId) {
        mapInstance.removeLayer(sl.items[itemId]);
        sl.active[itemId] = false;
        var subBtn = document.querySelector('.sub-item[data-item="' + itemId + '"]');
        if (subBtn) subBtn.classList.remove('active');
      });
    }
    mapInstance.removeLayer(mapLayers[id]);
    if (lastToggled === id) lastToggled = null;
  }

  document.querySelectorAll('.layer-btn[data-layer="' + id + '"]').forEach(function(btn) {
    btn.classList.toggle('active', activeLayers[id]);
  });
  syncPageButtons(id);
  if (mapInstance) mapInstance.invalidateSize();
}

function toggleSubItem(parentId, itemId) {
  if (!subLayers[parentId]) return;
  var sl = subLayers[parentId];
  sl.active[itemId] = !sl.active[itemId];
  if (sl.active[itemId]) mapInstance.addLayer(sl.items[itemId]);
  else mapInstance.removeLayer(sl.items[itemId]);
  var btn = document.querySelector('.sub-item[data-item="' + itemId + '"]');
  if (btn) btn.classList.toggle('active', sl.active[itemId]);
}

function toggleGroup(groupId) {
  var body = document.querySelector('.group-header[data-group="' + groupId + '"] + .group-body');
  if (!body) return;
  var isHidden = body.style.display === 'none';
  body.style.display = isHidden ? '' : 'none';
  var arrow = document.querySelector('.group-header[data-group="' + groupId + '"] .group-arrow');
  if (arrow) arrow.textContent = isHidden ? '\u25BC' : '\u25B6';
}

function setBaseLayer(name) {
  var layer = name === 'satelite' ? window.satelliteLayer : window.osmLayer;
  if (window.currentBaseLayer === layer) return;
  mapInstance.removeLayer(window.currentBaseLayer);
  window.currentBaseLayer = layer;
  mapInstance.addLayer(layer);
  document.querySelectorAll('.layer-btn.base').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.baselayer === name);
  });
}

function addCenterBox() {
  var wrapper = document.createElement('div');
  wrapper.id = 'center-coords';
  wrapper.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:800;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.92);border:1px solid #dcdfd2;border-radius:6px;padding:4px 8px;font-family:"IBM Plex Sans",sans-serif;font-size:12px;color:#23251d;';
  var label = document.createElement('span');
  label.style.cssText = 'pointer-events:none;';
  wrapper.appendChild(label);
  var copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copiar';
  copyBtn.style.cssText = 'font-family:"IBM Plex Sans",sans-serif;font-size:10px;font-weight:600;padding:2px 8px;border:1px solid #bfc1b7;border-radius:4px;background:#fff;color:#23251d;cursor:pointer;line-height:1.4;';
  copyBtn.onmouseover = function() { copyBtn.style.background = '#e5e7e0'; };
  copyBtn.onmouseout = function() { copyBtn.style.background = '#fff'; };
  wrapper.appendChild(copyBtn);
  document.body.appendChild(wrapper);
  function update() {
    if (!mapInstance) return;
    var c = mapInstance.getCenter();
    label.textContent = c.lat.toFixed(5) + ', ' + c.lng.toFixed(5);
  }
  copyBtn.onclick = function() {
    if (!mapInstance) return;
    var c = mapInstance.getCenter();
    var scaleEl = document.querySelector('.leaflet-control-scale-line');
    var scale = scaleEl ? scaleEl.textContent.trim() : '';
    var text = c.lat.toFixed(5) + ', ' + c.lng.toFixed(5) + (scale ? ' — ' + scale : '');
    navigator.clipboard.writeText(text).then(function() {
      var orig = copyBtn.textContent;
      copyBtn.textContent = 'Copiado!';
      setTimeout(function() { copyBtn.textContent = orig; }, 1500);
    });
  };
  update();
  mapInstance.on('move', update);
}

function toggleSidebar(open) {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var btn = document.getElementById('sidebar-toggle');
  if (!sidebar || !overlay || !btn) return;
  var isOpen = open !== undefined ? open : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', isOpen);
  overlay.classList.toggle('open', isOpen);
  btn.innerHTML = isOpen ? '\u25C0 <span class="toggle-label">Camadas</span>' : '\u25B6 <span class="toggle-label">Camadas</span>';
}

function showImageViewer(itemId) {
  var viewer = document.getElementById('image-viewer');
  var title = document.getElementById('iv-title');
  var img = document.getElementById('iv-image');
  if (!viewer || !title || !img) return;
  var filename = IMAGE_MAP[itemId];
  if (!filename) { viewer.style.display = 'none'; return; }
  title.textContent = filename;
  img.src = 'data/img/' + filename;
  viewer.style.display = 'flex';
}

function setupImageViewerDrag() {
  var viewer = document.getElementById('image-viewer');
  var header = viewer ? viewer.querySelector('.iv-header') : null;
  if (!viewer || !header) return;
  var offsetX = 0, offsetY = 0, startX = 0, startY = 0;
  header.addEventListener('mousedown', function(e) {
    if (e.target.closest('.iv-close')) return;
    startX = e.clientX;
    startY = e.clientY;
    offsetX = viewer.offsetLeft;
    offsetY = viewer.offsetTop;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  function onMouseMove(e) {
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    viewer.style.left = (offsetX + dx) + 'px';
    viewer.style.top = (offsetY + dy) + 'px';
    viewer.style.bottom = 'auto';
    viewer.style.right = 'auto';
  }
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

/* ============================================================
   PAGE / SLIDE SYSTEM
   ============================================================ */
const PAGE_LAYER_MAP = {
  0: ['int_brasil', 'int_bahia', 'int_ferrovias', 'int_cidades'],
  1: ['mac_bahia', 'mac_cidades', 'mac_vias'],
  2: ['bts_ferrovias', 'bts_rodovias', 'bts_circulo']
};

function buildPageLayers() {
  [0, 1, 2].forEach(function(pageIdx) {
    var container = document.querySelector('.page-layers[data-page="' + pageIdx + '"]');
    if (!container) return;
    var ids = PAGE_LAYER_MAP[pageIdx] || [];
    var html = '';
    ids.forEach(function(id) {
      var lc = getLayerConfig(id);
      if (!lc) return;
      var isActive = activeLayers[id];
      html += '<button class="page-layer-btn' + (isActive ? ' active' : '') + '" data-page-layer="' + id + '">' +
        '<span class="page-dot" style="background:' + lc.color + '"></span> ' + lc.label +
        '</button>';
    });
    container.innerHTML = html;
  });
}

function syncPageButtons(id) {
  document.querySelectorAll('.page-layer-btn[data-page-layer="' + id + '"]').forEach(function(btn) {
    btn.classList.toggle('active', !!activeLayers[id]);
  });
}

function switchSlide(index) {
  document.querySelectorAll('.slide-tab').forEach(function(tab) {
    tab.classList.toggle('active', parseInt(tab.dataset.slide) === index);
  });
  document.querySelectorAll('.slide-page').forEach(function(page) {
    page.classList.toggle('active', parseInt(page.dataset.slide) === index);
  });
  if (index === 2) {
    if (mapInstance) mapInstance.flyTo([-12.76878, -38.46107], 12, { duration: 2 });
  } else {
    toggleGallery(false);
  }
}

function toggleAllLayers(pageIndex) {
  var ids = PAGE_LAYER_MAP[pageIndex];
  if (!ids || !ids.length) return;
  var anyOff = false;
  ids.forEach(function(id) { if (!activeLayers[id]) anyOff = true; });
  ids.forEach(function(id) {
    var on = anyOff;
    if (activeLayers[id] !== on) toggleLayer(id);
  });
  var btn = document.querySelector('.toggle-all-btn[data-page="' + pageIndex + '"]');
  if (btn) btn.classList.toggle('active', anyOff);
}

function buildGallery() {
  var grid = document.getElementById('gallery-grid');
  if (!grid) return;
  var imageKeys = Object.keys(IMAGE_MAP);
  var html = '';
  imageKeys.forEach(function(key) {
    var filename = IMAGE_MAP[key];
    html += '<div class="gallery-item" data-img-key="' + key + '">' +
      '<img src="data/img/' + filename + '" alt="' + filename + '" loading="lazy">' +
      '<span class="gallery-label">' + filename + '</span>' +
      '</div>';
  });
  grid.innerHTML = html;
}

function toggleGallery(open) {
  var overlay = document.getElementById('gallery-overlay');
  if (!overlay) return;
  var isOpen = open !== undefined ? open : !overlay.classList.contains('open');
  overlay.classList.toggle('open', isOpen);
}

document.addEventListener('DOMContentLoaded', function() {
  initMap();
  buildPageLayers();
  buildGallery();

  document.querySelector('.slide-tabs').addEventListener('click', function(e) {
    var tab = e.target.closest('.slide-tab');
    if (tab) switchSlide(parseInt(tab.dataset.slide));
  });

  document.querySelector('.slide-body').addEventListener('click', function(e) {
    var btn = e.target.closest('.page-layer-btn');
    if (btn && btn.dataset.pageLayer) toggleLayer(btn.dataset.pageLayer);
    var toggleAll = e.target.closest('.toggle-all-btn');
    if (toggleAll) toggleAllLayers(parseInt(toggleAll.dataset.page));
  });

  document.getElementById('gallery-grid').addEventListener('click', function(e) {
    var item = e.target.closest('.gallery-item');
    if (item) showImageViewer(item.dataset.imgKey);
  });

  document.getElementById('gallery-open-btn').addEventListener('click', function() { toggleGallery(true); });

  document.getElementById('gallery-close').addEventListener('click', function() { toggleGallery(false); });

  document.getElementById('sidebar-toggle').addEventListener('click', function() { toggleSidebar(); });
  document.getElementById('sidebar-close').addEventListener('click', function() { toggleSidebar(false); });
  document.getElementById('sidebar-overlay').addEventListener('click', function() { toggleSidebar(false); });
  document.getElementById('iv-close').addEventListener('click', function() {
    document.getElementById('image-viewer').style.display = 'none';
  });
  setupImageViewerDrag();

  document.getElementById('layer-controls').addEventListener('click', function(e) {
    var subArrow = e.target.closest('.sub-arrow');
    if (subArrow) {
      var parentId = subArrow.dataset.submenu;
      var items = document.querySelector('.sub-items[data-parent="' + parentId + '"]');
      if (!items) return;
      var isOpen = items.classList.toggle('open');
      subArrow.textContent = isOpen ? '\u25BC' : '\u25B6';
      if (isOpen && !items.children.length && subLayers[parentId]) populateSubItems(parentId);
      return;
    }

    var subItem = e.target.closest('.sub-item');
    if (subItem) {
      toggleSubItem(subItem.dataset.parent, subItem.dataset.item);
      showImageViewer(subItem.dataset.item);
      return;
    }

    var btn = e.target.closest('.layer-btn');
    if (btn && btn.dataset.layer) toggleLayer(btn.dataset.layer);
    var gh = e.target.closest('.group-header');
    if (gh && gh.dataset.group) toggleGroup(gh.dataset.group);
  });

  document.querySelectorAll('.base-toggles').forEach(function(bt) {
    bt.addEventListener('click', function(e) {
      var baseBtn = e.target.closest('.layer-btn.base');
      if (baseBtn && baseBtn.dataset.baselayer) setBaseLayer(baseBtn.dataset.baselayer);
    });
  });
});

function flattenESRICoords(item) {
  if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'number') return [item];
  if (Array.isArray(item)) { var r = []; item.forEach(function(el) { r = r.concat(flattenESRICoords(el)); }); return r; }
  if (item && typeof item === 'object' && item.c) return flattenESRICoords(item.c);
  return [];
}

function esriJsonToGeoJSON(esriJson) {
  var geoType;
  if (esriJson.geometryType === 'esriGeometryPolygon') geoType = 'Polygon';
  else if (esriJson.geometryType === 'esriGeometryPolyline') geoType = 'LineString';
  else if (esriJson.geometryType === 'esriGeometryPoint') geoType = 'Point';
  else return null;
  return {
    type: 'FeatureCollection',
    features: esriJson.features.map(function(f) {
      var props = {};
      var attrs = f.attributes || {};
      Object.keys(attrs).forEach(function(k) { props[k.toLowerCase()] = attrs[k]; });
      var rings = (f.geometry.rings || f.geometry.curveRings || null);
      if (!rings) return null;
      return { type: 'Feature', properties: props, geometry: { type: geoType, coordinates: rings.map(function(r) { return flattenESRICoords(r); }) } };
    }).filter(function(f) { return f !== null; })
  };
}

function loadBahiaOutline() {
  fetch('data/bahia-outline.geojson').then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(gj) { L.geoJSON(gj, { style: { color: '#23251d', weight: 1.5, fillColor: '#fcfcfa', fillOpacity: 0.3 } }).addTo(mapInstance); })
    .catch(function() {
      if (typeof BAHIA_OUTLINE !== 'undefined') L.polygon(BAHIA_OUTLINE, { color: '#23251d', weight: 1.5, fillColor: '#fcfcfa', fillOpacity: 0.3 }).addTo(mapInstance);
    });
}
