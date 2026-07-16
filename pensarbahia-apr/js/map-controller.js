let mapInitialized = false;
let mapInstance = null;
let mapLayers = {};
let activeLayers = {};
let fetchCache = {};
var subLayers = {};
var lastToggled = null;
var bahiaOutlineLayer = null;
var CACHE_BUSTER = '3';

function videoUrl(file) { return 'videos/' + file + '?v=' + CACHE_BUSTER; }
function videoFileFromSrc(src) { return src.split('/').pop().split('?')[0]; }

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
    div.innerHTML = '<div style="background:rgba(255,255,255,0.95);padding:10px 14px;border-radius:8px;font-size:14px;font-family:\'IBM Plex Sans\',sans-serif;line-height:1.8;border:2px solid #1a3a5c;box-shadow:0 4px 12px rgba(0,0,0,0.25)">' +
      '<div style="font-weight:700;margin-bottom:6px;color:#1a3a5c;font-size:15px;text-transform:uppercase;letter-spacing:0.5px">Legenda</div><div class="legend-entries"></div></div>';
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
            html += '<div><span style="display:inline-block;width:22px;height:4px;background:' + l.color + ';margin-right:8px;vertical-align:middle"></span><strong>' + l.legendLabel + '</strong></div>';
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
                html += '<div><span style="display:inline-block;width:22px;height:4px;background:' + color + ';margin-right:8px;vertical-align:middle"></span><strong>' + name + '</strong></div>';
  }
});
          }
        } else {
          html += '<div><span style="display:inline-block;' +
            (l.subtype === 'point' || l.type === 'polos'
              ? 'width:14px;height:14px;border-radius:50%;background:' + l.color + ';margin-right:8px;vertical-align:middle'
              : l.geometry === 'line' || l.subtype === 'line'
                ? 'width:22px;height:4px;background:' + l.color + ';margin-right:8px;vertical-align:middle'
                : 'width:16px;height:14px;background:' + l.color + ';margin-right:8px;vertical-align:middle;opacity:0.25;border:1px solid ' + l.color) +
            '"></span><strong>' + l.label + '</strong></div>';
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
      html += '<div><span style="display:inline-block;width:22px;height:4px;background:' + (lc ? lc.color : '#999') + ';margin-right:8px;vertical-align:middle"></span><strong>' + (lc ? lc.label : mapping.name) + '</strong></div>';
    }
  });

  // Bahia legend custom entries (shown when bahia image is active)
  var bahiaFS = document.getElementById('bahia-fullscreen');
  if (bahiaFS && bahiaFS.classList.contains('active')) {
    html += '<div style="margin-top:8px;padding-top:8px;border-top:2px solid #1a3a5c;font-weight:700;font-size:13px;color:#1a3a5c;letter-spacing:0.3px">RODOVIAS BAHIA</div>';
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
  var cacheUrl = url + '?v=' + CACHE_BUSTER;
  if (!fetchCache[cacheUrl])
    fetchCache[cacheUrl] = fetch(cacheUrl).then(function(r) { if (!r.ok) throw new Error(); return r.json(); });
  return fetchCache[cacheUrl];
}

