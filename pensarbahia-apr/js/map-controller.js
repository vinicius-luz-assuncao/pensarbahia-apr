let mapInitialized = false;
let mapInstance = null;
let mapLayers = {};
let activeLayers = {};
let fetchCache = {};
var subLayers = {};
var lastToggled = null;
var bahiaOutlineLayer = null;

LAYER_GROUPS.forEach(function(g) {
  g.layers.forEach(function(l) { activeLayers[l.id] = false; });
});
// Start with Brasil and Bahia active on slide 1
activeLayers['int_brasil'] = true;
activeLayers['int_bahia'] = true;

function getLayerConfig(id) {
  for (var i = 0; i < LAYER_GROUPS.length; i++)
    for (var j = 0; j < LAYER_GROUPS[i].layers.length; j++)
      if (LAYER_GROUPS[i].layers[j].id === id) return LAYER_GROUPS[i].layers[j];
  return null;
}

var LegendControl = L.Control.extend({
  onAdd: function() {
    var div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = '<div style="background:rgba(255,255,255,0.95);padding:8px 12px;border-radius:6px;font-size:12px;font-family:\'IBM Plex Sans\',sans-serif;line-height:1.6;border:1px solid #dcdfd2">' +
      '<div style="font-weight:600;margin-bottom:4px;color:#23251d">Legenda</div><div class="legend-entries"></div></div>';
    return div;
  }
});

function updateLegend() {
  var container = document.querySelector('.map-legend .legend-entries');
  if (!container) return;
  var html = '';
  LAYER_GROUPS.forEach(function(g) {
    g.layers.forEach(function(l) {
      if (l.type === 'mancha') return;
      if (activeLayers[l.id]) {
        if (l.submenu && subLayers[l.id]) {
          var sl = subLayers[l.id];
          if (l.legendLabel) {
            html += '<div><span style="display:inline-block;width:12px;height:2px;background:' + l.color + ';margin-right:6px;vertical-align:middle"></span>' + l.legendLabel + '</div>';
          } else {
            Object.keys(sl.names).forEach(function(itemId) {
              if (sl.active[itemId]) {
                var color = l.color;
                var name = sl.names[itemId];
                if (l.featureNames) {
                  var hideInLegend = false;
                  Object.keys(l.featureNames).forEach(function(k) {
                    if (l.featureNames[k].label === name) {
                      color = l.featureNames[k].color;
                      if (l.featureNames[k].hideLabel) hideInLegend = true;
                    }
                  });
                  if (hideInLegend) return;
                } else {
                  var idx = parseInt(itemId.split('_').pop());
                  var style = umapLineStyle(sl.features[idx], l);
                  color = style.color;
                }
                html += '<div><span style="display:inline-block;width:12px;height:2px;background:' + color + ';margin-right:6px;vertical-align:middle"></span>' + name + '</div>';
              }
            });
          }
        } else {
          html += '<div><span style="display:inline-block;' +
            (l.subtype === 'point' || l.type === 'polos'
              ? 'width:10px;height:10px;border-radius:50%;background:' + l.color + ';margin-right:6px;vertical-align:middle'
              : l.geometry === 'line' || l.subtype === 'line'
                ? 'width:12px;height:2px;background:' + l.color + ';margin-right:6px;vertical-align:middle'
                : 'width:12px;height:10px;background:' + l.color + ';margin-right:6px;vertical-align:middle;opacity:0.25;border:1px solid ' + l.color) +
            '"></span>' + l.label + '</div>';
        }
      }
    });
  });
  // Check subRoute layers (individual route toggles)
  Object.keys(ROUTE_SUB_ITEMS).forEach(function(routeId) {
    var mapping = ROUTE_SUB_ITEMS[routeId];
    var sl = subLayers[mapping.parentId];
    if (!sl) return;
    var isActive = false;
    Object.keys(sl.names).forEach(function(k) {
      if (sl.names[k] === mapping.name && sl.active[k]) isActive = true;
    });
    if (isActive) {
      var lc = getLayerConfig(routeId);
      html += '<div><span style="display:inline-block;width:12px;height:2px;background:' + (lc ? lc.color : '#999') + ';margin-right:6px;vertical-align:middle"></span>' + (lc ? lc.label : mapping.name) + '</div>';
    }
  });

  // Bahia legend custom entries (shown when bahia image is active)
  var bahiaFS = document.getElementById('bahia-fullscreen');
  if (bahiaFS && bahiaFS.classList.contains('active')) {
    html += '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #dcdfd2;font-weight:600;font-size:11px;color:#555">RODOVIAS BAHIA</div>';
    html += '<div class="legend-custom-row"><span class="legend-swatch solid-green"></span> FEDERAL PAVIMENTADA</div>';
    html += '<div class="legend-custom-row"><span class="legend-swatch dashed-green"></span> FEDERAL SEM PAVIMENTA\u00c7\u00c3O</div>';
    html += '<div class="legend-custom-row"><span class="legend-swatch solid-purple"></span> ESTADUAL PAVIMENTADA</div>';
    html += '<div class="legend-custom-row"><span class="legend-swatch dashed-purple"></span> ESTADUAL SEM PAVIMENTA\u00c7\u00c3O</div>';
  }
  container.innerHTML = html || '';
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
  window.osmLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 18, attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
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
  new LegendControl({ position: 'bottomright' }).addTo(mapInstance);
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
    case 'circle-editor':
      var circle = L.circle(lc.center, { radius: lc.radius, color: lc.color, weight: lc.weight || 2, fillColor: lc.color, fillOpacity: 0.08 });
      mapLayers[lc.id] = L.layerGroup([circle]);
      if (activeLayers[lc.id]) mapInstance.addLayer(mapLayers[lc.id]);
      break;
    case 'mancha':
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem('pensarbahia_mancha_ctrl')); } catch(e) {}
      var srcPts = (saved && saved.length >= 3) ? saved : lc.coordinates[0].map(function(p) { return [p[0], p[1]]; });
      var poly = L.polygon(srcPts, { color: lc.color || '#2ecc71', weight: lc.weight || 0, fillColor: lc.color || '#2ecc71', fillOpacity: lc.fillOpacity || 0.2 });
      var layerGroup = L.layerGroup([poly]);
      mapLayers[lc.id] = layerGroup;
      if (activeLayers[lc.id]) mapInstance.addLayer(mapLayers[lc.id]);
      break;
  }
}

