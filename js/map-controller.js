/* =============================================================
   MAP CONTROLLER
   ============================================================= */
let mapInitialized = false;
let mapInstance = null;
let mapLayers = {};
let activeLayers = { ferrovias: true, rodovias: false, setores: false, polos: true, alternativa1: false, alternativa2: false, entorno: false };
let markers = [];

const LAYER_COLORS = {
  ferrovias: { line: '#cd4239', label: 'Ferrovias' },
  rodovias: { line: '#2c84e0', label: 'Rodovias' },
  setores: { line: '#7c44a6', label: 'Setores' },
  polos: { line: '#2c8c66', label: 'Polos' },
  alternativa1: { line: '#d35400', label: 'Alternativa I' },
  alternativa2: { line: '#e67e22', label: 'Alternativa II' },
  entorno: { line: '#1abc9c', label: 'Entorno Baía' }
};

// Map legend control
var LegendControl = L.Control.extend({
  onAdd: function() {
    var div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = '<div style="background:rgba(255,255,255,0.95);padding:8px 12px;border-radius:6px;font-size:12px;font-family:\'IBM Plex Sans\',sans-serif;line-height:1.6;border:1px solid #dcdfd2">' +
      '<div style="font-weight:600;margin-bottom:4px;color:#23251d">Legenda</div>' +
      '<div><span style="display:inline-block;width:12px;height:3px;background:#cd4239;margin-right:6px;vertical-align:middle"></span>Ferrovias</div>' +
      '<div><span style="display:inline-block;width:12px;height:2px;background:#2c84e0;margin-right:6px;vertical-align:middle;border-top:2px dashed #2c84e0"></span>Rodovias</div>' +
      '<div><span style="display:inline-block;width:12px;height:10px;background:#7c44a6;margin-right:6px;vertical-align:middle;opacity:0.25;border:1px solid #7c44a6"></span>Setores</div>' +
      '<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2c8c66;margin-right:6px;vertical-align:middle"></span>Polos Logísticos</div>' +
      '<div><span style="display:inline-block;width:12px;height:10px;background:#d35400;margin-right:6px;vertical-align:middle;opacity:0.25;border:1px solid #d35400"></span>Alternativa I</div>' +
      '<div><span style="display:inline-block;width:12px;height:10px;background:#e67e22;margin-right:6px;vertical-align:middle;opacity:0.25;border:1px solid #e67e22"></span>Alternativa II</div>' +
      '<div><span style="display:inline-block;width:12px;height:10px;background:#1abc9c;margin-right:6px;vertical-align:middle;opacity:0.25;border:1px solid #1abc9c"></span>Entorno Baía</div>' +
      '</div>';
    return div;
  }
});


function initMap() {
  if (mapInitialized) {
    if (mapInstance) mapInstance.invalidateSize();
    return;
  }
  mapInitialized = true;

  const container = document.getElementById('map-container');
  if (!container || container._leaflet_id) return;

  mapInstance = L.map('map-container', {
    center: [-13.5, -42.0],
    zoom: 6,
    zoomControl: true,
    attributionControl: true
  });

  window.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  window.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });

  window.currentBaseLayer = window.osmLayer;
  window.currentBaseLayer.addTo(mapInstance);

  // Bahia outline — carregado de GeoJSON com fallback inline
  loadBahiaOutline();

  // Camadas de dados
  mapLayers.ferrovias = L.layerGroup();
  loadGeoJSONLayer('ferrovias', 'data/ferrovias.geojson', FERROVIAS, styleFerrovias, renderFerroviasFallback);

  mapLayers.rodovias = L.layerGroup();
  loadGeoJSONLayer('rodovias', 'data/rodovias.geojson', RODOVIAS, styleRodovias, renderRodoviasFallback);

  mapLayers.setores = L.layerGroup();
  loadGeoJSONLayer('setores', 'data/setores.geojson', SETORES_CONSTRUCAO, styleSetores, renderSetoresFallback);

  mapLayers.polos = L.layerGroup();
  loadPolosFromGeoJSON();

  // Camadas ESRI
  mapLayers.alternativa1 = L.layerGroup();
  loadESRILayer('alternativa1', 'data/Alternativa I.json', styleAlternativa1);

  mapLayers.alternativa2 = L.layerGroup();
  loadESRILayer('alternativa2', 'data/Alternativa II.json', styleAlternativa2);

  mapLayers.entorno = L.layerGroup();
  loadESRILayer('entorno', 'data/EntornoBaíaCIA.json', styleEntorno);

  // Map legend
  var legend = new LegendControl({ position: 'bottomleft' });
  legend.addTo(mapInstance);

  // Ensure map renders correctly
  setTimeout(() => { mapInstance.invalidateSize(); }, 100);

  // Hide loading
  const loading = document.getElementById('map-loading');
  if (loading) loading.classList.add('hidden');
}