function loadLayer(lc) {
  switch (lc.type) {
    case 'geojson': loadGeoJSON(lc); break;
    case 'esri': loadESRI(lc); break;
    case 'bts': loadBTS(lc); break;
    case 'polos': loadPolos(lc); break;
    case 'circle-editor':
      (function(lc) {
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem('pensarbahia_circle_' + lc.id)); } catch(e) {}
        var center = saved && saved.center ? L.latLng(saved.center[0], saved.center[1]) : L.latLng(lc.center[0], lc.center[1]);
        var radius = (saved && saved.radius != null) ? saved.radius : lc.radius;
        var color = lc.color || '#f39c12';

        var circle = L.circle(center, { radius: radius, color: color, weight: lc.weight || 2, fillColor: color, fillOpacity: 0.08 });

        function getRightEdge(c, r) {
          var R = 6371000;
          var lat = c.lat * Math.PI / 180;
          var d = r / R;
          return L.latLng(c.lat, c.lng + d / Math.cos(lat) * 180 / Math.PI);
        }

        var resizer = L.marker(getRightEdge(center, radius), {
          icon: L.divIcon({
            className: 'circle-resize-handle',
            html: '<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid ' + color + ';cursor:nesw-resize;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          }),
          draggable: true
        });

        var group = L.layerGroup([circle, resizer]);
        mapLayers[lc.id] = group;
        group._isCircleLayer = true;

        function saveCircle() {
          var c = circle.getLatLng();
          var r = circle.getRadius();
          try {
            localStorage.setItem('pensarbahia_circle_' + lc.id, JSON.stringify({ center: [c.lat, c.lng], radius: r }));
          } catch(e) {}
        }

        function updateResizer() {
          var c = circle.getLatLng();
          var r = circle.getRadius();
          resizer.setLatLng(getRightEdge(c, r));
        }

        // Drag the circle itself
        var dragging = false, dragStart = null, origCenter = null;
        circle.on('mousedown', function(e) {
          if (e.originalEvent.button !== 0) return;
          dragging = true;
          dragStart = e.latlng;
          origCenter = circle.getLatLng();
          if (mapInstance.dragging) mapInstance.dragging.disable();
          L.DomEvent.stopPropagation(e.originalEvent);
        });

        mapInstance.on('mousemove', function(e) {
          if (!dragging) return;
          var lat = origCenter.lat + (e.latlng.lat - dragStart.lat);
          var lng = origCenter.lng + (e.latlng.lng - dragStart.lng);
          circle.setLatLng([lat, lng]);
          updateResizer();
        });

        mapInstance.on('mouseup', function() {
          if (dragging) {
            dragging = false;
            if (mapInstance.dragging) mapInstance.dragging.enable();
            saveCircle();
          }
        });

        // Resize via draggable marker
        resizer.on('drag', function() {
          var c = circle.getLatLng();
          var p = resizer.getLatLng();
          var R = 6371000;
          var lat1 = c.lat * Math.PI / 180;
          var lng1 = c.lng * Math.PI / 180;
          var lat2 = p.lat * Math.PI / 180;
          var lng2 = p.lng * Math.PI / 180;
          var dlat = lat2 - lat1;
          var dlng = lng2 - lng1;
          var a = Math.sin(dlat/2) * Math.sin(dlat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng/2) * Math.sin(dlng/2);
          var dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          circle.setRadius(Math.max(dist, 100));
        });

        resizer.on('dragend', function() {
          saveCircle();
          updateResizer();
        });

        if (activeLayers[lc.id]) mapInstance.addLayer(group);
      })(lc);
      break;
    case 'circle-group':
      (function(lc) {
        var group = L.layerGroup();
        lc.circles.forEach(function(cfg) {
          (function(cfg) {
            var saved = null;
            try { saved = JSON.parse(localStorage.getItem('pensarbahia_circle_' + cfg.id)); } catch(e) {}
            var center = saved && saved.center ? L.latLng(saved.center[0], saved.center[1]) : L.latLng(cfg.center[0], cfg.center[1]);
            var radius = (saved && saved.radius != null) ? saved.radius : cfg.radius;
            var color = cfg.color || '#3498db';

            var circle = L.circle(center, { radius: radius, color: color, weight: lc.weight || 2, fillColor: color, fillOpacity: 0.08 });
            var labelType = cfg.color === '#3498db' ? 'blue' : 'pink';
            circle.bindTooltip(cfg.color === '#3498db' ? 'Centro de atração' : 'Polos e terminais', { permanent: false, direction: 'top', className: 'circle-label circle-label-' + labelType, offset: [0, -8] });

            function saveCircle() {
              var c = circle.getLatLng();
              var r = circle.getRadius();
              try {
                localStorage.setItem('pensarbahia_circle_' + cfg.id, JSON.stringify({ center: [c.lat, c.lng], radius: r }));
              } catch(e) {}
            }

            var dragging = false, dragStart = null, origCenter = null;
            circle.on('mousedown', function(e) {
              if (e.originalEvent.button !== 0) return;
              dragging = true;
              dragStart = e.latlng;
              origCenter = circle.getLatLng();
              if (mapInstance.dragging) mapInstance.dragging.disable();
              L.DomEvent.stopPropagation(e.originalEvent);
            });

            mapInstance.on('mousemove', function(e) {
              if (!dragging) return;
              var lat = origCenter.lat + (e.latlng.lat - dragStart.lat);
              var lng = origCenter.lng + (e.latlng.lng - dragStart.lng);
              circle.setLatLng([lat, lng]);
            });

            mapInstance.on('mouseup', function() {
              if (dragging) {
                dragging = false;
                if (mapInstance.dragging) mapInstance.dragging.enable();
                saveCircle();
              }
            });

            group.addLayer(circle);
          })(cfg);
        });
        mapLayers[lc.id] = group;
        group._isCircleLayer = true;
        if (activeLayers[lc.id]) mapInstance.addLayer(group);
      })(lc);
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
    // Load extra files from featureNames groups and merge into gj.features
    var extraUrls = [];
    if (lc.featureNames) {
      Object.keys(lc.featureNames).forEach(function(groupName) {
        var cfg = lc.featureNames[groupName];
        if (cfg.file && extraUrls.indexOf(cfg.file) === -1) extraUrls.push(cfg.file);
      });
    }
    var mergeChain = Promise.resolve();
    extraUrls.forEach(function(url) {
      mergeChain = mergeChain.then(function() {
        return fetchFile(url).then(function(extraGj) {
          if (extraGj && extraGj.features) {
            gj.features = gj.features.concat(extraGj.features);
          }
        });
      });
    });
    mergeChain.then(function() {
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
              label.on('dragend', function() { saveRouteLabels(); });
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
    });
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

  if (!mapLayers[id]) {
    if (!(lc.submenu && subLayers[id])) return;
  }
  activeLayers[id] = !activeLayers[id];

  if (activeLayers[id]) {
    if (lc.submenu && subLayers[id]) {
      var sl = subLayers[id];
      Object.keys(sl.items).forEach(function(itemId) {
        mapInstance.addLayer(sl.items[itemId]);
        sl.active[itemId] = true;
      });
    }
    if (mapLayers[id]) mapInstance.addLayer(mapLayers[id]);
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
    if (mapLayers[id]) mapInstance.removeLayer(mapLayers[id]);
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
  var maxX = 30, maxY = 30;
  var imgPos = { x: 50, y: 50 };
  try {
    var saved = localStorage.getItem('pensarbahia_bahia_img_pos');
    if (saved) { var p = JSON.parse(saved); if (p.x != null) imgPos.x = p.x; if (p.y != null) imgPos.y = p.y; }
  } catch(e) {}

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

  function onEnd() {
    dragging = false;
    try { localStorage.setItem('pensarbahia_bahia_img_pos', JSON.stringify({ x: imgPos.x, y: imgPos.y })); } catch(e) {}
  }

  container.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  container.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
  applyPosition();
}

/* ============================================================
   PAGE / SLIDE SYSTEM
   ============================================================ */
const PAGE_LAYER_MAP = {
  0: ['int_brasil', 'route_vli', 'route_fiol', 'route_transno', 'route_nortesul', 'route_fico', 'int_cidades', 'int_bahia'],
  1: [],
    2: ['mac_mancha', 'mac_cidades', 'mac_vias', 'mac_ferrovias', 'mac_circulo'],
  3: ['bts_ferrovias', 'bts_rodovias', 'bts_circulo_fixo'],
  4: []
};

function buildPageLayers() {
  [0, 1, 2, 3, 4].forEach(function(pageIdx) {
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
  // Save current map view before switching
  saveCurrentMapView();

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

  // Areas fullscreen image toggle
  var areasFS = document.getElementById('areas-fullscreen');
  if (areasFS) areasFS.classList.toggle('active', index === 5);

  // Sidebar toggle visibility
  var sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) sidebarToggle.style.display = (index === 5) ? 'none' : '';

  // Ocultar legenda no slide 5
  var mapLegend = document.querySelector('.map-legend');
  if (mapLegend) mapLegend.style.display = (index === 5) ? 'none' : '';

  // Desativar camadas da página anterior
  var slideToPage = {0: 0, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4};
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
  // Clear pending mancha delayed activation when switching slides
  if (manchaTimeout) { clearTimeout(manchaTimeout); manchaTimeout = null; }

  // Ativar Brasil e Bahia ao entrar no slide 1
  if (index === 1) {
    if (!activeLayers['int_brasil']) toggleLayer('int_brasil');
    if (!activeLayers['int_bahia']) toggleLayer('int_bahia');
  }

  // Botão editar mancha visível apenas no slide 3
  var editBtn = document.getElementById('edit-mancha-btn');
  if (editBtn) editBtn.style.display = (index === 3) ? '' : 'none';

  // Save/restore video overlays per slide
  syncVideoOverlayState(currentSlide);
  saveVideoOverlays(currentSlide);
  document.querySelectorAll('.video-overlay').forEach(function(v) { v.remove(); });
  // Disable subpage mode when leaving slide 4
  if (currentSlide === 4) { disableSubpageMode(); }
  // Save Bahia image position when leaving slide 2
  if (currentSlide === 2) {
    var container = document.getElementById('bahia-drag-container');
    if (container) {
      var img = document.getElementById('bahia-drag-img');
      if (img) {
        var op = img.style.objectPosition || container.style.getPropertyValue('--bahia-img-pos');
        if (op) { try { localStorage.setItem('pensarbahia_bahia_img_pos', JSON.stringify({ x: parseFloat(op) || 50, y: parseFloat(op.split(' ')[1]) || 50 })); } catch(e) {} }
      }
    }
  }
  if (index >= 1 && index <= 4) restoreVideoOverlays(index);
  // Force the first video file for this slide (bypass any stale saved data)
  if (index >= 1 && index <= 4 && SLIDE_VIDEOS[index]) {
    var firstFile = SLIDE_VIDEOS[index][0];
    var overlays = document.querySelectorAll('.video-overlay');
    if (overlays.length === 0) {
      createVideoOverlay(index, { file: firstFile, left: 0, top: 0 });
    } else {
      var video = overlays[0].querySelector('video');
      if (video) {
        video.src = videoUrl(firstFile);
        video.play().catch(function(){});
      }
    }
  }
  // Slide 5: show first image
  if (index === 5) {
    var areasImg = document.getElementById('areas-img');
    if (areasImg) {
      areasImg.src = 'data/img/' + SLIDE_VIDEOS[5][0];
      updateAreasCounter(0);
    }
  }
  // Auto-start presentation steps when entering a slide that has steps defined
  var slideHasSteps = false, slideFirstStep = -1;
  for (var si = 0; si < PRESENTATION_STEPS.length; si++) {
    if (PRESENTATION_STEPS[si].slide === index) {
      slideHasSteps = true;
      slideFirstStep = si;
      break;
    }
  }
  if (slideHasSteps && currentSlide !== index) {
    (function(slideIdx, firstStepIdx) {
      setTimeout(function() {
        if (currentSlide === slideIdx) {
          currentStep = firstStepIdx - 1;
          startAutoPlay();
        }
      }, 500);
    })(index, slideFirstStep);
  }

  currentSlide = index;

  if (!mapInstance) return;
  if (index >= 1) {
    toggleGallery(false); toggleCiaNorte(false);
    var savedView = null;
    try { var v = localStorage.getItem('pensarbahia_slide' + index + '_view'); if (v) savedView = JSON.parse(v); } catch(e) {}
    if (savedView && index !== 3) {
      mapInstance.setView(savedView.center, savedView.zoom, { duration: 2 });
    } else if (index === 1) {
      mapInstance.flyTo([-15.0, -60.0], 4, { duration: 2 });
    } else if (index === 2) {
      mapInstance.flyTo([-12.75689, -39.36401], 8, { duration: 2 });
    } else if (index === 3) {
      mapInstance.flyTo([-12.75689, -39.36401], 9, { duration: 2 });
    } else if (index === 4) {
      mapInstance.flyTo([-12.76878, -38.46107], 12, { duration: 2 });
    } else if (index === 5) {
      mapInstance.flyTo([-12.76878, -38.46107], 12, { duration: 2 });
    }
    setTimeout(function() { mapInstance.invalidateSize(); }, 200);
  }
}

function saveCurrentMapView() {
  if (!mapInstance || currentSlide < 1 || currentSlide > 5 || currentSlide === 3 || currentSlide === 5) return;
  var c = mapInstance.getCenter();
  var z = mapInstance.getZoom();
  try {
    localStorage.setItem('pensarbahia_slide' + currentSlide + '_view', JSON.stringify({ center: [c.lat, c.lng], zoom: z }));
  } catch(e) {}
}

function lockMapView() {
  if (!mapInstance) return;
  mapInstance.dragging.disable();
  mapInstance.scrollWheelZoom.disable();
  mapInstance.touchZoom.disable();
  mapInstance.doubleClickZoom.disable();
  mapInstance.boxZoom.disable();
  mapInstance.keyboard.disable();
  if (mapInstance.tap) mapInstance.tap.disable();
}

/* ============================================================
   SUBPAGE MODE — Slide 4 video 11
   ============================================================ */
var _savedOptions = {};
var _wasToggledBySubpage = {};
var _staggerTimers = [];

function saveLayerOptions(id) {
  _savedOptions[id] = [];
  var layer = mapLayers[id];
  if (!layer) return;
  layer.eachLayer(function(l) {
    _savedOptions[id].push({ opacity: l.options.opacity, fillOpacity: l.options.fillOpacity });
  });
}

function restoreLayerOptions(id) {
  var saved = _savedOptions[id];
  if (!saved) return;
  var idx = 0;
  var layer = mapLayers[id];
  if (!layer) return;
  layer.eachLayer(function(l) {
    if (idx < saved.length && l.setStyle) {
      l.setStyle(saved[idx]);
      idx++;
    }
  });
  delete _savedOptions[id];
}

function dimLayer(id, opacity) {
  var layer = mapLayers[id];
  if (!layer) return;
  layer.eachLayer(function(l) {
    if (l.setStyle) l.setStyle({ opacity: opacity, fillOpacity: opacity * 0.3 });
  });
}

function eachGeoJSONLayer(item, fn) {
  if (!item || !item.eachLayer) return;
  item.eachLayer(function(sub) {
    if (sub && sub.eachLayer && typeof sub.setStyle === 'function') {
      sub.eachLayer(function(l) {
        if (l.setStyle) fn(l);
      });
    }
  });
}

function saveSubItemOptions(parentId) {
  var sl = subLayers[parentId];
  if (!sl) return;
  _savedOptions[parentId] = {};
  Object.keys(sl.items).forEach(function(itemId) {
    _savedOptions[parentId][itemId] = [];
    eachGeoJSONLayer(sl.items[itemId], function(l) {
      _savedOptions[parentId][itemId].push({ opacity: l.options.opacity, fillOpacity: l.options.fillOpacity });
    });
  });
}

function restoreSubItemOptions(parentId) {
  var saved = _savedOptions[parentId];
  if (!saved) return;
  var sl = subLayers[parentId];
  if (!sl) return;
  Object.keys(sl.items).forEach(function(itemId) {
    var opts = saved[itemId];
    if (!opts) return;
    var idx = 0;
    eachGeoJSONLayer(sl.items[itemId], function(l) {
      if (idx < opts.length) { l.setStyle(opts[idx]); idx++; }
    });
  });
  delete _savedOptions[parentId];
}

function dimSubItems(parentId, opacity) {
  var sl = subLayers[parentId];
  if (!sl) return;
  Object.keys(sl.items).forEach(function(itemId) {
    eachGeoJSONLayer(sl.items[itemId], function(l) {
      l.setStyle({ opacity: opacity });
    });
  });
}

function enableSubpageMode() {
  mapInstance.flyTo([-12.75689, -39.36401], 9, { duration: 2 });

  // Show macrorregião layers (dimmed)
  ['mac_mancha', 'mac_ferrovias', 'mac_vias'].forEach(function(id) {
    if (!activeLayers[id]) {
      toggleLayer(id);
      _wasToggledBySubpage[id] = true;
    }
    if (id !== 'mac_vias') {
      saveLayerOptions(id);
      dimLayer(id, 0.06);
    }
  });
  // Dim mac_vias sub-items
  dimSubItems('mac_vias', 0.08);

  // Turn off bts_ferrovias and bts_rodovias (Parque Logístico)
  ['bts_ferrovias', 'bts_rodovias'].forEach(function(id) {
    if (activeLayers[id]) {
      toggleLayer(id);
      _wasToggledBySubpage[id] = true;
    }
  });

  // Show subpage circles staggered (azuis primeiro, rosas depois)
  if (!activeLayers['subpage_circles']) {
    activeLayers['subpage_circles'] = true;
    document.querySelectorAll('.layer-btn[data-layer="subpage_circles"]').forEach(function(btn) { btn.classList.add('active'); });
    syncPageButtons('subpage_circles');
    _wasToggledBySubpage['subpage_circles'] = true;

    var group = mapLayers['subpage_circles'];
    if (group) {
      var allCircles = group.getLayers();
      _staggerTimers = [];
      var blueDelay = 2000;
      var pinkDelay = 1800;
      allCircles.forEach(function(circle, i) {
        var delay = i < 5 ? i * blueDelay : (5 * blueDelay) + (i - 5) * pinkDelay;
        var zoom = i < 5 ? 12 : 13;
        var timer = setTimeout(function() {
          mapInstance.addLayer(circle);
          var c = circle.getLatLng();
          mapInstance.flyTo(c, zoom, { duration: 1.5 });
          circle.openTooltip();
          var closeTimer = setTimeout(function() { circle.closeTooltip(); }, 1500);
          _staggerTimers.push(closeTimer);
        }, delay);
        _staggerTimers.push(timer);
      });
      // Return to full macrorregião view after last circle
      var totalDelay = (5 * blueDelay) + (6 * pinkDelay) + 800;
      var returnTimer = setTimeout(function() {
        mapInstance.flyTo([-12.75689, -39.36401], 9, { duration: 2 });
      }, totalDelay);
      _staggerTimers.push(returnTimer);
    }
  }
}

function disableSubpageMode() {
  // Hide circles if we toggled them
  if (_wasToggledBySubpage['subpage_circles']) {
    // Cancel any pending staggered timers
    _staggerTimers.forEach(function(t) { clearTimeout(t); });
    _staggerTimers = [];
    // Remove individual circles from map
    if (mapLayers['subpage_circles']) {
      mapLayers['subpage_circles'].eachLayer(function(circle) { mapInstance.removeLayer(circle); });
    }
    activeLayers['subpage_circles'] = false;
    document.querySelectorAll('.layer-btn[data-layer="subpage_circles"]').forEach(function(btn) { btn.classList.remove('active'); });
    syncPageButtons('subpage_circles');
    delete _wasToggledBySubpage['subpage_circles'];
  }

  // Restore macrorregião layers
  ['mac_mancha', 'mac_ferrovias', 'mac_vias'].forEach(function(id) {
    if (_wasToggledBySubpage[id]) {
      toggleLayer(id);
      delete _wasToggledBySubpage[id];
    } else {
      if (id !== 'mac_vias') restoreLayerOptions(id);
    }
  });
  restoreSubItemOptions('mac_vias');

  // Restore bts layers if we turned them off
  ['bts_ferrovias', 'bts_rodovias'].forEach(function(id) {
    if (_wasToggledBySubpage[id]) {
      toggleLayer(id);
      delete _wasToggledBySubpage[id];
    }
  });

  mapInstance.flyTo([-12.76878, -38.46107], 12, { duration: 2 });
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
    html += '<div class="gallery-item gallery-hidden" data-img-key="' + key + '">' +
      '<img src="data/img/' + filename + '" alt="' + filename + '" loading="lazy">' +
      '<span class="gallery-label">' + filename + '</span>' +
      '</div>';
  });
  grid.innerHTML = html;
}

function toggleCiaNorte(open) {
  var overlay = document.getElementById('cia-norte-overlay');
  if (!overlay) return;
  overlay.classList.toggle('open', open !== undefined ? open : !overlay.classList.contains('open'));
}

function toggleGallery(open, sequential) {
  var overlay = document.getElementById('gallery-overlay');
  if (!overlay) return;
  var isOpen = open !== undefined ? open : !overlay.classList.contains('open');
  
  if (isOpen) {
    resetGalleryReveal();
    overlay.classList.add('open');
    if (sequential) {
      revealGallerySequentially(500);
    } else {
      document.querySelectorAll('.gallery-item').forEach(function(item) {
        item.classList.remove('gallery-hidden');
      });
    }
  } else {
    overlay.classList.remove('open');
    resetGalleryReveal();
  }
  
  var btn = document.getElementById('gallery-open-btn');
  if (btn) btn.textContent = isOpen ? 'Fechar Galeria de Imagens' : 'Abrir Galeria de Imagens';
}

function revealGallerySequentially(delay) {
  delay = delay || 500;
  var items = document.querySelectorAll('.gallery-item.gallery-hidden');
  var idx = 0;
  
  function revealNext() {
    if (idx >= items.length) {
      galleryRevealTimer = null;
      return;
    }
    items[idx].classList.remove('gallery-hidden');
    idx++;
    if (idx < items.length) {
      galleryRevealTimer = setTimeout(revealNext, delay);
    } else {
      galleryRevealTimer = null;
    }
  }
  
  revealNext();
}

function resetGalleryReveal() {
  if (galleryRevealTimer) {
    clearTimeout(galleryRevealTimer);
    galleryRevealTimer = null;
  }
  document.querySelectorAll('.gallery-item').forEach(function(item) {
    item.classList.add('gallery-hidden');
  });
}

/* Gallery state save/restore */
function saveGalleryState() {
  var overlay = document.getElementById('gallery-overlay');
  if (!overlay) return;
  try {
    localStorage.setItem('pensarbahia_gallery_state', JSON.stringify({
      left: overlay.style.left || '',
      top: overlay.style.top || '',
      width: overlay.style.width || overlay.offsetWidth,
      height: overlay.style.height || overlay.offsetHeight
    }));
  } catch(e) {}
}

function restoreGalleryState() {
  var overlay = document.getElementById('gallery-overlay');
  if (!overlay) return;
  try {
    var saved = localStorage.getItem('pensarbahia_gallery_state');
    if (saved) {
      var s = JSON.parse(saved);
      if (s.left) overlay.style.left = s.left;
      if (s.top) overlay.style.top = s.top;
      if (s.width) overlay.style.width = (typeof s.width === 'number' ? s.width + 'px' : s.width);
      if (s.height) overlay.style.height = (typeof s.height === 'number' ? s.height + 'px' : s.height);
    }
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', function() {
  try { localStorage.removeItem('pensarbahia_slide3_view'); } catch(e) {}
  initMap();
  lockMapView();
  buildPageLayers();
  buildGallery();
  initBahiaDrag();
  restoreGalleryState();
  (function() {
    var g = document.getElementById('gallery-overlay');
    if (g) g.addEventListener('mouseup', function() { setTimeout(saveGalleryState, 50); });
  })();

  document.querySelector('.slide-tabs').addEventListener('click', function(e) {
    var tab = e.target.closest('.slide-tab');
    if (tab) { currentStep = -1; switchSlide(parseInt(tab.dataset.slide)); }
  });

  document.getElementById('cover-start').addEventListener('click', function() {
    switchSlide(1);
  });
  document.getElementById('cia-norte-close').addEventListener('click', function() {
    toggleCiaNorte(false);
  });

  // Drag for cover button
  (function() {
    var btn = document.getElementById('cover-start');
    var dragData = null;
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      dragData = { startX: e.clientX, startY: e.clientY, origLeft: btn.offsetLeft, origTop: btn.offsetTop };
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragData) return;
      var dx = e.clientX - dragData.startX, dy = e.clientY - dragData.startY;
      btn.style.marginTop = '0';
      btn.style.position = 'fixed';
      btn.style.left = (dragData.origLeft + dx) + 'px';
      btn.style.top = (dragData.origTop + dy) + 'px';
      localStorage.setItem('pensarbahia_cover_btn_x', btn.style.left);
      localStorage.setItem('pensarbahia_cover_btn_y', btn.style.top);
    });
    document.addEventListener('mouseup', function() { dragData = null; });
    // restore
    var sx = localStorage.getItem('pensarbahia_cover_btn_x');
    var sy = localStorage.getItem('pensarbahia_cover_btn_y');
    if (sx && sy) { btn.style.marginTop = '0'; btn.style.position = 'fixed'; btn.style.left = sx; btn.style.top = sy; }
  })();

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
      currentStep = -1;
      toggleLayer(btn.dataset.pageLayer);
    }
    var toggleAll = e.target.closest('.toggle-all-btn');
    if (toggleAll) { currentStep = -1; toggleAllLayers(parseInt(toggleAll.dataset.page)); }
    var nextBtn = e.target.closest('.slide-next-btn');
    if (nextBtn && nextBtn.dataset.next) { currentStep = -1; switchSlide(parseInt(nextBtn.dataset.next)); }
  });

  document.getElementById('gallery-grid').addEventListener('click', function(e) {
    var item = e.target.closest('.gallery-item');
    if (item) showImageViewer(item.dataset.imgKey);
  });

  document.getElementById('gallery-open-btn').addEventListener('click', function() { toggleGallery(); });
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

  // Ctrl+Shift+S: save current slide video position
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      if (currentSlide >= 1 && currentSlide <= 4) {
        syncVideoOverlayState(currentSlide);
        saveVideoOverlays(currentSlide);
        var msg = document.createElement('div');
        msg.textContent = 'Posicao do video (slide ' + currentSlide + ') salva!';
        msg.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a3a5c;color:#fff;padding:8px 20px;border-radius:6px;z-index:10000;font-family:IBM Plex Sans,sans-serif;font-size:13px;';
        document.body.appendChild(msg);
        setTimeout(function() { msg.remove(); }, 2500);
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
  fetch('data/bahia-outline.geojson?v=' + CACHE_BUSTER).then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
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
  // Ctrl+S: save current map view for this slide
  if (e.ctrlKey && !e.shiftKey && e.key === 's') {
    e.preventDefault();
    if (!mapInstance || currentSlide < 1) return;
    var c = mapInstance.getCenter();
    var z = mapInstance.getZoom();
    try {
      localStorage.setItem('pensarbahia_slide' + currentSlide + '_view', JSON.stringify({ center: [c.lat, c.lng], zoom: z }));
    } catch(e) {}
    alert('View do slide ' + currentSlide + ' salva!');
  }
});

