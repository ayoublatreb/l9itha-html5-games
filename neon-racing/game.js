(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('scoreEl');
  var bestEl = document.getElementById('bestEl');
  var speedEl = document.getElementById('speedEl');
  var startOverlay = document.getElementById('startOverlay');
  var overOverlay = document.getElementById('overOverlay');
  var finalScoreEl = document.getElementById('finalScoreEl');
  var finalBestEl = document.getElementById('finalBestEl');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var muteBtn = document.getElementById('muteBtn');
  var leftTouch = document.getElementById('leftTouch');
  var rightTouch = document.getElementById('rightTouch');
  var boostTouch = document.getElementById('boostTouch');

  var BEST_KEY = 'l9itha_neon_racing_best';
  var bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = bestScore;
  window.L9ithaSfx.syncButton(muteBtn);

  var W = canvas.width;
  var H = canvas.height;
  var ROAD_X = 70;
  var ROAD_W = W - 140;
  var LANE_COUNT = 4;
  var LANE_W = ROAD_W / LANE_COUNT;

  var state = 'MENU';
  var score = 0;
  var baseSpeed = 280;
  var speed = 280;
  var roadOffset = 0;
  var spawnTimer = 0;
  var pickupTimer = 0;
  var elapsed = 0;
  var lastTime = 0;
  var turboTimer = 0;

  var keys = { left: false, right: false, boost: false };
  var player = { x: W / 2 - 20, y: H - 96, w: 40, h: 70, vx: 0 };
  var traffic = [];
  var pickups = [];

  function resetGame() {
    score = 0;
    baseSpeed = 290;
    speed = 290;
    roadOffset = 0;
    spawnTimer = 0;
    pickupTimer = 0;
    elapsed = 0;
    turboTimer = 0;
    player.x = W / 2 - player.w / 2;
    player.vx = 0;
    traffic = [];
    pickups = [];
    updateHud();
  }

  function updateHud() {
    var displayScore = Math.floor(score);
    scoreEl.textContent = displayScore;
    speedEl.textContent = Math.round(speed * 0.46) + ' km/h';
    if (displayScore > bestScore) {
      bestScore = displayScore;
      localStorage.setItem(BEST_KEY, String(bestScore));
      bestEl.textContent = bestScore;
    }
  }

  function startGame() {
    resetGame();
    state = 'PLAYING';
    startOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    pauseBtn.textContent = 'Pause';
    window.L9ithaSfx.click();
  }

  function endGame() {
    state = 'OVER';
    updateHud();
    finalScoreEl.textContent = Math.floor(score);
    finalBestEl.textContent = bestScore;
    overOverlay.classList.remove('hidden');
    window.L9ithaSfx.gameOver();
  }

  function laneCenterX(laneIndex, objW) {
    return ROAD_X + laneIndex * LANE_W + (LANE_W - objW) / 2;
  }

  function spawnTrafficCar() {
    var lane = Math.floor(Math.random() * LANE_COUNT);
    var w = 40;
    var h = 72;
    var x = laneCenterX(lane, w);

    // Avoid spawning directly on top of another car
    for (var i = 0; i < traffic.length; i++) {
      if (traffic[i].lane === lane && traffic[i].y < 140) return;
    }

    var colors = ['#F43F5E', '#F59E0B', '#94A3B8', '#38BDF8'];
    traffic.push({
      lane: lane,
      x: x,
      y: -90,
      w: w,
      h: h,
      speedOffset: 70 + Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  function spawnPickup() {
    var lane = Math.floor(Math.random() * LANE_COUNT);
    var size = 24;
    pickups.push({
      x: laneCenterX(lane, size),
      y: -40,
      w: size,
      h: size
    });
  }

  function drawCar(x, y, w, h, bodyColor, isPlayer) {
    ctx.save();
    // Car body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    // Roof / windshield
    ctx.fillStyle = '#080D18';
    ctx.beginPath();
    ctx.roundRect(x + 6, y + (isPlayer ? 16 : 20), w - 12, h - 36, 4);
    ctx.fill();

    // Headlights / Taillights
    if (isPlayer) {
      ctx.fillStyle = '#00D9FF';
      ctx.fillRect(x + 5, y + 2, 8, 5);
      ctx.fillRect(x + w - 13, y + 2, 8, 5);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(x + 6, y + h - 5, 9, 4);
      ctx.fillRect(x + w - 15, y + h - 5, 9, 4);
    } else {
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(x + 5, y + h - 5, 8, 4);
      ctx.fillRect(x + w - 13, y + h - 5, 8, 4);
    }
    ctx.restore();
  }

  function update(dt) {
    if (state !== 'PLAYING') return;
    elapsed += dt;

    baseSpeed = Math.min(620, 290 + elapsed * 5.2);
    var boosting = keys.boost || turboTimer > 0;
    if (turboTimer > 0) turboTimer -= dt;
    speed = baseSpeed * (boosting ? 1.35 : 1);

    var steerSpeed = 340;
    if (keys.left) player.x -= steerSpeed * dt;
    if (keys.right) player.x += steerSpeed * dt;
    player.x = Math.max(ROAD_X + 6, Math.min(ROAD_X + ROAD_W - player.w - 6, player.x));

    roadOffset = (roadOffset + speed * dt) % 48;
    score += (speed / 35) * dt;

    spawnTimer += dt;
    var spawnGap = Math.max(0.42, 1.08 - elapsed * 0.01);
    if (spawnTimer >= spawnGap) {
      spawnTimer = 0;
      spawnTrafficCar();
    }

    pickupTimer += dt;
    if (pickupTimer >= 3.8) {
      pickupTimer = 0;
      spawnPickup();
    }

    for (var i = traffic.length - 1; i >= 0; i--) {
      var car = traffic[i];
      car.y += (speed - car.speedOffset) * dt;

      var pad = 4;
      if (
        player.x + pad < car.x + car.w - pad &&
        player.x + player.w - pad > car.x + pad &&
        player.y + pad < car.y + car.h - pad &&
        player.y + player.h - pad > car.y + pad
      ) {
        window.L9ithaSfx.hit();
        endGame();
        return;
      }

      if (car.y > H + 40) {
        traffic.splice(i, 1);
        score += 10;
      }
    }

    for (var j = pickups.length - 1; j >= 0; j--) {
      var pk = pickups[j];
      pk.y += speed * 0.85 * dt;

      if (
        player.x < pk.x + pk.w &&
        player.x + player.w > pk.x &&
        player.y < pk.y + pk.h &&
        player.y + player.h > pk.y
      ) {
        score += 50;
        turboTimer = 1.6;
        window.L9ithaSfx.bonus();
        pickups.splice(j, 1);
        continue;
      }

      if (pk.y > H + 30) pickups.splice(j, 1);
    }

    updateHud();
  }

  function render() {
    ctx.fillStyle = '#080D18';
    ctx.fillRect(0, 0, W, H);

    // Road shoulders
    ctx.fillStyle = '#0E1728';
    ctx.fillRect(ROAD_X, 0, ROAD_W, H);

    // Glowing lane boundaries
    ctx.fillStyle = '#00D9FF';
    ctx.fillRect(ROAD_X - 3, 0, 3, H);
    ctx.fillRect(ROAD_X + ROAD_W, 0, 3, H);

    // Dashed lane dividers
    ctx.fillStyle = 'rgba(155, 170, 193, 0.35)';
    for (var l = 1; l < LANE_COUNT; l++) {
      var lx = ROAD_X + l * LANE_W - 2;
      for (var y = -48 + roadOffset; y < H; y += 48) {
        ctx.fillRect(lx, y, 4, 24);
      }
    }

    // Pickups
    for (var j = 0; j < pickups.length; j++) {
      var pk = pickups[j];
      ctx.fillStyle = '#00D9FF';
      ctx.beginPath();
      ctx.arc(pk.x + pk.w / 2, pk.y + pk.h / 2, pk.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#080D18';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', pk.x + pk.w / 2, pk.y + pk.h / 2 + 1);
    }

    // Traffic
    for (var i = 0; i < traffic.length; i++) {
      var car = traffic[i];
      drawCar(car.x, car.y, car.w, car.h, car.color, false);
    }

    // Player car
    drawCar(player.x, player.y, player.w, player.h, turboTimer > 0 ? '#00D9FF' : '#168CFF', true);

    if (state === 'PAUSED') {
      ctx.fillStyle = 'rgba(8, 13, 24, 0.72)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#F3F7FF';
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('PAUSED', W / 2, H / 2);
    }
  }

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    var dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { keys.boost = true; e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.boost = false;
  });

  function bindHold(el, keyName) {
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      keys[keyName] = true;
      el.classList.add('active');
    });
    var release = function () {
      keys[keyName] = false;
      el.classList.remove('active');
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  }
  bindHold(leftTouch, 'left');
  bindHold(rightTouch, 'right');
  bindHold(boostTouch, 'boost');

  // Swipe / tap steering on canvas for mobile
  canvas.addEventListener('touchstart', function (e) {
    if (state !== 'PLAYING' || !e.touches[0]) return;
    var rect = canvas.getBoundingClientRect();
    var tx = (e.touches[0].clientX - rect.left) * (W / rect.width);
    if (tx < W / 2) keys.left = true;
    else keys.right = true;
  }, { passive: true });
  canvas.addEventListener('touchend', function () {
    keys.left = false;
    keys.right = false;
  });

  function togglePause() {
    if (state === 'PLAYING') { state = 'PAUSED'; pauseBtn.textContent = 'Resume'; }
    else if (state === 'PAUSED') { state = 'PLAYING'; pauseBtn.textContent = 'Pause'; }
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  muteBtn.addEventListener('click', function () { window.L9ithaSfx.toggleMute(muteBtn); });

  requestAnimationFrame(loop);
})();
