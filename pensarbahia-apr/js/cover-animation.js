(function() {
  var canvas = document.getElementById('cover-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var trains = [], audioCtx = null, trainGain = null, soundStarted = false;
  var PI = Math.PI, TAU = PI * 2;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- Train sound ----
  function initSound() {
    if (soundStarted) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var sampleRate = audioCtx.sampleRate;
      var duration = 3;
      var length = sampleRate * duration;
      var buffer = audioCtx.createBuffer(1, length, sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) {
        var t = i / sampleRate;
        var rumble = (Math.random() * 2 - 1) * 0.4;
        var chug = Math.sin(TAU * 2 * t) * 0.5;
        var click = Math.max(0, Math.sin(TAU * 1.5 * t)) * 0.3;
        var sweep = Math.sin(TAU * 0.8 * t + 0.5 * Math.sin(TAU * 0.2 * t));
        data[i] = rumble * 0.4 + chug * 0.2 + click * 0.15 + sweep * 0.1;
      }

      var source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      var filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;

      trainGain = audioCtx.createGain();
      trainGain.gain.value = 0.12;

      source.connect(filter);
      filter.connect(trainGain);
      trainGain.connect(audioCtx.destination);
      source.start();
      soundStarted = true;
    } catch(e) {}
  }

  function stopSound() {
    try {
      if (trainGain) trainGain.gain.value = 0;
    } catch(e) {}
  }

  function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  // ---- Locations (two circles) ----
  function getLocations() {
    var s = Math.min(W, H);
    return {
      a: { x: 0, y: H * 0.5, r: Math.max(W, H) * 0.35, label: '', color: '92,224,230' },
      b: { x: W, y: H * 0.5, r: Math.max(W, H) * 0.35, label: '', color: '243,156,18' }
    };
  }

  function drawLocations(time) {
    var loc = getLocations();
    var sites = [loc.a, loc.b];

    for (var i = 0; i < sites.length; i++) {
      var p = sites[i];

      // Filled circle with transparency
      ctx.fillStyle = 'rgba(' + p.color + ',0.06)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(' + p.color + ',0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.stroke();
    }
  }

  // ---- Parallel tracks offset ----
  function getTrackOffsets() {
    var loc = getLocations();
    var dx = loc.b.x - loc.a.x, dy = loc.b.y - loc.a.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { nx: 0, ny: 1 };
    return { nx: -dy / len, ny: dx / len };
  }

  function trackPoint(t, off) {
    var loc = getLocations();
    var o = getTrackOffsets();
    var x = loc.a.x + (loc.b.x - loc.a.x) * t + o.nx * off;
    var y = loc.a.y + (loc.b.y - loc.a.y) * t + o.ny * off;
    return { x: x, y: y };
  }

  // ---- Route lines (two parallel) ----
  function drawRoute(time) {
    var pulse = 0.6 + 0.4 * Math.sin(time * 0.0015);
    var off = 40;

    for (var d = -1; d <= 1; d += 2) {
      var offset = d * off;
      var p1 = trackPoint(0, offset);
      var p2 = trackPoint(1, offset);

      ctx.save();
      ctx.globalAlpha = 0.2 * pulse;
      ctx.strokeStyle = '#5ce0e6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 10]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Subtle glow
      var grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, 'rgba(92,224,230,0.03)');
      grad.addColorStop(0.5, 'rgba(92,224,230,0.06)');
      grad.addColorStop(1, 'rgba(92,224,230,0.03)');
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---- Cargo trains ----
  function initTrains() {
    trains = [];
    var s = Math.min(W, H) / 700;
    // Two trains running in opposite directions
    for (var i = 0; i < 2; i++) {
      trains.push({
        dir: i === 0 ? 1 : -1,
        t: i === 0 ? 0 : 0.5,
        speed: 0.00015 + i * 0.00002,
        hue: i === 0 ? 210 : 190,
        s: s
      });
    }
  }

  function drawTrains(time) {
    var s = Math.min(W, H) / 350;
    var trackOff = 60;

    for (var i = 0; i < trains.length; i++) {
      var tr = trains[i];
      tr.t += tr.speed;
      if (tr.t > 1) { tr.t = 0; }
      if (tr.t < 0) { tr.t = 1; }

      var t = tr.dir === 1 ? tr.t : (1 - tr.t);
      var off = tr.dir === 1 ? -trackOff : trackOff;
      var pt = trackPoint(t, off);
      var ptNext = trackPoint(Math.min(t + 0.001, 1), off);
      var angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x);
      var x = pt.x, y = pt.y;

      // Glow
      ctx.save();
      ctx.globalAlpha = 0.15;
      var glow = ctx.createRadialGradient(x, y, 0, x, y, 40 * s);
      glow.addColorStop(0, 'hsla(' + tr.hue + ', 80%, 70%, 0.2)');
      glow.addColorStop(1, 'hsla(' + tr.hue + ', 80%, 70%, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 40 * s, 0, TAU);
      ctx.fill();
      ctx.restore();

      // Train body
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      var locoLen = 16 * s;
      var hh = 5 * s;
      var cabLeft = tr.dir === -1; // cab at left for bottom train (right→left)

      // Locomotive
      ctx.fillStyle = 'hsla(' + tr.hue + ', 75%, 55%, 0.9)';
      roundRect(ctx, -locoLen/2, -hh, locoLen, hh * 2, 3 * s);
      ctx.fill();

      if (cabLeft) {
        // Cab at LEFT side
        ctx.fillStyle = 'hsla(' + (tr.hue + 15) + ', 70%, 50%, 0.9)';
        roundRect(ctx, -locoLen/2 - 5*s, -hh * 1.4, 7*s, hh * 2.8, 2*s);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,230,255,0.3)';
        ctx.fillRect(-locoLen/2 - 4*s, -hh * 1.0, 5*s, hh * 1.2);

        // Cars at RIGHT side
        var carLen = 14 * s;
        var carCount = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(locoLen/2, 0);
        ctx.lineTo(locoLen/2 + 3*s, 0);
        ctx.stroke();
        for (var c = 0; c < carCount; c++) {
          var cx = locoLen/2 + 3*s + (carLen + 2*s) * c;
          drawContainerCar(ctx, cx, carLen, hh, s, c);
        }
      } else {
        // Cab at RIGHT side (original)
        ctx.fillStyle = 'hsla(' + (tr.hue + 15) + ', 70%, 50%, 0.9)';
        roundRect(ctx, locoLen/2 - 5*s, -hh * 1.4, 7*s, hh * 2.8, 2*s);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,230,255,0.3)';
        ctx.fillRect(locoLen/2 - 4*s, -hh * 1.0, 5*s, hh * 1.2);

        // Cars at LEFT side
        var carLen = 14 * s;
        var carCount = 4;
        for (var c = 0; c < carCount; c++) {
          var cx = -locoLen/2 - 3*s - (carLen + 2*s) * (c + 1);
          if (c === 0) {
            // Connector from locomotive to first car
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1.5 * s;
            ctx.beginPath();
            ctx.moveTo(-locoLen/2, 0);
            ctx.lineTo(cx + carLen, 0);
            ctx.stroke();
          }
          drawContainerCar(ctx, cx, carLen, hh, s, c);
        }
      }

      ctx.restore();
    }
  }

  function drawContainerCar(ctx, cx, carLen, hh, s, idx) {
    var containerColors = [
      'hsla(10, 70%, 50%, 0.8)',
      'hsla(120, 50%, 45%, 0.8)',
      'hsla(240, 50%, 55%, 0.8)',
      'hsla(40, 80%, 55%, 0.8)'
    ];

    // Connector to next car (or previous car)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx + carLen, 0);
    ctx.lineTo(cx + carLen + 2*s, 0);
    ctx.stroke();

    // Car body
    ctx.fillStyle = containerColors[idx % containerColors.length];
    roundRect(ctx, cx, -hh * 0.7, carLen, hh * 1.4, 2*s);
    ctx.fill();

    // Detail line
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(cx + 2*s, -hh * 0.3, carLen - 4*s, 1);

    // Wheels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (var w = 0; w < 2; w++) {
      var wx = cx + 2*s + w * (carLen - 4*s);
      ctx.beginPath();
      ctx.arc(wx, hh * 0.8, 2*s, 0, TAU);
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ---- Containers decoration ----
  function drawContainers() {
    var count = 8;
    var s = Math.min(W, H) / 800;
    for (var i = 0; i < count; i++) {
      var x = (i / count) * W + 40 + Math.sin(Date.now() * 0.0001 + i * 1.7) * 30;
      var y = H - 50 * s - Math.sin(i * 2.5 + Date.now() * 0.00008) * 12 * s;
      var w = 24 * s + Math.sin(i) * 5 * s;
      var h = 14 * s + Math.cos(i * 1.3) * 3 * s;
      ctx.save();
      ctx.translate(x % W, y);
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#5ce0e6';
      ctx.lineWidth = 1;
      ctx.strokeRect(-w/2, -h/2, w, h);
      ctx.strokeRect(-w/2 + 2*s, -h/2 + 2*s, w - 4*s, h - 4*s);
      ctx.restore();
    }
  }

  // ---- Stars ----
  var stars = [];
  function initStars() {
    stars = [];
    var seed = 42;
    for (var i = 0; i < 120; i++) {
      seed = (seed * 16807 + 0) % 2147483647;
      var sx = (seed % 10000) / 10000 * W;
      seed = (seed * 16807 + 0) % 2147483647;
      var sy = (seed % 10000) / 10000 * H;
      seed = (seed * 16807 + 0) % 2147483647;
      var sr = 0.3 + (seed % 100) / 100 * 1.2;
      seed = (seed * 16807 + 0) % 2147483647;
      var sa = 0.2 + (seed % 100) / 100 * 0.5;
      stars.push({ x: sx, y: sy, r: sr, a: sa });
    }
  }

  // ---- Atmosphere ----
  function drawAtmosphere(time) {
    // Vignette
    var vig = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.9);
    vig.addColorStop(0, 'rgba(20,40,80,0.15)');
    vig.addColorStop(0.5, 'rgba(10,15,30,0.2)');
    vig.addColorStop(1, 'rgba(0,0,5,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var twinkle = 0.6 + 0.4 * Math.sin(time * 0.0005 + i * 3.7);
      ctx.globalAlpha = st.a * twinkle;
      ctx.fillStyle = '#b0d0ff';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Horizon lines
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#5ce0e6';
    ctx.lineWidth = 0.5;
    for (var i = 0; i < 8; i++) {
      var gy = H * (0.1 + i * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, gy + Math.sin(time * 0.0001 + i * 1.1) * 5);
      ctx.lineTo(W, gy + Math.sin(time * 0.0001 + i * 1.5) * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Horizon glow
    var hGrad = ctx.createRadialGradient(W/2, H*0.7, 0, W/2, H*0.7, H*0.6);
    hGrad.addColorStop(0, 'rgba(30,60,120,0.08)');
    hGrad.addColorStop(1, 'rgba(30,60,120,0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- Main loop ----
  function loop(time) {
    ctx.clearRect(0, 0, W, H);

    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#060a14');
    grad.addColorStop(0.4, '#0d1530');
    grad.addColorStop(0.7, '#0a1a2e');
    grad.addColorStop(1, '#0f1d30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawAtmosphere(time);
    drawRoute(time);
    drawLocations(time);
    drawTrains(time);
    drawContainers();

    requestAnimationFrame(loop);
  }

  // ---- Init ----
  function init() {
    resize();
    initStars();
    initTrains();
    loop(0);
    function onUserAction() {
      initSound();
      resumeAudio();
      document.removeEventListener('click', onUserAction);
      document.removeEventListener('touchstart', onUserAction);
    }
    document.addEventListener('click', onUserAction);
    document.addEventListener('touchstart', onUserAction);
  }

  window.addEventListener('resize', function() {
    resize();
    initStars();
    initTrains();
  });

  var observer = new MutationObserver(function() {
    var cover = document.querySelector('.cover-slide');
    if (!cover || !cover.classList.contains('active')) stopSound();
  });
  var coverEl = document.querySelector('.cover-slide');
  if (coverEl) observer.observe(coverEl, { attributes: true, attributeFilter: ['class'] });

  setTimeout(init, 100);
})();