/* Wrapped initMap to add map click handler */
var _initMapOrig = initMap;
initMap = function() {
  _initMapOrig();
  if (mapInstance) mapInstance.on('click', deselectRouteLabel);
};


/* ============================================================
   VIDEO OVERLAY SYSTEM (multiple per slide)
   ============================================================ */
var SLIDE_VIDEOS = {
  1: ['1.mp4','2.mp4'],
  2: ['3.mp4','4.mp4','5.mp4'],
  3: ['6.mp4','7.mp4','8.mp4'],
  4: ['9.mp4','10.mp4','11.mp4'],
  5: ['1.png','2.png','3.png','4.png','5.png','6.png']
};
var videoOverlays = {};

/* ============================================================
   PRESENTATION STEP SYSTEM
   ============================================================ */
var currentStep = -1;
var PRESENTATION_STEPS = [
  // Slide 1 — Integração Bahia-Brasil
  { slide: 1, layers: ['int_brasil', 'int_bahia'], video: '1.mp4' },
  { slide: 1, layers: ['int_brasil', 'int_bahia', 'int_cidades'], video: '1.mp4' },
  { slide: 1, layers: ['int_brasil', 'int_bahia', 'int_cidades', 'route_vli'], video: '1.mp4' },
  { slide: 1, layers: ['int_brasil', 'int_bahia', 'int_cidades', 'route_vli', 'route_fiol'], video: '1.mp4' },
  { slide: 1, layers: ['int_brasil', 'int_bahia', 'int_cidades', 'route_vli', 'route_fiol', 'route_transno'], video: '1.mp4' },
  { slide: 1, layers: ['int_brasil', 'int_bahia', 'int_cidades', 'route_vli', 'route_fiol', 'route_transno', 'route_nortesul'], video: '1.mp4' },
  { slide: 1, layers: ['int_brasil', 'int_bahia', 'int_cidades', 'route_vli', 'route_fiol', 'route_transno', 'route_nortesul', 'route_fico'], video: '1.mp4' },

  // Slide 3 — Macrorregião
  { slide: 3, layers: ['mac_cidades'], video: '6.mp4' },
  { slide: 3, layers: ['mac_cidades'], video: '6.mp4',
    subItems: { 'mac_vias': ['RODOVIAS'] } },
  { slide: 3, layers: ['mac_cidades'], video: '6.mp4',
    subItems: { 'mac_vias': ['RODOVIAS', 'PONTE'] } },
  { slide: 3, layers: ['mac_cidades', 'mac_vias', 'mac_ferrovias'], video: '7.mp4' },
  { slide: 3, layers: ['mac_cidades', 'mac_vias', 'mac_ferrovias'], video: '7.mp4',
    subItems: { 'mac_vias': ['RODOVIAS', 'PONTE', 'RODOVIA NAZARÉ-VALENÇA'] } },
  { slide: 3, layers: ['mac_cidades', 'mac_vias', 'mac_ferrovias', 'mac_circulo', 'mac_mancha'], video: '8.mp4',
    subItems: { 'mac_vias': ['RODOVIAS', 'PONTE', 'RODOVIA NAZARÉ-VALENÇA'] },
    manchaDelay: 1500 },

  // Slide 4 — Parque BTS
  { slide: 4, layers: ['bts_circulo_fixo'], video: '9.mp4' },
  { slide: 4, layers: ['bts_circulo_fixo', 'bts_ferrovias'], video: '9.mp4', delay: 2000 },
  { slide: 4, layers: ['bts_circulo_fixo', 'bts_ferrovias', 'bts_rodovias'], video: '9.mp4', delay: 2000 },
];