function makeStyle(lc) {
  return function(f) {
    var t = f.geometry.type;
    if (t === 'Polygon' || t === 'MultiPolygon')
      return { color: lc.color, weight: lc.weight || 2, fillColor: lc.color, fillOpacity: lc.fillOpacity || 0.12 };
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
    var dirs = ['top', 'right', 'bottom', 'left'];
    var labelCount = 0;

    if (lc.submenu) {
      // If featureNames is defined, group features by named entries
      if (lc.featureNames) {
        subLayers[lc.id] = { features: [], items: {}, active: {}, names: {} };
        var nameGroups = {};
        Object.keys(lc.featureNames).forEach(function(groupName) {
          var cfg = lc.featureNames[groupName];
          var groupFeatures = gj.features.filter(function(f) { return cfg.ids && cfg.ids.indexOf(f.id) !== -1; });
          if (!groupFeatures.length) return;
          nameGroups[groupName] = { features: groupFeatures, style: { color: cfg.color, weight: cfg.weight || 3, opacity: cfg.opacity || 0.8, dashArray: cfg.dashArray }, label: cfg.label || groupName, dashMap: cfg.dashMap, hideLabel: cfg.hideLabel };
        });
        var groupIdx = 0;
        Object.keys(nameGroups).forEach(function(groupName) {
          var grp = nameGroups[groupName];
          var itemId = lc.id + '_g' + groupIdx;
          subLayers[lc.id].names[itemId] = grp.label;
          subLayers[lc.id].active[itemId] = false;
          var geoLayer = L.geoJSON({ type: 'FeatureCollection', features: grp.features }, {
            style: function(f) {
              var s = Object.assign({}, grp.style);
              if (grp.dashArray && !s.dashArray) s.dashArray = grp.dashArray;
              if (grp.dashMap && f && f.id && grp.dashMap[f.id]) s.dashArray = grp.dashMap[f.id];
              return s;
            },
            pointToLayer: function(feat, latlng) {
              var s = grp.style;
              var marker = L.circleMarker(latlng, { radius: 5, color: s.color, fillColor: s.color, fillOpacity: 0.6, weight: 2 });
              var n = feat.properties.name || feat.properties.Nome || '';
              if (n && lc.subtype === 'point') {
                var customDir = lc.labelDirections && lc.labelDirections[n];
                var dir = customDir || dirs[labelCount++ % dirs.length];
                marker.bindTooltip(n, { permanent: true, direction: dir, offset: [0, -8], className: 'city-label' });
              }
              return marker;
            },
            onEachFeature: function(feat, layer) { var n = feat.properties.name || feat.properties.Nome || ''; if (n) layer.bindPopup(n); }
          });
          // Add route label at midpoint of the longest segment
          var labelGroup = L.layerGroup();
          if (!grp.hideLabel) {
            var bestCoords = null, bestLen = 0;
            grp.features.forEach(function(f) {
              var segs = [];
              if (f.geometry.type === 'LineString') segs = [f.geometry.coordinates];
              else if (f.geometry.type === 'MultiLineString') segs = f.geometry.coordinates;
              segs.forEach(function(c) {
                if (c.length > bestLen) { bestLen = c.length; bestCoords = c; }
              });
            });
            if (bestCoords) {
              var midCoord = bestCoords[Math.floor(bestCoords.length / 2)];
              var lblColor = grp.style.color || '#333';
              var savedPos = routeLabelStore.saved[itemId];
              var initLat = savedPos ? savedPos.lat : midCoord[1];
              var initLng = savedPos ? savedPos.lng : midCoord[0];
              var initRot = savedPos ? (savedPos.rotation || 0) : 0;
              var label = L.marker([initLat, initLng], {
                icon: L.divIcon({
                  className: 'route-label',
                  html: '<span style="display:inline-block;transform:rotate(' + initRot + 'deg);background:' + lblColor + ';color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700;white-space:nowrap;border:1px solid rgba(0,0,0,0.3);box-shadow:0 1px 3px rgba(0,0,0,0.3)">' + grp.label + '</span>',
                  iconSize: [0, 0],
                  iconAnchor: [0, 0]
                }),
                draggable: true
              });
              label._rid = itemId;
              label._rot = initRot;
              label._lblColor = lblColor;
              label._setRot = function(deg) {
                this._rot = deg;
                var el = this.getElement();
                if (el) { var sp = el.querySelector('span'); if (sp) sp.style.transform = 'rotate(' + deg + 'deg)'; }
              };
              label.on('dragend', function() { routeLabelStore.dirty = true; });
              label.on('add', function() {
                var el = this.getElement();
                if (el) { var sp = el.querySelector('span'); if (sp) sp.style.transform = 'rotate(' + this._rot + 'deg)'; }
              });
              label.on('click', function() {
                if (routeLabelStore.selected) routeLabelStore.selected._deselect();
                routeLabelStore.selected = this;
                this._deselect = function() { var e = this.getElement(); if (e) e.style.outline = ''; };
                var e = this.getElement();
                if (e) e.style.outline = '2px solid #fff';
              });
              routeLabelStore.labels.push(label);
              labelGroup.addLayer(label);
            }
          }
          subLayers[lc.id].items[itemId] = L.layerGroup([geoLayer, labelGroup]);
          groupIdx++;
        });
      } else {
        subLayers[lc.id] = { features: features, items: {}, active: {}, names: {} };
        features.forEach(function(f, idx) {
          var name = f.properties.name || f.properties.Nome || f.properties.type || ('Item ' + (idx + 1));
          var itemId = lc.id + '_' + idx;
          subLayers[lc.id].names[itemId] = name;
          subLayers[lc.id].active[itemId] = false;
          subLayers[lc.id].items[itemId] = L.geoJSON({ type: 'FeatureCollection', features: [f] }, {
            style: function() { return umapLineStyle(f, lc); },
            pointToLayer: function(feat, latlng) {
              var s = umapLineStyle(feat, lc);
              var marker = L.circleMarker(latlng, { radius: 5, color: s.color, fillColor: s.color, fillOpacity: 0.6, weight: 2 });
              var n = feat.properties.name || feat.properties.Nome || '';
              if (n && lc.subtype === 'point') {
                var dir = dirs[labelCount++ % dirs.length];
                marker.bindTooltip(n, { permanent: true, direction: dir, offset: [0, -8], className: 'city-label' });
              }
              return marker;
            },
            onEachFeature: function(feat, layer) { var n = feat.properties.name || feat.properties.Nome || ''; if (n) layer.bindPopup(n); }
          });
        });
      }
    } else {
      L.geoJSON({ type: 'FeatureCollection', features: features }, {
        style: function(f) { return umapLineStyle(f, lc); },
        pointToLayer: function(f, latlng) {
          var s = umapLineStyle(f, lc);
          var marker = L.circleMarker(latlng, { radius: 5, color: s.color, fillColor: s.color, fillOpacity: 0.6, weight: 2 });
          var n = f.properties.name || f.properties.Nome || '';
              if (n && lc.subtype === 'point') {
                var hide = lc.hideLabels && lc.hideLabels.indexOf(n) !== -1;
                var customDir = lc.labelDirections && lc.labelDirections[n];
                var dir = hide ? 'right' : customDir || dirs[labelCount++ % dirs.length];
                if (hide) {
                  marker.bindTooltip('', { permanent: false });
                } else {
                  marker.bindTooltip(n, { permanent: true, direction: dir, offset: [0, -8], className: 'city-label' });
                }
              }
          return marker;
        },
        onEachFeature: function(f, l) { var n = f.properties.name || f.properties.Nome || f.properties.type || ''; if (n) l.bindPopup(n); }
      }).addTo(mapLayers[lc.id]);
    }
    // Add extra points (e.g., cities not in the GeoJSON)
    if (lc.extraPoints) {
      lc.extraPoints.forEach(function(ep) {
        var marker = L.circleMarker([ep.lat, ep.lng], { radius: 5, color: lc.color, fillColor: lc.color, fillOpacity: 0.6, weight: 2 });
        if (ep.labelDir) {
          marker.bindTooltip(ep.name, { permanent: true, direction: ep.labelDir, offset: [0, -8], className: 'city-label' });
        }
        marker.bindPopup(ep.name);
        marker._pensarExtra = true;
        mapLayers[lc.id].addLayer(marker);
      });
    }
    if (activeLayers[lc.id]) mapInstance.addLayer(mapLayers[lc.id]);
  }).catch(function() {});
}

function parseUmapColor(f) {
  if (!f || !f.properties || !f.properties._umap_options) return null;
  var raw = f.properties._umap_options;
  if (typeof raw === 'string') {
    var style = {};
    raw.split(';').forEach(function(p) {
      var kv = p.split('=');
      if (kv.length === 2) style[kv[0].trim()] = kv[1].trim();
    });
    return style.color ? style : null;
  }
  if (typeof raw === 'object') {
    if (raw.color) {
      var s = { color: raw.color };
      if (raw.opacity !== undefined) s.opacity = parseFloat(String(raw.opacity).replace(',', '.'));
      if (raw.weight !== undefined) s.weight = parseFloat(String(raw.weight).replace(',', '.'));
      return s;
    }
  }
  return null;
}

function umapLineStyle(f, lc) {
  var umap = parseUmapColor(f);
  var style = { color: (umap && umap.color) || lc.color, weight: lc.weight || 5, opacity: 0.8 };
  if (umap) {
    if (umap.opacity !== undefined) style.opacity = umap.opacity;
    if (umap.weight !== undefined) style.weight = umap.weight;
  }
  return style;
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
    var style;
    if (lc.featureNames) {
      var groupName = sl.names[itemId];
      var found = null;
      Object.keys(lc.featureNames).forEach(function(k) {
        if (lc.featureNames[k].label === groupName || k === groupName) found = lc.featureNames[k];
      });
      if (found) style = { color: found.color, weight: found.weight || 3, opacity: found.opacity || 0.8 };
      else style = { color: lc.color, weight: 2.5, opacity: 0.7 };
    } else {
      var idx = parseInt(itemId.split('_').pop());
      var feat = sl.features[idx];
      style = umapLineStyle(feat, lc);
    }
    html += '<button class="sub-item' + (sl.active[itemId] ? ' active' : '') + '" data-parent="' + parentId + '" data-item="' + itemId + '">';
    html += '<span class="sub-dot" style="background:' + style.color + '"></span> ' + sl.names[itemId];
    html += '</button>';
  });
  container.innerHTML = html;
}