/* =============================================================
   GEOJSON LOADER — tenta fetch, fallback para dados inline
   ============================================================= */
function loadGeoJSONLayer(name, url, fallbackData, styleFn, renderFn) {
  fetch(url)
    .then(function(r) { if (!r.ok) throw new Error('GeoJSON not found'); return r.json(); })
    .then(function(gj) {
      L.geoJSON(gj, {
        style: styleFn,
        onEachFeature: function(f, l) { if (f.properties.name) l.bindPopup(f.properties.name); }
      }).addTo(mapLayers[name]);
      if (activeLayers[name]) mapInstance.addLayer(mapLayers[name]);
    })
    .catch(function() {
      renderFn(fallbackData);
      if (activeLayers[name]) mapInstance.addLayer(mapLayers[name]);
    });
}


/* =============================================================
   ESRI JSON → GEOJSON CONVERTER
   ============================================================= */
function flattenESRICoords(item) {
  if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'number') return [item];
  if (Array.isArray(item)) {
    var result = [];
    item.forEach(function(el) { result = result.concat(flattenESRICoords(el)); });
    return result;
  }
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
      var g = f.geometry;
      var rings = g.rings || g.curveRings || null;
      if (!rings) return null;
      var coords = rings.map(function(ring) { return flattenESRICoords(ring); });
      return {
        type: 'Feature',
        properties: props,
        geometry: { type: geoType, coordinates: coords }
      };
    }).filter(function(f) { return f !== null; })
  };
}

function loadESRILayer(name, url, styleFn) {
  fetch(url)
    .then(function(r) { if (!r.ok) throw new Error('ESRI JSON not found'); return r.json(); })
    .then(function(esriJson) {
      var gj = esriJsonToGeoJSON(esriJson);
      if (!gj) return;
      L.geoJSON(gj, {
        style: styleFn,
        onEachFeature: function(f, l) {
          var n = f.properties.name || f.properties.nome || '';
          if (n) l.bindPopup(n);
        }
      }).addTo(mapLayers[name]);
      if (activeLayers[name]) mapInstance.addLayer(mapLayers[name]);
    })
    .catch(function() {});
}


/* =============================================================
   BAHIA OUTLINE
   ============================================================= */
function loadBahiaOutline() {
  fetch('data/bahia-outline.geojson')
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(gj) {
      L.geoJSON(gj, {
        style: { color: '#23251d', weight: 1.5, fillColor: '#fcfcfa', fillOpacity: 0.3 }
      }).addTo(mapInstance);
    })
    .catch(function() {
      L.polygon(BAHIA_OUTLINE, {
        color: '#23251d', weight: 1.5, fillColor: '#fcfcfa', fillOpacity: 0.3
      }).addTo(mapInstance);
    });
}


/* =============================================================
   ESTILOS POR CAMADA
   ============================================================= */
function styleFerrovias(f) {
  return { color: f.properties.color || '#cd4239', weight: f.properties.weight || 3, opacity: 0.85 };
}

function styleRodovias(f) {
  return { color: f.properties.color || '#2c84e0', weight: f.properties.weight || 2.5, opacity: 0.7, dashArray: '6 4' };
}

function styleSetores(f) {
  return { color: f.properties.color || '#7c44a6', weight: 1.5, fillColor: f.properties.color || '#7c44a6', fillOpacity: f.properties.fillOpacity || 0.12 };
}