var slideToPagePres = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4};

var autoPlayTimer = null;
var autoPlayDelay = 800;
var manchaTimeout = null;
var galleryRevealTimer = null;

function startAutoPlay() {
  stopAutoPlay();
  if (currentStep >= PRESENTATION_STEPS.length - 1) return;
  var firstStep = (currentStep === -1) ? 0 : currentStep + 1;
  var fs = PRESENTATION_STEPS[firstStep];
  if (fs.slide !== currentSlide) return;
  goToPresentationStep(firstStep);
  scheduleNext();
}

function scheduleNext() {
  var nextIdx = currentStep + 1;
  if (nextIdx >= PRESENTATION_STEPS.length) { stopAutoPlay(); return; }
  var nextStep = PRESENTATION_STEPS[nextIdx];
  if (nextStep.slide !== currentSlide) { stopAutoPlay(); return; }
  var curStep = PRESENTATION_STEPS[currentStep];
  if (nextStep.video && curStep && nextStep.video !== curStep.video) {
    stopAutoPlay();
    return;
  }
  var stepDelay = nextStep.delay || autoPlayDelay;
  autoPlayTimer = setTimeout(function() {
    goToPresentationStep(nextIdx);
    scheduleNext();
  }, stepDelay);
}

function stopAutoPlay() {
  if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
}