function toggleLayer(id) {
  var lc = getLayerConfig(id);
  if (!lc) return;

  // Handle subRoute layers (individual route toggle)
  if (lc.subRoute) {
    var mapping = ROUTE_SUB_ITEMS[id];
    if (mapping) {
      function doToggle(attempt) {
        var sl = subLayers[mapping.parentId];
        if (!sl) { if (attempt < 10) setTimeout(function() { doToggle(attempt + 1); }, 300); return; }
        // Find the itemId by matching the name
        var itemId = null;
        Object.keys(sl.names).forEach(function(k) {
          if (sl.names[k] === mapping.name) itemId = k;
        });
        if (itemId && sl.items[itemId]) {
          toggleSubItem(mapping.parentId, itemId);
          var active = sl.active[itemId];
          document.querySelectorAll('.page-layer-btn[data-page-layer="' + id + '"]').forEach(function(btn) {
            btn.classList.toggle('active', active);
          });
          document.querySelectorAll('.layer-btn[data-layer="' + id + '"]').forEach(function(btn) {
            btn.classList.toggle('active', active);
          });
        } else if (attempt < 10) {
          setTimeout(function() { doToggle(attempt + 1); }, 300);
        }
      }
      doToggle(0);
    }
    return;
  }

  if (!mapLayers[id]) return;
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
        if (sl._animating && sl._animating[itemId]) {
          mapInstance.removeLayer(sl._animating[itemId]);
          clearInterval(sl._animating[itemId]._timer);
          delete sl._animating[itemId];
        }
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
  updateLegend();
  updateBahiaOutline();
  if (mapInstance) mapInstance.invalidateSize();
}

function toggleSubItem(parentId, itemId) {
  if (!subLayers[parentId]) return;
  var sl = subLayers[parentId];
  var wasActive = sl.active[itemId];
  sl.active[itemId] = !wasActive;
  var lc = getLayerConfig(parentId);
  if (!wasActive) {
    // For group-based featureNames, add the whole layer without animation
    if (lc && lc.featureNames) {
      mapInstance.addLayer(sl.items[itemId]);
    } else {
      var idx = parseInt(itemId.split('_').pop());
      var feat = sl.features[idx];
      if (feat && (feat.geometry.type === 'LineString' || feat.geometry.type === 'MultiLineString')) {
        animateLine(itemId, feat, parentId);
      } else {
        mapInstance.addLayer(sl.items[itemId]);
      }
    }
  } else {
    if (sl._animating && sl._animating[itemId]) {
      mapInstance.removeLayer(sl._animating[itemId]);
      clearInterval(sl._animating[itemId]._timer);
      delete sl._animating[itemId];
    }
    mapInstance.removeLayer(sl.items[itemId]);
  }
  var btn = document.querySelector('.sub-item[data-item="' + itemId + '"]');
  if (btn) btn.classList.toggle('active', sl.active[itemId]);
  updateLegend();
}