function styleAlternativa1(f) {
  return { color: '#d35400', weight: 2, fillColor: '#d35400', fillOpacity: 0.15 };
}
function styleAlternativa2(f) {
  return { color: '#e67e22', weight: 2, fillColor: '#e67e22', fillOpacity: 0.15 };
}
function styleEntorno(f) {
  return { color: '#1abc9c', weight: 2, fillColor: '#1abc9c', fillOpacity: 0.12 };
}


/* =============================================================
   FALLBACK — renderiza a partir dos arrays inline (map-data.js)
   ============================================================= */
function renderFerroviasFallback(data) {
  data.forEach(function(f) {
    L.polyline(f.coords, { color: f.color, weight: f.weight, opacity: 0.85 })
      .bindPopup(f.name).addTo(mapLayers.ferrovias);
  });
}

function renderRodoviasFallback(data) {
  data.forEach(function(r) {
    L.polyline(r.coords, { color: r.color, weight: r.weight, opacity: 0.7, dashArray: '6 4' })
      .bindPopup(r.name).addTo(mapLayers.rodovias);
  });
}

function renderSetoresFallback(data) {
  data.forEach(function(s) {
    L.polygon(s.coords, { color: s.color, weight: 1.5, fillColor: s.color, fillOpacity: s.fillOpacity })
      .bindPopup(s.name).addTo(mapLayers.setores);
  });
}


/* =============================================================
   POLOS — tem ícone customizado, tratado separadamente
   ============================================================= */
function loadPolosFromGeoJSON() {
  const greenIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#2c8c66;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });

  fetch('data/polos.geojson')
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(gj) {
      L.geoJSON(gj, {
        pointToLayer: function(f, latlng) {
          return L.marker(latlng, { icon: greenIcon });
        },
        onEachFeature: function(f, l) {
          l.bindPopup('<strong>' + f.properties.name + '</strong><br>' + f.properties.type);
        }
      }).addTo(mapLayers.polos);
      if (activeLayers.polos) mapInstance.addLayer(mapLayers.polos);
    })
    .catch(function() {
      POLOS_LOGISTICOS.forEach(function(p) {
        var m = L.marker(p.coords, { icon: greenIcon })
          .bindPopup('<strong>' + p.name + '</strong><br>' + p.type)
          .addTo(mapLayers.polos);
        markers.push(m);
      });
      if (activeLayers.polos) mapInstance.addLayer(mapLayers.polos);
    });
}


/* =============================================================
   BASE LAYER TOGGLE (Mapa / Satélite)
   ============================================================= */
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


/* =============================================================
   LAYER TOGGLE
   ============================================================= */
function toggleLayer(name) {
  if (!mapLayers[name]) return;
  activeLayers[name] = !activeLayers[name];

  if (activeLayers[name]) {
    mapInstance.addLayer(mapLayers[name]);
  } else {
    mapInstance.removeLayer(mapLayers[name]);
  }

  document.querySelectorAll('.layer-btn[data-layer="' + name + '"]').forEach(function(btn) {
    btn.classList.toggle('active', activeLayers[name]);
  });

  document.querySelectorAll('.info-card[data-info="' + name + '"]').forEach(function(card) {
    card.classList.toggle('active', activeLayers[name]);
    var badge = card.querySelector('.badge');
    if (badge) {
      badge.className = 'badge ' + (activeLayers[name] ? 'on' : 'off');
      badge.textContent = activeLayers[name] ? 'Ativo' : 'Inativo';
    }
  });

  if (mapInstance) mapInstance.invalidateSize();
}

// Layer button event binding
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.layer-btn[data-layer]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      toggleLayer(this.dataset.layer);
    });
  });

  document.querySelectorAll('.layer-btn.base').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setBaseLayer(this.dataset.baselayer);
    });
  });

  Object.keys(activeLayers).forEach(function(key) {
    if (activeLayers[key]) {
      document.querySelectorAll('.info-card[data-info="' + key + '"]').forEach(function(card) {
        card.classList.add('active');
      });
    }
  });
});