function isStepLayerActive(id) {
  var lc = getLayerConfig(id);
  if (!lc) return false;
  if (lc.subRoute) {
    var mapping = ROUTE_SUB_ITEMS[id];
    if (!mapping) return false;
    var sl = subLayers[mapping.parentId];
    if (!sl) return false;
    var found = false;
    Object.keys(sl.names).forEach(function(k) {
      if (sl.names[k] === mapping.name && sl.active[k]) found = true;
    });
    return found;
  }
  if (lc.submenu) {
    var sl = subLayers[id];
    if (!sl) return false;
    var found = false;
    Object.keys(sl.active).forEach(function(k) { if (sl.active[k]) found = true; });
    return found;
  }
  return !!activeLayers[id];
}

function goToPresentationStep(idx) {
  if (idx < 0 || idx >= PRESENTATION_STEPS.length) return;
  var step = PRESENTATION_STEPS[idx];

  // Switch slide if needed (triggers video overlay creation, map fly, etc.)
  if (step.slide !== currentSlide) {
    switchSlide(step.slide);
  }

  // Toggle layers on this slide's page to match the step
  var pageKey = slideToPagePres[step.slide];
  var allPageLayers = PAGE_LAYER_MAP[pageKey] || [];
  allPageLayers.forEach(function(id) {
    var lc = getLayerConfig(id);
    if (!lc || lc.type === 'mancha') return;
    var shouldBeOn = step.layers.indexOf(id) !== -1;
    var isActive = isStepLayerActive(id);

    // Skip submenu layers that are controlled via subItems
    if (lc.submenu && step.subItems && step.subItems[id]) {
      return;
    }

    if (shouldBeOn && !isActive) toggleLayer(id);
    else if (!shouldBeOn && isActive) toggleLayer(id);
  });

  // Handle subItems for granular sub-item control
  if (step.subItems) {
    Object.keys(step.subItems).forEach(function(parentId) {
      var desiredNames = step.subItems[parentId];
      var lc = getLayerConfig(parentId);
      if (!lc || !lc.submenu) return;
      var sl = subLayers[parentId];
      if (!sl) return;

      // Ensure parent's map layer is on the map
      if (mapLayers[parentId] && !mapInstance.hasLayer(mapLayers[parentId])) {
        mapInstance.addLayer(mapLayers[parentId]);
      }

      // Toggle sub-items to match desired set
      Object.keys(sl.names).forEach(function(k) {
        var name = sl.names[k];
        var shouldBeOn = desiredNames.indexOf(name) !== -1;
        if (shouldBeOn && !sl.active[k]) {
          toggleSubItem(parentId, k);
        } else if (!shouldBeOn && sl.active[k]) {
          toggleSubItem(parentId, k);
        }
      });

      // Update parent button state
      var anyOn = false;
      Object.keys(sl.active).forEach(function(k) { if (sl.active[k]) anyOn = true; });
      activeLayers[parentId] = anyOn;
      document.querySelectorAll('.layer-btn[data-layer="' + parentId + '"]').forEach(function(btn) {
        btn.classList.toggle('active', anyOn);
      });
      syncPageButtons(parentId);
    });
  }

  // Handle mac_mancha (delayed activation via manchaDelay, immediate deactivation)
  if (manchaTimeout) { clearTimeout(manchaTimeout); manchaTimeout = null; }
  var manchaInLayers = step.layers.indexOf('mac_mancha') !== -1;
  var manchaActive = isStepLayerActive('mac_mancha');
  if (!manchaInLayers && manchaActive) {
    toggleLayer('mac_mancha');
  } else if (manchaInLayers && !manchaActive) {
    var delay = (step.manchaDelay != null) ? step.manchaDelay : 0;
    if (delay > 0) {
      manchaTimeout = setTimeout(function() {
        if (!isStepLayerActive('mac_mancha')) toggleLayer('mac_mancha');
        manchaTimeout = null;
      }, delay);
    } else {
      toggleLayer('mac_mancha');
    }
  }

  // Set video file if specified in the step
  if (step.video) {
    var overlays = document.querySelectorAll('.video-overlay');
    if (overlays.length === 0) {
      // No overlay yet — create one with this step's video
      createVideoOverlay(step.slide, { file: step.video, left: 0, top: 0 });
    } else {
      var video = overlays[0].querySelector('video');
      if (video) {
        var curFile = videoFileFromSrc(video.src);
        if (curFile !== step.video) {
          video.src = videoUrl(step.video);
          video.play().catch(function(){});
        }
      }
    }
  }

  // Open CIA NORTE gallery after last step of slide 4, video 9
  if (step.slide === 4 && step.video === '9.mp4' && step.layers.indexOf('bts_rodovias') !== -1) {
    setTimeout(function() { toggleCiaNorte(true); }, 500);
  }

  currentStep = idx;
}