function animateLine(itemId, feature, parentId) {
  var lc = getLayerConfig(parentId);
  if (!lc) return;
  var sl = subLayers[parentId];
  if (!feature || !feature.geometry) return;
  var allCoords = [];
  if (feature.geometry.type === 'MultiLineString') {
    feature.geometry.coordinates.forEach(function(part) { allCoords = allCoords.concat(part); });
  } else {
    allCoords = feature.geometry.coordinates;
  }
  if (!allCoords || allCoords.length < 2) {
    mapInstance.addLayer(sl.items[itemId]);
    return;
  }
  var style = umapLineStyle(feature, lc);
  var latlngs = allCoords.map(function(c) { return L.latLng(c[1], c[0]); });
  var total = latlngs.length;
  var p = 0;
  var step = Math.max(1, Math.floor(total / 20));
  var line = L.polyline([latlngs[0]], { color: style.color, weight: style.weight, opacity: style.opacity }).addTo(mapInstance);
  if (!sl._animating) sl._animating = {};
  sl._animating[itemId] = line;
  var timer = setInterval(function() {
    if (!sl._animating || !sl._animating[itemId]) { clearInterval(timer); return; }
    var end = Math.min(p + step, total);
    var segs = latlngs.slice(p, end);
    for (var i = 0; i < segs.length; i++) { line.addLatLng(segs[i]); }
    p = end;
    if (p >= total) {
      clearInterval(timer);
      delete sl._animating[itemId];
      mapInstance.removeLayer(line);
      mapInstance.addLayer(sl.items[itemId]);
    }
  }, 30);
  sl._animating[itemId]._timer = timer;
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
   BAHIA IMAGE DRAG
   ============================================================ */
function initBahiaDrag() {
  var container = document.getElementById('bahia-drag-container');
  var img = document.getElementById('bahia-drag-img');
  if (!container || !img) return;

  var dragging = false, startX, startY, startPX, startPY;
  var imgPos = { x: 50, y: 50 };
  var maxX = 30, maxY = 30;

  function applyPosition() {
    var px = imgPos.x + '%', py = imgPos.y + '%';
    container.style.setProperty('--bahia-img-pos', px + ' ' + py);
    img.style.objectPosition = px + ' ' + py;
  }

  function onStart(e) {
    var ev = e.touches ? e.touches[0] : e;
    dragging = true;
    startX = ev.clientX;
    startY = ev.clientY;
    startPX = imgPos.x;
    startPY = imgPos.y;
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    var ev = e.touches ? e.touches[0] : e;
    var dx = (ev.clientX - startX) / container.offsetWidth * 100;
    var dy = (ev.clientY - startY) / container.offsetHeight * 100;
    imgPos.x = Math.max(50 - maxX, Math.min(50 + maxX, startPX + dx * 1.8));
    imgPos.y = Math.max(50 - maxY, Math.min(50 + maxY, startPY + dy * 1.8));
    applyPosition();
  }

  function onEnd() { dragging = false; }

  container.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  container.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
  applyPosition();
}

/* ============================================================
   MTO (MAP TEXT OVERLAY) NAVIGATION
   ============================================================ */
var mtoStepIndex = 0;

function getStepsForSlide(slideIdx) {
  return document.querySelectorAll('.mto-step[data-slide="' + slideIdx + '"]');
}

function makeStepEditable(step) {
  if (!step) return;
  var highlights = step.querySelectorAll('.mto-highlight');
  var bodies = step.querySelectorAll('.mto-body');
  highlights.forEach(function(el) { el.contentEditable = 'true'; });
  bodies.forEach(function(el) { el.contentEditable = 'true'; });
}

function getStepKey(slideIdx, stepIdx) {
  return 'pensarbahia_mto_' + slideIdx + '_' + stepIdx;
}

function saveStepContent(slideIdx, stepIdx) {
  var steps = getStepsForSlide(slideIdx);
  if (!steps[stepIdx]) return;
  var key = getStepKey(slideIdx, stepIdx);
  try { localStorage.setItem(key, steps[stepIdx].innerHTML); } catch(e) {}
  var ind = document.getElementById('mto-save-indicator');
  if (ind) { ind.classList.add('show'); clearTimeout(ind._hide); ind._hide = setTimeout(function() { ind.classList.remove('show'); }, 2000); }
}

function restoreStepContent(slideIdx, stepIdx) {
  var steps = getStepsForSlide(slideIdx);
  if (!steps[stepIdx]) return;
  var key = getStepKey(slideIdx, stepIdx);
  try {
    var saved = localStorage.getItem(key);
    if (saved) steps[stepIdx].innerHTML = saved;
  } catch(e) {}
}

function showMtoStep(slideIdx, stepIdx) {
  var steps = getStepsForSlide(slideIdx);
  if (!steps.length) return;
  if (stepIdx < 0) stepIdx = 0;
  if (stepIdx >= steps.length) stepIdx = steps.length - 1;
  mtoStepIndex = stepIdx;
  // Hide ALL steps from ALL slides first
  document.querySelectorAll('.mto-step').forEach(function(s) { s.classList.remove('active'); });
  // Show only the target step
  if (steps[stepIdx]) steps[stepIdx].classList.add('active');
  // Restore and make editable
  restoreStepContent(slideIdx, stepIdx);
  makeStepEditable(steps[stepIdx]);
  var counter = document.getElementById('mto-counter');
  if (counter) counter.textContent = (stepIdx + 1) + '/' + steps.length;
  var prev = document.getElementById('mto-prev');
  var next = document.getElementById('mto-next');
  if (prev) prev.disabled = stepIdx === 0;
  if (next) next.disabled = stepIdx >= steps.length - 1;
}

function initMtoNav() {
  var overlay = document.getElementById('map-text-overlay');
  if (!overlay) return;
  var prev = document.getElementById('mto-prev');
  var next = document.getElementById('mto-next');
  if (prev) prev.addEventListener('click', function() {
    var steps = getStepsForSlide(currentSlide);
    if (steps[mtoStepIndex]) saveStepContent(currentSlide, mtoStepIndex);
    mtoStepIndex = Math.max(0, mtoStepIndex - 1);
    showMtoStep(currentSlide, mtoStepIndex);
  });
  if (next) next.addEventListener('click', function() {
    var steps = getStepsForSlide(currentSlide);
    if (steps[mtoStepIndex]) saveStepContent(currentSlide, mtoStepIndex);
    mtoStepIndex = Math.min(steps.length - 1, mtoStepIndex + 1);
    showMtoStep(currentSlide, mtoStepIndex);
  });

  // Add new step
  var addStepBtn = document.getElementById('mto-add-step');
  if (addStepBtn) {
    addStepBtn.addEventListener('click', function() {
      var steps = getStepsForSlide(currentSlide);
      if (steps[mtoStepIndex]) saveStepContent(currentSlide, mtoStepIndex);
      var newIdx = steps.length;
      var newStep = document.createElement('div');
      newStep.className = 'mto-step';
      newStep.setAttribute('data-slide', currentSlide);
      newStep.setAttribute('data-step', newIdx);
      newStep.innerHTML = '<div class="mto-highlight">Novo t&iacute;tulo</div><div class="mto-body">Digite seu texto aqui...</div>';
      document.getElementById('mto-steps').appendChild(newStep);
      showMtoStep(currentSlide, newIdx);
      saveStepContent(currentSlide, newIdx);
    });
  }

  // Helper to save overlay rect for a given slide
  function saveOverlayRect(slideIdx) {
    try {
      var rect = { left: overlay.offsetLeft, top: overlay.offsetTop, width: overlay.offsetWidth, height: overlay.offsetHeight };
      localStorage.setItem('pensarbahia_overlay_rect_' + slideIdx, JSON.stringify(rect));
    } catch(e) {}
  }

  // Helper to restore overlay rect for a given slide
  function restoreOverlayRect(slideIdx) {
    try {
      var saved = localStorage.getItem('pensarbahia_overlay_rect_' + slideIdx);
      var r;
      if (saved) {
        r = JSON.parse(saved);
      } else {
        r = { left: 32, top: 32 };
        localStorage.setItem('pensarbahia_overlay_rect_' + slideIdx, JSON.stringify(r));
      }
      if (r.left) overlay.style.left = r.left + 'px';
      if (r.top) overlay.style.top = r.top + 'px';
      if (r.width) overlay.style.width = r.width + 'px';
      if (r.height) overlay.style.height = r.height + 'px';
    } catch(e) {}
  }

  // Restore saved position for initial slide
  restoreOverlayRect(currentSlide);

  // Dragging (exclude editable text and resize handle)
  var dragging = false, startX, startY, origX, origY;
  overlay.addEventListener('mousedown', function(e) {
    if (e.target.closest('.mto-nav')) return;
    if (e.target.closest('[contenteditable=true]')) return;
    if (e.offsetX > overlay.offsetWidth - 20 && e.offsetY > overlay.offsetHeight - 20) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = overlay.offsetLeft;
    origY = overlay.offsetTop;
    overlay.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    overlay.style.left = (origX + e.clientX - startX) + 'px';
    overlay.style.top = (origY + e.clientY - startY) + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    overlay.style.cursor = '';
    saveOverlayRect(currentSlide);
  });
  
  // Font size controls
  var overlayEl = document.querySelector('.map-text-overlay');
  var fontSizeKey = 'pensarbahia_font_size';
  var savedFs = parseFloat(localStorage.getItem(fontSizeKey)) || 16;
  var bodyEl = overlayEl ? overlayEl.querySelector('.mto-body') : null;
  var highlightEl = overlayEl ? overlayEl.querySelector('.mto-highlight') : null;
  function applyFontSize(size) {
    if (bodyEl) bodyEl.style.fontSize = size + 'px';
    if (highlightEl) highlightEl.style.fontSize = (size + 2) + 'px';
    localStorage.setItem(fontSizeKey, size);
  }
  applyFontSize(savedFs);
  var incBtn = document.getElementById('mto-font-inc');
  var decBtn = document.getElementById('mto-font-dec');
  if (incBtn) incBtn.addEventListener('click', function(e) { e.stopPropagation(); var cur = parseFloat(localStorage.getItem(fontSizeKey)) || 16; applyFontSize(Math.min(32, cur + 2)); focusEditable(); });
  if (decBtn) decBtn.addEventListener('click', function(e) { e.stopPropagation(); var cur = parseFloat(localStorage.getItem(fontSizeKey)) || 16; applyFontSize(Math.max(10, cur - 2)); focusEditable(); });

  // Helper to restore focus to the active editable area after toolbar click
  function focusEditable() {
    var el = overlay.querySelector('.mto-step.active [contenteditable=true]');
    if (el) el.focus();
  }

  // Format buttons (B, I, U, S, alignment, lists)
  document.querySelectorAll('.mto-fmt-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      focusEditable();
    });
  });

  // Text color picker
  var colorPicker = document.getElementById('mto-color-picker');
  var colorSwatch = document.getElementById('mto-color-swatch');
  if (colorPicker) {
    colorPicker.addEventListener('input', function(e) {
      e.stopPropagation();
      colorSwatch.style.background = colorPicker.value;
      document.execCommand('foreColor', false, colorPicker.value);
      focusEditable();
    });
  }

  // Background color picker
  var bgPicker = document.getElementById('mto-bg-picker');
  var bgSwatch = document.getElementById('mto-bg-swatch');
  if (bgPicker) {
    bgPicker.addEventListener('input', function(e) {
      e.stopPropagation();
      bgSwatch.style.background = bgPicker.value;
      document.execCommand('hiliteColor', false, bgPicker.value);
      focusEditable();
    });
  }

  // Font family selector
  var fontSelect = document.getElementById('mto-font-select');
  if (fontSelect) {
    fontSelect.addEventListener('change', function(e) {
      e.stopPropagation();
      var val = fontSelect.value;
      if (val) {
        document.execCommand('fontName', false, val);
        fontSelect.value = '';
        focusEditable();
      }
    });
  }

  // Save indicator
  var saveIndicator = document.getElementById('mto-save-indicator');
  function showSaved() {
    if (saveIndicator) {
      saveIndicator.classList.add('show');
      clearTimeout(saveIndicator._hide);
      saveIndicator._hide = setTimeout(function() { saveIndicator.classList.remove('show'); }, 2000);
    }
  }

  // Save content on input (debounced)
  var saveTimer = null;
  overlay.addEventListener('input', function(e) {
    if (e.target.closest('.mto-step')) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        saveStepContent(currentSlide, mtoStepIndex);
        showSaved();
      }, 500);
    }
  });

  // Restore current step content on init
  restoreStepContent(currentSlide, mtoStepIndex);
  var activeStep = document.querySelector('.mto-step.active');
  if (activeStep) makeStepEditable(activeStep);
}

/* ============================================================
   PAGE / SLIDE SYSTEM
   ============================================================ */
const PAGE_LAYER_MAP = {
  0: ['int_brasil', 'route_vli', 'route_fiol', 'route_transno', 'route_nortesul', 'route_fico', 'int_cidades', 'int_bahia'],
  1: [],
   2: ['mac_mancha', 'mac_cidades', 'mac_vias'],
  3: ['bts_ferrovias', 'bts_rodovias', 'bts_circulo_fixo']
};