function saveVideoOverlays(slideIdx) {
  try {
    var val = JSON.stringify(videoOverlays[slideIdx] || []);
    localStorage.setItem('pensarbahia_videos_' + slideIdx, val);
    console.log('SAVE slide ' + slideIdx + ':', val);
  } catch(e) { console.error('SAVE error:', e); }
}

function createVideoOverlay(slideIdx, data) {
  var wrapper = document.querySelector('.map-container-wrapper');
  if (!wrapper) return null;
  var id = data && data.id ? data.id : 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  var slideFiles = SLIDE_VIDEOS[slideIdx] || SLIDE_VIDEOS[1];
  var file = data && data.file && slideFiles.indexOf(data.file) !== -1 ? data.file : slideFiles[0];

  var box = document.createElement('div');
  box.className = 'video-overlay';
  box.dataset.vid = id;
  var posLeft = (data && data.left != null ? data.left : 0);
  var posTop = (data && data.top != null ? data.top : 0);
  box.style.left = posLeft + 'px';
  box.style.top = posTop + 'px';
  if (data && data.width) box.style.width = data.width + 'px';
  else { box.style.width = '100%'; box.style.height = '100%'; }
  if (data && data.height) box.style.height = data.height + 'px';
  console.log('CREATE overlay slide ' + slideIdx + ' id=' + id + ' left=' + posLeft + ' top=' + posTop + ' file=' + file);

  // Video element + Canvas for chroma key (remove white background)
  var video = document.createElement('video');
  video.src = videoUrl(file);
  video.muted = true;
  video.loop = false;
  video.playsInline = true;
  video.autoplay = true;
  box.appendChild(video);

  var canvas = document.createElement('canvas');
  box.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var WHITE_THRESHOLD = 200;

  function processChromaKey() {
    if (video.ended) return;
    if (!video.videoWidth || !video.videoHeight) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    var len = data.length;
    for (var i = 0; i < len; i += 4) {
      if (data[i] > WHITE_THRESHOLD && data[i+1] > WHITE_THRESHOLD && data[i+2] > WHITE_THRESHOLD) {
        data[i+3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (video.requestVideoFrameCallback) {
    function onVideoFrame(now, metadata) {
      processChromaKey();
      video.requestVideoFrameCallback(onVideoFrame);
    }
    video.requestVideoFrameCallback(onVideoFrame);
  } else {
    var ckTimer = null;
    video.addEventListener('play', function onPlay() {
      function tick() {
        if (!video.paused) {
          processChromaKey();
          ckTimer = setTimeout(tick, 66);
        }
      }
      tick();
    });
    video.addEventListener('pause', function onPause() {
      if (ckTimer) clearTimeout(ckTimer);
    });
  }

  wrapper.appendChild(box);

  // Drag
  var dragging = false, startX, startY, origX, origY;
  box.addEventListener('mousedown', function(e) {
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
    var entry = {
      id: id,
      file: box.querySelector('video') ? videoFileFromSrc(box.querySelector('video').src) : (SLIDE_VIDEOS[currentSlide] || SLIDE_VIDEOS[1])[0],
      left: parseInt(box.style.left) || box.offsetLeft || 0,
      top: parseInt(box.style.top) || box.offsetTop || 0,
      width: parseInt(box.style.width) || box.offsetWidth || 300,
      height: parseInt(box.style.height) || box.offsetHeight || 200
    };
    try {
      var val = JSON.stringify([entry]);
      localStorage.setItem('pensarbahia_videos_' + currentSlide, val);
      console.log('MOUSEUP save slide ' + currentSlide + ':', val);
    } catch(e) { console.error('MOUSEUP save error:', e); }
    if (!videoOverlays[currentSlide]) videoOverlays[currentSlide] = [];
    var found = false;
    for (var i = 0; i < videoOverlays[currentSlide].length; i++) {
      if (videoOverlays[currentSlide][i].id === id) { videoOverlays[currentSlide][i] = entry; found = true; break; }
    }
    if (!found) videoOverlays[currentSlide].push(entry);
  });

  // Save to state
  if (!videoOverlays[slideIdx]) videoOverlays[slideIdx] = [];
  videoOverlays[slideIdx].push({ id: id, file: file, left: parseInt(box.style.left) || box.offsetLeft || 0, top: parseInt(box.style.top) || box.offsetTop || 0, width: parseInt(box.style.width) || box.offsetWidth || 300, height: parseInt(box.style.height) || box.offsetHeight || 200 });
  saveVideoOverlays(slideIdx);

  return box;
}

/* Sync video overlay state from DOM into videoOverlays object */
function syncVideoOverlayState(slideIdx) {
  if (_videoSaveTimer) { clearTimeout(_videoSaveTimer); _videoSaveTimer = null; }
  if (!videoOverlays[slideIdx]) videoOverlays[slideIdx] = [];
  document.querySelectorAll('.video-overlay').forEach(function(box) {
    var id = box.dataset.vid;
    var entry = null;
    for (var i = 0; i < videoOverlays[slideIdx].length; i++) {
      if (videoOverlays[slideIdx][i].id === id) { entry = videoOverlays[slideIdx][i]; break; }
    }
    if (!entry) {
      entry = { id: id, file: (SLIDE_VIDEOS[slideIdx] || SLIDE_VIDEOS[1])[0] };
      videoOverlays[slideIdx].push(entry);
    }
    entry.file = (box.querySelector('video') ? videoFileFromSrc(box.querySelector('video').src) : (SLIDE_VIDEOS[slideIdx] || SLIDE_VIDEOS[1])[0]);
    entry.left = parseInt(box.style.left) || box.offsetLeft || 0;
    entry.top = parseInt(box.style.top) || box.offsetTop || 0;
    entry.width = parseInt(box.style.width) || box.offsetWidth || 300;
    entry.height = parseInt(box.style.height) || box.offsetHeight || 200;
  });
  console.log('SYNC slide ' + slideIdx + ' state:', JSON.stringify(videoOverlays[slideIdx]));
}

var _videoSaveTimer = null;
function scheduleVideoSave() {
  if (_videoSaveTimer) clearTimeout(_videoSaveTimer);
  var capturedSlide = currentSlide;
  _videoSaveTimer = setTimeout(function() {
    syncVideoOverlayState(capturedSlide);
    saveVideoOverlays(capturedSlide);
    _videoSaveTimer = null;
  }, 300);
}

function removeVideoOverlay(slideIdx, id) {
  var box = document.querySelector('.video-overlay[data-vid="' + id + '"]');
  if (box) { box.remove(); }
  if (videoOverlays[slideIdx]) {
    videoOverlays[slideIdx] = videoOverlays[slideIdx].filter(function(b) { return b.id !== id; });
    saveVideoOverlays(slideIdx);
  }
}

function restoreVideoOverlays(slideIdx) {
  document.querySelectorAll('.video-overlay').forEach(function(b) { b.remove(); });
  try {
    var saved = localStorage.getItem('pensarbahia_videos_' + slideIdx);
    console.log('RESTORE slide ' + slideIdx + ' raw:', saved);
    var slideFiles = SLIDE_VIDEOS[slideIdx];
    if (!slideFiles || slideFiles.length === 0) { videoOverlays[slideIdx] = []; return; }
    if (saved) {
      var parsed = JSON.parse(saved);
      console.log('RESTORE parsed:', JSON.stringify(parsed));
      // Find entry with actual position data (id + left + top), fallback to first
      var data = parsed.length > 0 ? parsed[0] : { file: slideFiles[0] };
      for (var i = 0; i < parsed.length; i++) {
        if (parsed[i] && parsed[i].id && parsed[i].left != null && parsed[i].top != null) {
          data = parsed[i];
          break;
        }
      }
      data.file = slideFiles[0];
      // Ensure data has id for DOM consistency
      if (!data.id) data.id = 'vid_' + Date.now() + '_' + (Math.random() * 1e9 | 0);
      createVideoOverlay(slideIdx, data);
      // Keep only what createVideoOverlay just created (last entry), dropping stale ghost entries
      var arr = videoOverlays[slideIdx];
      videoOverlays[slideIdx] = [arr[arr.length - 1]];
      saveVideoOverlays(slideIdx);
    } else {
      videoOverlays[slideIdx] = [];
      createVideoOverlay(slideIdx, { file: slideFiles[0] });
    }
  } catch(e) { console.error('RESTORE error:', e, 'slide:', slideIdx); videoOverlays[slideIdx] = []; }
}

function updateAreasCounter(idx) {
  var counter = document.getElementById('areas-counter');
  if (counter) counter.textContent = (idx + 1) + ' / ' + SLIDE_VIDEOS[5].length;
}

/* Arrow keys: navigate presentation steps. Shift+Arrow: cycle videos */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA')) return;

  // Shift+Arrow: navigate presentation steps
  if (e.shiftKey) {
    if (PRESENTATION_STEPS.length === 0) return;
    if (currentSlide === 5) return;

    if (e.key === 'ArrowRight') {
      // Stop auto-play, advance one step
      stopAutoPlay();
      var nextIdx = currentStep + 1;
      if (nextIdx >= PRESENTATION_STEPS.length) { e.preventDefault(); return; }
      goToPresentationStep(nextIdx);
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowLeft') {
      stopAutoPlay();
      if (currentStep === -1) { e.preventDefault(); return; }
      var prevIdx = currentStep - 1;
      if (prevIdx < 0) { goToPresentationStep(0); currentStep = -1; }
      else { goToPresentationStep(prevIdx); }
      e.preventDefault();
      return;
    }
  }

  // Cover: right arrow advances to slide 1
  if (currentSlide === 0 && e.key === 'ArrowRight') {
    e.preventDefault();
    currentStep = -1;
    switchSlide(1);
    return;
  }

  // Slide 5: cycle images
  if (currentSlide === 5) {
    var areasImg = document.getElementById('areas-img');
    if (!areasImg || !areasImg.src) return;
    var slideFiles = SLIDE_VIDEOS[5];
    if (!slideFiles || slideFiles.length === 0) return;
    var curFile = areasImg.src.split('/').pop();
    var curIdx = slideFiles.indexOf(curFile);
    if (curIdx === -1) curIdx = 0;
    if (e.key === 'ArrowRight') {
      curIdx = (curIdx + 1) % slideFiles.length;
    } else {
      curIdx = (curIdx - 1 + slideFiles.length) % slideFiles.length;
    }
    areasImg.src = 'data/img/' + slideFiles[curIdx];
    updateAreasCounter(curIdx);
    e.preventDefault();
    return;
  }

  // Plain Arrow: cycle video files within current slide
  if (currentSlide < 1 || currentSlide > 4) return;
  
  // After last video of slide, right arrow goes to next slide
  if (e.key === 'ArrowRight') {
    var slideLastVideo = { 1: '2.mp4', 2: '5.mp4', 3: '8.mp4' };
    var lastVid = slideLastVideo[currentSlide];
    if (lastVid) {
      var curVid = document.querySelectorAll('.video-overlay');
      if (curVid.length) {
        var cv = curVid[0].querySelector('video');
        if (cv && videoFileFromSrc(cv.src) === lastVid) {
          e.preventDefault();
          currentStep = -1;
          switchSlide(currentSlide + 1);
          return;
        }
      }
    }
  }
  
  var overlays = document.querySelectorAll('.video-overlay');
  if (overlays.length === 0) return;
  var slideFiles = SLIDE_VIDEOS[currentSlide];
  if (!slideFiles || slideFiles.length < 2) return;
  var video = overlays[0].querySelector('video');
  if (!video) return;
  var curFile = videoFileFromSrc(video.src);
  var curIdx = slideFiles.indexOf(curFile);
  if (curIdx === -1) curIdx = 0;
  if (e.key === 'ArrowRight') {
    curIdx = (curIdx + 1) % slideFiles.length;
  } else {
    curIdx = (curIdx - 1 + slideFiles.length) % slideFiles.length;
  }
  var newFile = slideFiles[curIdx];
  video.src = videoUrl(newFile);
  video.play().catch(function(){});
  // Stop auto-play when manually cycling video
  stopAutoPlay();
  if (videoOverlays[currentSlide] && videoOverlays[currentSlide].length > 0) {
    videoOverlays[currentSlide][0].file = newFile;
    saveVideoOverlays(currentSlide);
  }
  if (currentSlide === 4) {
    toggleCiaNorte(false);
    if (newFile === '10.mp4') { toggleGallery(true, true); disableSubpageMode(); }
    else if (newFile === '11.mp4') { toggleGallery(false); currentStep = -1; enableSubpageMode(); }
    else { toggleGallery(false); disableSubpageMode(); }
  }
  // Advance/go back presentation step to match the new video
  if (currentStep >= 0) {
    var bestIdx = -1;
    for (var si = 0; si < PRESENTATION_STEPS.length; si++) {
      var ps = PRESENTATION_STEPS[si];
      if (ps.slide !== currentSlide) continue;
      if (ps.video === newFile) {
        if (bestIdx === -1 || Math.abs(si - currentStep) < Math.abs(bestIdx - currentStep)) {
          bestIdx = si;
        }
      }
    }
    if (bestIdx >= 0 && bestIdx !== currentStep) {
      goToPresentationStep(bestIdx);
    } else if (bestIdx === -1) {
      // No step matches this video — activate all layers for this slide
      // without changing the video (goToPresentationStep would overwrite it)
      var pageKey = slideToPagePres[currentSlide];
      var allIds = PAGE_LAYER_MAP[pageKey] || [];
      allIds.forEach(function(id) {
        if (!isStepLayerActive(id)) toggleLayer(id);
      });
    }
  }
  e.preventDefault();
});

// Stop auto-play on any other key press
document.addEventListener('keydown', function(e) {
  if (!autoPlayTimer) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') return;
  stopAutoPlay();
});