function buildPageLayers() {
  [0, 1, 2, 3].forEach(function(pageIdx) {
    var container = document.querySelector('.page-layers[data-page="' + pageIdx + '"]');
    if (!container) return;
    var ids = PAGE_LAYER_MAP[pageIdx] || [];
    var html = '';
    var hasPoint = false;
    ids.forEach(function(id) {
      var lc = getLayerConfig(id);
      if (!lc) return;
      if (lc.type === 'mancha') return;
      if (lc.subtype === 'point') hasPoint = true;
      var isActive = activeLayers[id];
      // For subRoute layers, check subLayers active state
      if (lc.subRoute) {
        var mapping = ROUTE_SUB_ITEMS[id];
        if (mapping) {
          var sl = subLayers[mapping.parentId];
          isActive = false;
          if (sl) {
            Object.keys(sl.names).forEach(function(k) {
              if (sl.names[k] === mapping.name && sl.active[k]) isActive = true;
            });
          }
        }
      }
      html += '<button class="page-layer-btn' + (isActive ? ' active' : '') + '" data-page-layer="' + id + '">' +
        '<span class="page-dot" style="background:' + lc.color + '"></span> ' + lc.label +
        '</button>';
    });
    if (hasPoint) {
      var isHidden = document.body.classList.contains('labels-hidden');
      html += '<button class="page-layer-btn labels-page-toggle' + (!isHidden ? ' active' : '') + '" data-toggle-labels="1">' +
        '<span class="page-dot" style="background:#555"></span> Nomenclaturas</button>';
    }
    container.innerHTML = html;
    if (hasPoint) {
      // Ensure toggle state is reflected after rebuild
      var tb = container.querySelector('.labels-page-toggle');
      if (tb) tb.classList.toggle('active', !document.body.classList.contains('labels-hidden'));
    }
  });
}

function syncPageButtons(id) {
  document.querySelectorAll('.page-layer-btn[data-page-layer="' + id + '"]').forEach(function(btn) {
    btn.classList.toggle('active', !!activeLayers[id]);
  });
}

var currentSlide = 0;

function switchSlide(index) {
  if (index === currentSlide) return;

  // Save current MTO step content before switching
  saveStepContent(currentSlide, mtoStepIndex);

  document.querySelectorAll('.slide-tab').forEach(function(tab) {
    tab.classList.toggle('active', parseInt(tab.dataset.slide) === index);
  });
  document.querySelectorAll('.slide-page').forEach(function(page) {
    page.classList.toggle('active', parseInt(page.dataset.slide) === index);
  });

  var cover = document.querySelector('.cover-slide');
  if (cover) cover.classList.toggle('active', index === 0);

  // Bahia fullscreen image toggle
  var bahiaFS = document.getElementById('bahia-fullscreen');
  if (bahiaFS) bahiaFS.classList.toggle('active', index === 2);

  // MTO overlay toggle
  var mto = document.getElementById('map-text-overlay');
  if (mto) mto.classList.toggle('active', index >= 1 && index <= 4);

  // Desativar camadas da página anterior
  var slideToPage = {0: 0, 1: 0, 2: 1, 3: 2, 4: 3};
  var prevPageKey = slideToPage[currentSlide];
  var prevIds = PAGE_LAYER_MAP[prevPageKey] || [];
  prevIds.forEach(function(id) {
    if (activeLayers[id]) toggleLayer(id);
  });
  // Desativar sub-items de camadas submenu (não rastreados em activeLayers)
  Object.keys(ROUTE_SUB_ITEMS).forEach(function(routeId) {
    var mapping = ROUTE_SUB_ITEMS[routeId];
    var sl = subLayers[mapping.parentId];
    if (!sl) return;
    Object.keys(sl.names).forEach(function(k) {
      if (sl.active[k]) toggleSubItem(mapping.parentId, k);
    });
  });
  updateLegend();

  // Ativar Brasil e Bahia ao entrar no slide 1
  if (index === 1) {
    if (!activeLayers['int_brasil']) toggleLayer('int_brasil');
    if (!activeLayers['int_bahia']) toggleLayer('int_bahia');
  }

  // Ativar mancha verde ao entrar no slide 3 (Macrorregião)
  if (index === 3 && !activeLayers['mac_mancha']) toggleLayer('mac_mancha');
  // Botão editar mancha visível apenas no slide 3
  var editBtn = document.getElementById('edit-mancha-btn');
  if (editBtn) editBtn.style.display = (index === 3) ? '' : 'none';

  // Save/restore floating text boxes per slide
  saveFloatBoxes(currentSlide);
  document.querySelectorAll('.float-textbox').forEach(function(b) { b.remove(); });
  if (index >= 1 && index <= 4) restoreFloatBoxes(index);
  // Save/restore video overlays per slide
  saveVideoOverlays(currentSlide);
  document.querySelectorAll('.video-overlay').forEach(function(v) { v.remove(); });
  if (index >= 1 && index <= 4) restoreVideoOverlays(index);

  // Save current overlay rect before switching, restore new slide's rect
  if (mto) {
    try {
      if (mto.classList.contains('active')) {
        var curRect = { left: mto.offsetLeft, top: mto.offsetTop, width: mto.offsetWidth, height: mto.offsetHeight };
        localStorage.setItem('pensarbahia_overlay_rect_' + currentSlide, JSON.stringify(curRect));
      }
    } catch(e) {}
    // Restore new slide's rect
    try {
      var saved = localStorage.getItem('pensarbahia_overlay_rect_' + index);
      var r;
      if (saved) {
        r = JSON.parse(saved);
      } else {
        r = { left: 32, top: 32 };
        localStorage.setItem('pensarbahia_overlay_rect_' + index, JSON.stringify(r));
      }
      if (r.left) mto.style.left = r.left + 'px';
      if (r.top) mto.style.top = r.top + 'px';
      if (r.width) mto.style.width = r.width + 'px';
      if (r.height) mto.style.height = r.height + 'px';
    } catch(e) {}
  }

  currentSlide = index;

  // Show first MTO step for this slide
  setTimeout(function() {
    showMtoStep(index, 0);
  }, 50);

  if (!mapInstance) return;
  if (index >= 1) {
    toggleGallery(false);
    if (index === 1) {
      var savedView = null;
      try { var v = localStorage.getItem('pensarbahia_slide1_view'); if (v) savedView = JSON.parse(v); } catch(e) {}
      if (savedView) {
        mapInstance.setView(savedView.center, savedView.zoom, { duration: 2 });
      } else {
        mapInstance.flyTo([-15.0, -60.0], 4, { duration: 2 });
      }
    } else if (index === 2) {
      mapInstance.flyTo([-12.75689, -39.36401], 8, { duration: 2 });
    } else if (index === 3) {
      mapInstance.flyTo([-12.75689, -39.36401], 9, { duration: 2 });
    } else if (index === 4) {
      mapInstance.flyTo([-12.76878, -38.46107], 12, { duration: 2 });
    }
    setTimeout(function() { mapInstance.invalidateSize(); }, 200);
  }
}

function toggleAllLayers(pageIndex) {
  var ids = PAGE_LAYER_MAP[pageIndex];
  if (!ids || !ids.length) return;
  function isActive(id) {
    var lc = getLayerConfig(id);
    if (lc && lc.subRoute) {
      var mapping = ROUTE_SUB_ITEMS[id];
      if (mapping) {
        var sl = subLayers[mapping.parentId];
        if (!sl) return false;
        var found = false;
        Object.keys(sl.names).forEach(function(k) { if (sl.names[k] === mapping.name && sl.active[k]) found = true; });
        return found;
      }
    }
    return !!activeLayers[id];
  }
  var anyOff = false;
  ids.forEach(function(id) { if (!isActive(id)) anyOff = true; });
  ids.forEach(function(id) {
    var on = anyOff;
    if (isActive(id) !== on) toggleLayer(id);
  });
  // Handle Bahia page (no toggle-all button)
  if (pageIndex === 1) return;
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
  var btn = document.getElementById('gallery-open-btn');
  if (btn) btn.textContent = isOpen ? 'Fechar Galeria de Imagens' : 'Abrir Galeria de Imagens';
}

document.addEventListener('DOMContentLoaded', function() {
  initMap();
  buildPageLayers();
  buildGallery();
  initBahiaDrag();
  initMtoNav();

  // MTO starts visible on slides 1-4
  var mto = document.getElementById('map-text-overlay');
  if (mto && currentSlide >= 1 && currentSlide <= 4) mto.classList.add('active');
  // Initial float box restore (for slide 1 which is first navigable)
  restoreFloatBoxes(1);
  // Initial video overlay restore
  restoreVideoOverlays(1);

  document.querySelector('.slide-tabs').addEventListener('click', function(e) {
    var tab = e.target.closest('.slide-tab');
    if (tab) switchSlide(parseInt(tab.dataset.slide));
  });

  document.getElementById('cover-start').addEventListener('click', function() {
    switchSlide(1);
  });

  document.getElementById('cover-return').addEventListener('click', function() {
    switchSlide(0);
  });

  document.querySelector('.slide-body').addEventListener('click', function(e) {
    var labelsBtn = e.target.closest('.labels-page-toggle');
    if (labelsBtn) {
      document.body.classList.toggle('labels-hidden');
      document.querySelectorAll('.labels-page-toggle, .labels-toggle').forEach(function(b) { b.classList.toggle('active'); });
      return;
    }
    var btn = e.target.closest('.page-layer-btn');
    if (btn && btn.dataset.pageLayer) {
      if (btn.dataset.pageLayer === 'int_bahia' && currentSlide === 1) {
        switchSlide(2);
      } else {
        toggleLayer(btn.dataset.pageLayer);
      }
    }
    var toggleAll = e.target.closest('.toggle-all-btn');
    if (toggleAll) toggleAllLayers(parseInt(toggleAll.dataset.page));
    var nextBtn = e.target.closest('.slide-next-btn');
    if (nextBtn && nextBtn.dataset.next) switchSlide(parseInt(nextBtn.dataset.next));
  });

  document.getElementById('gallery-grid').addEventListener('click', function(e) {
    var item = e.target.closest('.gallery-item');
    if (item) showImageViewer(item.dataset.imgKey);
  });

  document.getElementById('gallery-open-btn').addEventListener('click', function() { toggleGallery(); });

  document.getElementById('gallery-close').addEventListener('click', function() { toggleGallery(false); });

  document.getElementById('sidebar-toggle').addEventListener('click', function() { toggleSidebar(); });
  document.getElementById('sidebar-close').addEventListener('click', function() { toggleSidebar(false); });
  document.getElementById('sidebar-overlay').addEventListener('click', function() { toggleSidebar(false); });
  document.getElementById('iv-close').addEventListener('click', function() {
    document.getElementById('image-viewer').style.display = 'none';
  });
  setupImageViewerDrag();

  document.getElementById('toggle-text-btn').addEventListener('click', function() {
    var mto = document.getElementById('map-text-overlay');
    if (mto) mto.classList.toggle('mto-hidden');
  });

  document.getElementById('add-textbox-btn').addEventListener('click', function() {
    if (currentSlide >= 1 && currentSlide <= 4) {
      createFloatBox(currentSlide, {});
    }
  });

  document.getElementById('add-video-btn').addEventListener('click', function() {
    if (currentSlide >= 1 && currentSlide <= 4) {
      createVideoOverlay(currentSlide, {});
    }
  });

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

  // Ctrl+Shift+S: save slide 1 view
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      if (mapInstance && currentSlide === 1) {
        var c = mapInstance.getCenter();
        var z = mapInstance.getZoom();
        try {
          localStorage.setItem('pensarbahia_slide1_view', JSON.stringify({ center: [c.lat, c.lng], zoom: z }));
          alert('Zoom e centro do slide 1 salvos!');
        } catch(err) {}
      } else {
        alert('Va para o slide 1 e ajuste o zoom primeiro.');
      }
    }
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
    .then(function(gj) {
      bahiaOutlineLayer = L.geoJSON(gj, { style: { color: '#23251d', weight: 1.5, fillColor: '#fcfcfa', fillOpacity: 0.3 } });
      updateBahiaOutline();
    })
    .catch(function() {
      if (typeof BAHIA_OUTLINE !== 'undefined') {
        bahiaOutlineLayer = L.polygon(BAHIA_OUTLINE, { color: '#23251d', weight: 1.5, fillColor: '#fcfcfa', fillOpacity: 0.3 });
        updateBahiaOutline();
      }
    });
}

function updateBahiaOutline() {
  if (!bahiaOutlineLayer) return;
  var bahiaActive = Object.keys(activeLayers).some(function(id) {
    return activeLayers[id] && id.indexOf('_bahia') !== -1;
  });
  if (bahiaActive) {
    if (!mapInstance.hasLayer(bahiaOutlineLayer)) mapInstance.addLayer(bahiaOutlineLayer);
  } else {
    if (mapInstance.hasLayer(bahiaOutlineLayer)) mapInstance.removeLayer(bahiaOutlineLayer);
  }
}

/* Mancha edit mode */
var manchaEdit = { handles: [], editing: false };
function toggleManchaEdit() {
  var btn = document.getElementById('edit-mancha-btn');
  if (manchaEdit.editing) {
    manchaEdit.handles.forEach(function(h) { if (mapInstance.hasLayer(h)) mapInstance.removeLayer(h); });
    manchaEdit.handles = [];
    manchaEdit.editing = false;
    btn.textContent = '\u270E Editar mancha';
    var lg = mapLayers['mac_mancha'];
    if (lg) {
      var poly = lg.getLayers()[0];
      if (poly) {
        var pts = poly.getLatLngs()[0] || poly.getLatLngs();
        var out = pts.map(function(p) { return [p.lat, p.lng]; });
        try { localStorage.setItem('pensarbahia_mancha_ctrl', JSON.stringify(out)); } catch(e) {}
      }
    }
  } else {
    var lg = mapLayers['mac_mancha'];
    if (!lg) { alert('Mancha não encontrada'); return; }
    var poly = lg.getLayers()[0];
    if (!poly) { alert('Polígono não encontrado'); return; }
    var pts = poly.getLatLngs()[0] || poly.getLatLngs();
    if (!pts || pts.length < 3) return;
    var srcCopy = pts.map(function(p) { return [p.lat, p.lng]; });
    pts.forEach(function(pt, i) {
      var h = L.marker(pt, { draggable: true });
      h._mi = i;
      h.on('drag', function(e) {
        var m = e.target;
        srcCopy[m._mi] = [m.getLatLng().lat, m.getLatLng().lng];
        poly.setLatLngs([srcCopy]);
      });
      manchaEdit.handles.push(h);
      mapInstance.addLayer(h);
    });
    manchaEdit.editing = true;
    btn.textContent = '\u2714 Salvar mancha';
  }
}

/* Route label store */
var routeLabelStore = { labels: [], saved: {}, selected: null, dirty: false };
try { var ls = localStorage.getItem('pensarbahia_label_positions'); if (ls) routeLabelStore.saved = JSON.parse(ls); } catch(e) {}

function deselectRouteLabel() {
  if (routeLabelStore.selected) {
    if (routeLabelStore.selected._deselect) routeLabelStore.selected._deselect();
    routeLabelStore.selected = null;
  }
}

function saveRouteLabels() {
  var data = {};
  routeLabelStore.labels.forEach(function(m) {
    var ll = m.getLatLng();
    data[m._rid] = { lat: ll.lat, lng: ll.lng, rotation: m._rot || 0 };
  });
  try { localStorage.setItem('pensarbahia_label_positions', JSON.stringify(data)); } catch(e) {}
  routeLabelStore.saved = data;
  routeLabelStore.dirty = false;
}

/* Rotate selected label with arrow keys */
document.addEventListener('keydown', function(e) {
  if (!routeLabelStore.selected) return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  var step = e.shiftKey ? 5 : 15;
  if (e.key === 'ArrowLeft') { routeLabelStore.selected._setRot(routeLabelStore.selected._rot - step); routeLabelStore.dirty = true; e.preventDefault(); }
  if (e.key === 'ArrowRight') { routeLabelStore.selected._setRot(routeLabelStore.selected._rot + step); routeLabelStore.dirty = true; e.preventDefault(); }
});

/* Save route labels: Ctrl+Shift+L */
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'L') {
    e.preventDefault();
    saveRouteLabels();
    alert('Posi\u00e7\u00f5es dos labels salvas!');
  }
  if (e.key === 'Escape') deselectRouteLabel();
});

/* Wrapped initMap to add map click handler */
var _initMapOrig = initMap;
initMap = function() {
  _initMapOrig();
  if (mapInstance) mapInstance.on('click', deselectRouteLabel);
};

/* ============================================================
   FLOATING TEXT BOX SYSTEM (multiple per slide)
   ============================================================ */
var floatBoxes = {};

function saveFloatBoxes(slideIdx) {
  try { localStorage.setItem('pensarbahia_float_boxes_' + slideIdx, JSON.stringify(floatBoxes[slideIdx] || [])); } catch(e) {}
}

function focusFloatBody(box) {
  var body = box.querySelector('.float-body');
  if (body) body.focus();
}

function createFloatBox(slideIdx, data) {
  var wrapper = document.querySelector('.map-container-wrapper');
  if (!wrapper) return null;
  var id = data && data.id ? data.id : 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  var box = document.createElement('div');
  box.className = 'float-textbox';
  box.dataset.fbid = id;
  box.style.left = (data && data.left != null ? data.left : 120) + 'px';
  box.style.top = (data && data.top != null ? data.top : 120) + 'px';
  if (data && data.width) box.style.width = data.width + 'px';
  if (data && data.height) box.style.height = data.height + 'px';

  // --- Toolbar ---
  var tbar = document.createElement('div');
  tbar.className = 'float-tbar';
  tbar.innerHTML =
    '<span class="float-tbar-close" title="Remover">&times;</span>' +
    '<button class="fb-fmt" data-cmd="bold" title="Negrito"><b>B</b></button>' +
    '<button class="fb-fmt" data-cmd="italic" title="It&aacute;lico"><i>I</i></button>' +
    '<button class="fb-fmt" data-cmd="underline" title="Sublinhado"><u>U</u></button>' +
    '<button class="fb-fmt" data-cmd="strikeThrough" title="Riscado"><s>S</s></button>' +
    '<span class="fb-sep"></span>' +
    '<label class="fb-color-label" title="Cor do texto"><span class="fb-csw" style="background:#000"></span><input type="color" class="fb-cpick" value="#000000"></label>' +
    '<label class="fb-color-label" title="Cor de fundo"><span class="fb-csw" style="background:#ffff00"></span><input type="color" class="fb-bgpick" value="#ffff00"></label>' +
    '<span class="fb-sep"></span>' +
    '<button class="fb-fmt" data-cmd="justifyLeft" title="Esquerda">&#x2261;&#x2190;</button>' +
    '<button class="fb-fmt" data-cmd="justifyCenter" title="Centro">&#x2261;</button>' +
    '<button class="fb-fmt" data-cmd="justifyRight" title="Direita">&#x2192;&#x2261;</button>' +
    '<span class="fb-sep"></span>' +
    '<button class="fb-fmt" data-cmd="insertUnorderedList" title="Lista">&bull;</button>' +
    '<button class="fb-fmt" data-cmd="insertOrderedList" title="Lista num.">1.</button>' +
    '<span class="fb-sep"></span>' +
    '<button class="fb-font-btn" data-fb-size="dec" title="Diminuir">A-</button>' +
    '<button class="fb-font-btn" data-fb-size="inc" title="Aumentar">A+</button>' +
    '<span class="fb-sep"></span>' +
    '<select class="fb-font-sel" title="Fonte">' +
      '<option value="">Fonte</option>' +
      '<option value="Arial,sans-serif">Arial</option>' +
      '<option value="\'IBM Plex Sans\',sans-serif">IBM Plex</option>' +
      '<option value="\'Times New Roman\',serif">Times</option>' +
      '<option value="Courier New,monospace">Courier</option>' +
      '<option value="Georgia,serif">Georgia</option>' +
      '<option value="Verdana,sans-serif">Verdana</option>' +
    '</select>';
  box.appendChild(tbar);

  // --- Body ---
  var body = document.createElement('div');
  body.className = 'float-body';
  body.contentEditable = 'true';
  body.innerHTML = data && data.html ? data.html : 'Digite seu texto aqui...';
  if (data && data.fontSize) body.style.fontSize = data.fontSize + 'px';
  box.appendChild(body);

  wrapper.appendChild(box);

  // --- Events ---
  var fs = parseFloat(data && data.fontSize) || 16;

  // Close
  tbar.querySelector('.float-tbar-close').addEventListener('click', function(e) {
    e.stopPropagation();
    removeFloatBox(slideIdx, id);
  });

  // Format buttons
  tbar.querySelectorAll('.fb-fmt').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      document.execCommand(btn.dataset.cmd, false, null);
      focusFloatBody(box);
    });
  });

  // Color pickers
  var cpick = tbar.querySelector('.fb-cpick');
  var bgpick = tbar.querySelector('.fb-bgpick');
  if (cpick) cpick.addEventListener('input', function(e) {
    e.stopPropagation();
    cpick.parentNode.querySelector('.fb-csw').style.background = cpick.value;
    document.execCommand('foreColor', false, cpick.value);
    focusFloatBody(box);
  });
  if (bgpick) bgpick.addEventListener('input', function(e) {
    e.stopPropagation();
    bgpick.parentNode.querySelector('.fb-csw').style.background = bgpick.value;
    document.execCommand('hiliteColor', false, bgpick.value);
    focusFloatBody(box);
  });

  // Font size
  tbar.querySelectorAll('[data-fb-size]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      fs = Math.max(10, Math.min(48, fs + (btn.dataset.fbSize === 'inc' ? 2 : -2)));
      body.style.fontSize = fs + 'px';
      focusFloatBody(box);
    });
  });

  // Font family
  var fsel = tbar.querySelector('.fb-font-sel');
  if (fsel) fsel.addEventListener('change', function(e) {
    e.stopPropagation();
    if (fsel.value) { document.execCommand('fontName', false, fsel.value); fsel.value = ''; }
    focusFloatBody(box);
  });

  // Drag via toolbar
  var dragging = false, startX, startY, origX, origY;
  tbar.addEventListener('mousedown', function(e) {
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('label') || e.target.closest('.float-tbar-close')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = box.offsetLeft;
    origY = box.offsetTop;
    box.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    box.style.left = (origX + e.clientX - startX) + 'px';
    box.style.top = (origY + e.clientY - startY) + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    box.style.cursor = '';
    saveFloatBoxMeta(slideIdx, id);
  });

  // Auto-save content on input
  body.addEventListener('input', function() {
    if (!floatBoxes[slideIdx]) floatBoxes[slideIdx] = [];
    var entry = floatBoxes[slideIdx].find(function(b) { return b.id === id; });
    if (entry) { entry.html = body.innerHTML; entry.fontSize = fs; }
    saveFloatBoxes(slideIdx);
  });

  // Save meta on resize
  box.addEventListener('mouseup', function() { saveFloatBoxMeta(slideIdx, id); });

  // Focus body on click inside (except toolbar)
  box.addEventListener('mousedown', function(e) {
    if (!e.target.closest('.float-tbar') && !e.target.closest('.float-textbox-close')) {
      focusFloatBody(box);
    }
  });

  // Track
  if (!floatBoxes[slideIdx]) floatBoxes[slideIdx] = [];
  var existing = floatBoxes[slideIdx].find(function(b) { return b.id === id; });
  if (!existing) {
    floatBoxes[slideIdx].push({ id: id, left: box.offsetLeft, top: box.offsetTop, width: box.offsetWidth, height: box.offsetHeight, html: body.innerHTML, fontSize: fs });
  }
  saveFloatBoxes(slideIdx);
  return box;
}

function saveFloatBoxMeta(slideIdx, id) {
  var box = document.querySelector('.float-textbox[data-fbid="' + id + '"]');
  if (!box) return;
  if (!floatBoxes[slideIdx]) floatBoxes[slideIdx] = [];
  var entry = floatBoxes[slideIdx].find(function(b) { return b.id === id; });
  if (entry) {
    entry.left = box.offsetLeft;
    entry.top = box.offsetTop;
    entry.width = box.offsetWidth;
    entry.height = box.offsetHeight;
  }
  saveFloatBoxes(slideIdx);
}

function removeFloatBox(slideIdx, id) {
  var box = document.querySelector('.float-textbox[data-fbid="' + id + '"]');
  if (box) box.remove();
  if (floatBoxes[slideIdx]) {
    floatBoxes[slideIdx] = floatBoxes[slideIdx].filter(function(b) { return b.id !== id; });
    saveFloatBoxes(slideIdx);
  }
}

function restoreFloatBoxes(slideIdx) {
  // Remove any existing float boxes for this slide
  document.querySelectorAll('.float-textbox').forEach(function(b) { b.remove(); });
  try {
    var saved = localStorage.getItem('pensarbahia_float_boxes_' + slideIdx);
    if (saved) {
      floatBoxes[slideIdx] = JSON.parse(saved);
      floatBoxes[slideIdx].forEach(function(data) {
        createFloatBox(slideIdx, data);
      });
    } else {
      floatBoxes[slideIdx] = [];
    }
  } catch(e) { floatBoxes[slideIdx] = []; }
}

function clearFloatBoxesForSlide(slideIdx) {
  document.querySelectorAll('.float-textbox').forEach(function(b) { b.remove(); });
  floatBoxes[slideIdx] = [];
  saveFloatBoxes(slideIdx);
}

/* ============================================================
   VIDEO OVERLAY SYSTEM (multiple per slide)
   ============================================================ */
var VIDEO_FILES = ['1.mp4','2.mp4','3.mp4','4.mp4','5.mp4','6.mp4','7.mp4','8.mp4','9.mp4','10.mp4','11.mp4'];
var videoOverlays = {};

function saveVideoOverlays(slideIdx) {
  try { localStorage.setItem('pensarbahia_videos_' + slideIdx, JSON.stringify(videoOverlays[slideIdx] || [])); } catch(e) {}
}

function createVideoOverlay(slideIdx, data) {
  var wrapper = document.querySelector('.map-container-wrapper');
  if (!wrapper) return null;
  var id = data && data.id ? data.id : 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  var file = data && data.file ? data.file : VIDEO_FILES[0];

  var box = document.createElement('div');
  box.className = 'video-overlay';
  box.dataset.vid = id;
  box.style.left = (data && data.left != null ? data.left : 0) + 'px';
  box.style.top = (data && data.top != null ? data.top : 0) + 'px';
  if (data && data.width) box.style.width = data.width + 'px';
  else { box.style.width = '100%'; box.style.height = '100%'; }
  if (data && data.height) box.style.height = data.height + 'px';

  // Toolbar
  var tbar = document.createElement('div');
  tbar.className = 'video-tbar';
  var sel = document.createElement('select');
  sel.className = 'video-tbar-label';
  VIDEO_FILES.forEach(function(f) {
    var opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f.replace('.mp4','');
    if (f === file) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', function() {
    var video = box.querySelector('video');
    if (video) {
      video.src = 'videos/' + sel.value;
      video.play().catch(function(){});
    }
    scheduleVideoSave();
  });
  var dragHint = document.createElement('span');
  dragHint.textContent = '\u2261';
  dragHint.title = 'Arraste para mover';
  dragHint.style.cssText = 'color:rgba(255,255,255,0.6);cursor:grab;padding:0 4px;font-size:14px;';
  var sizeDec = document.createElement('button');
  sizeDec.textContent = '\u2212';
  sizeDec.title = 'Diminuir';
  sizeDec.style.cssText = 'font-family:IBM Plex Sans,sans-serif;font-size:14px;font-weight:700;padding:0 6px;border:1px solid rgba(255,255,255,0.3);border-radius:3px;background:transparent;color:rgba(255,255,255,0.8);cursor:pointer;line-height:1.5;';
  sizeDec.addEventListener('click', function(e) {
    e.stopPropagation();
    var w = box.offsetWidth;
    var h = box.offsetHeight;
    box.style.width = Math.round(w * 0.85) + 'px';
    box.style.height = Math.round(h * 0.85) + 'px';
    scheduleVideoSave();
  });
  var sizeInc = document.createElement('button');
  sizeInc.textContent = '+';
  sizeInc.title = 'Aumentar';
  sizeInc.style.cssText = 'font-family:IBM Plex Sans,sans-serif;font-size:14px;font-weight:700;padding:0 6px;border:1px solid rgba(255,255,255,0.3);border-radius:3px;background:transparent;color:rgba(255,255,255,0.8);cursor:pointer;line-height:1.5;';
  sizeInc.addEventListener('click', function(e) {
    e.stopPropagation();
    var w = box.offsetWidth;
    var h = box.offsetHeight;
    box.style.width = Math.round(w * 1.18) + 'px';
    box.style.height = Math.round(h * 1.18) + 'px';
    scheduleVideoSave();
  });
  var closeBtn = document.createElement('span');
  closeBtn.className = 'video-tbar-close';
  closeBtn.textContent = '\u00D7';
  closeBtn.title = 'Remover';
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    removeVideoOverlay(slideIdx, id);
  });
  tbar.appendChild(closeBtn);
  tbar.appendChild(dragHint);
  tbar.appendChild(sel);
  tbar.appendChild(sizeDec);
  tbar.appendChild(sizeInc);
  box.appendChild(tbar);

  // Video
  var video = document.createElement('video');
  video.src = 'videos/' + file;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  box.appendChild(video);

  wrapper.appendChild(box);

  // Drag
  var dragging = false, startX, startY, origX, origY;
  tbar.addEventListener('mousedown', function(e) {
    if (e.target.closest('.video-tbar-close') || e.target.closest('.video-tbar-label')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = box.offsetLeft;
    origY = box.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    box.style.left = (origX + e.clientX - startX) + 'px';
    box.style.top = (origY + e.clientY - startY) + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    scheduleVideoSave();
  });

  // Resize save
  var ro = new ResizeObserver(function() { scheduleVideoSave(); });
  ro.observe(box);

  // Play after load
  video.addEventListener('canplay', function() {
    video.play().catch(function(){});
  });

  // Save to state
  if (!videoOverlays[slideIdx]) videoOverlays[slideIdx] = [];
  videoOverlays[slideIdx].push({ id: id, file: file, left: box.offsetLeft, top: box.offsetTop, width: box.offsetWidth, height: box.offsetHeight });
  saveVideoOverlays(slideIdx);

  return box;
}

var _videoSaveTimer = null;
function scheduleVideoSave() {
  if (_videoSaveTimer) clearTimeout(_videoSaveTimer);
  _videoSaveTimer = setTimeout(function() {
    var slideIdx = currentSlide;
    if (!videoOverlays[slideIdx]) videoOverlays[slideIdx] = [];
    document.querySelectorAll('.video-overlay').forEach(function(box) {
      var id = box.dataset.vid;
      var entry = null;
      for (var i = 0; i < videoOverlays[slideIdx].length; i++) {
        if (videoOverlays[slideIdx][i].id === id) { entry = videoOverlays[slideIdx][i]; break; }
      }
      if (!entry) {
        entry = { id: id };
        videoOverlays[slideIdx].push(entry);
      }
      entry.file = (box.querySelector('video') ? box.querySelector('video').src.split('/').pop() : VIDEO_FILES[0]);
      entry.left = box.offsetLeft;
      entry.top = box.offsetTop;
      entry.width = box.offsetWidth;
      entry.height = box.offsetHeight;
    });
    saveVideoOverlays(slideIdx);
    _videoSaveTimer = null;
  }, 300);
}

function removeVideoOverlay(slideIdx, id) {
  var box = document.querySelector('.video-overlay[data-vid="' + id + '"]');
  var video = box ? box.querySelector('video') : null;
  if (video) { video.pause(); video.src = ''; }
  if (box) box.remove();
  if (videoOverlays[slideIdx]) {
    videoOverlays[slideIdx] = videoOverlays[slideIdx].filter(function(b) { return b.id !== id; });
    saveVideoOverlays(slideIdx);
  }
}

function restoreVideoOverlays(slideIdx) {
  document.querySelectorAll('.video-overlay').forEach(function(b) {
    var v = b.querySelector('video');
    if (v) { v.pause(); v.src = ''; }
    b.remove();
  });
  try {
    var saved = localStorage.getItem('pensarbahia_videos_' + slideIdx);
    if (saved) {
      videoOverlays[slideIdx] = JSON.parse(saved);
      videoOverlays[slideIdx].forEach(function(data) {
        createVideoOverlay(slideIdx, data);
      });
    } else {
      videoOverlays[slideIdx] = [];
    }
  } catch(e) { videoOverlays[slideIdx] = []; }
}
