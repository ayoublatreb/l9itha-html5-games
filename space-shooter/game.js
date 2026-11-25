(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('scoreEl');
  var bestEl = document.getElementById('bestEl');
  var waveEl = document.getElementById('waveEl');
  var hpEl = document.getElementById('hpEl');
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
  var fireTouch = document.getElementById('fireTouch');

  var BEST_KEY = 'l9itha_space_shooter_best';
  var bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = bestScore;
  window.L9ithaSfx.syncButton(muteBtn);

  var W = canvas.width;
  var H = canvas.height;
  var state = 'MENU';
  var score = 0;
  var wave = 1;
  var hp = 3;
  var twinTimer = 0;
  var fireCooldown = 0;
  var waveSpawnLeft = 0;
  var spawnTimer = 0;
  var lastTime = 0;

  var keys = { left: false, right: false, up: false, down: false, fire: false };
  var ship = { x: W / 2, y: H - 54, w: 36, h: 36, speed: 340, invuln: 0 };
  var bullets = [];
  var enemyBullets = [];
  var enemies = [];
  var powerups = [];
  var particles = [];

  var stars = Array.from({ length: 70 }, function () {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      spd: 25 + Math.random() * 65,
      size: Math.random() < 0.3 ? 2 : 1
    };
  });

  function updateHud() {
    scoreEl.textContent = score;
    waveEl.textContent = wave;
    hpEl.textContent = hp;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_KEY, String(bestScore));
      bestEl.textContent = bestScore;
    }
  }

  function startWave(w) {
    wave = w;
    waveSpawnLeft = 7 + w * 3;
    spawnTimer = 0.2;
    updateHud();
  }

  function resetGame() {
    score = 0;
    hp = 3;
    twinTimer = 0;
    fireCooldown = 0;
    ship.x = W / 2;
    ship.y = H - 54;
    ship.invuln = 0;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    powerups = [];
    particles = [];
    startWave(1);
    updateHud();
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
    finalScoreEl.textContent = score;
    finalBestEl.textContent = bestScore;
    overOverlay.classList.remove('hidden');
    window.L9ithaSfx.gameOver();
  }

  function spawnExplosion(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 40 + Math.random() * 170;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, max: 0.4, color: color });
    }
  }

  function spawnEnemy() {
    var roll = Math.random();
    var kind = 'scout';
    if (wave >= 2 && roll > 0.65) kind = 'diver';
    if (wave >= 3 && roll > 0.86) kind = 'cruiser';

    var eHp = kind === 'cruiser' ? 3 : kind === 'diver' ? 2 : 1;
    var size = kind === 'cruiser' ? 36 : 26;
    enemies.push({
      x: 34 + Math.random() * (W - 68),
      y: -30,
      w: size,
      h: size,
      hp: eHp,
      maxHp: eHp,
      kind: kind,
      vy: kind === 'diver' ? 140 + wave * 8 : kind === 'cruiser' ? 68 + wave * 4 : 95 + wave * 6,
      phase: Math.random() * Math.PI * 2,
      shootTimer: 1.2 + Math.random() * 1.6
    });
  }

  function firePlayerLaser() {
    if (twinTimer > 0) {
      bullets.push({ x: ship.x - 10, y: ship.y - 18, vy: -520 });
      bullets.push({ x: ship.x + 10, y: ship.y - 18, vy: -520 });
    } else {
      bullets.push({ x: ship.x, y: ship.y - 20, vy: -520 });
    }
    window.L9ithaSfx.shoot();
  }

  function damagePlayer() {
    if (ship.invuln > 0) return;
    hp -= 1;
    ship.invuln = 1.4;
    spawnExplosion(ship.x, ship.y, '#F43F5E', 16);
    window.L9ithaSfx.hit();
    updateHud();
    if (hp <= 0) endGame();
  }

  function update(dt) {
    for (var s = 0; s < stars.length; s++) {
      stars[s].y += stars[s].spd * dt;
      if (stars[s].y > H) { stars[s].y = 0; stars[s].x = Math.random() * W; }
    }

    if (state !== 'PLAYING') return;

    if (ship.invuln > 0) ship.invuln -= dt;
    if (twinTimer > 0) twinTimer -= dt;
    if (fireCooldown > 0) fireCooldown -= dt;

    if (keys.left) ship.x -= ship.speed * dt;
    if (keys.right) ship.x += ship.speed * dt;
    if (keys.up) ship.y -= ship.speed * dt;
    if (keys.down) ship.y += ship.speed * dt;

    ship.x = Math.max(24, Math.min(W - 24, ship.x));
    ship.y = Math.max(40, Math.min(H - 28, ship.y));

    if (keys.fire && fireCooldown <= 0) {
      fireCooldown = twinTimer > 0 ? 0.14 : 0.18;
      firePlayerLaser();
    }

    if (waveSpawnLeft > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy();
        waveSpawnLeft -= 1;
        spawnTimer = Math.max(0.35, 1.05 - wave * 0.06);
      }
    } else if (enemies.length === 0) {
      score += 100;
      startWave(wave + 1);
      window.L9ithaSfx.win();
    }

    // Player bullets
    for (var b = bullets.length - 1; b >= 0; b--) {
      bullets[b].y += bullets[b].vy * dt;
      if (bullets[b].y < -16) { bullets.splice(b, 1); continue; }
    }

    // Enemy bullets
    for (var eb = enemyBullets.length - 1; eb >= 0; eb--) {
      var eBul = enemyBullets[eb];
      eBul.x += eBul.vx * dt;
      eBul.y += eBul.vy * dt;
      if (Math.hypot(eBul.x - ship.x, eBul.y - ship.y) < 16) {
        enemyBullets.splice(eb, 1);
        damagePlayer();
        if (state !== 'PLAYING') return;
        continue;
      }
      if (eBul.y > H + 20) enemyBullets.splice(eb, 1);
    }

    // Enemies
    for (var e = enemies.length - 1; e >= 0; e--) {
      var en = enemies[e];
      en.phase += dt * 3;
      en.y += en.vy * dt;
      if (en.kind === 'diver') en.x += Math.sin(en.phase) * 95 * dt;
      en.x = Math.max(24, Math.min(W - 24, en.x));

      en.shootTimer -= dt;
      if (en.shootTimer <= 0 && en.y > 20 && en.y < H - 140) {
        en.shootTimer = en.kind === 'cruiser' ? 1.5 : 2.4;
        var dx = ship.x - en.x;
        var dy = ship.y - en.y;
        var len = Math.hypot(dx, dy) || 1;
        var spd = 210 + wave * 12;
        enemyBullets.push({ x: en.x, y: en.y + en.h / 2, vx: (dx / len) * spd, vy: (dy / len) * spd });
      }

      // Check collision with player bullets
      var destroyed = false;
      for (var b2 = bullets.length - 1; b2 >= 0; b2--) {
        var bul = bullets[b2];
        if (Math.abs(bul.x - en.x) < en.w * 0.6 && Math.abs(bul.y - en.y) < en.h * 0.6) {
          bullets.splice(b2, 1);
          en.hp -= 1;
          if (en.hp <= 0) {
            score += en.kind === 'cruiser' ? 60 : en.kind === 'diver' ? 35 : 20;
            spawnExplosion(en.x, en.y, en.kind === 'cruiser' ? '#F59E0B' : '#00D9FF', 12);
            window.L9ithaSfx.score();
            if (Math.random() < 0.16) {
              powerups.push({ x: en.x, y: en.y, kind: Math.random() < 0.6 ? 'twin' : 'hull' });
            }
            enemies.splice(e, 1);
            updateHud();
            destroyed = true;
            break;
          }
        }
      }
      if (destroyed) continue;

      // Ship collision
      if (Math.hypot(en.x - ship.x, en.y - ship.y) < (en.w / 2 + 14)) {
        enemies.splice(e, 1);
        damagePlayer();
        if (state !== 'PLAYING') return;
        continue;
      }

      if (en.y > H + 36) enemies.splice(e, 1);
    }

    // Powerups
    for (var p = powerups.length - 1; p >= 0; p--) {
      var pw = powerups[p];
      pw.y += 105 * dt;
      if (Math.hypot(pw.x - ship.x, pw.y - ship.y) < 24) {
        if (pw.kind === 'twin') twinTimer = 10;
        else hp = Math.min(5, hp + 1);
        window.L9ithaSfx.bonus();
        updateHud();
        powerups.splice(p, 1);
        continue;
      }
      if (pw.y > H + 20) powerups.splice(p, 1);
    }

    for (var pt = particles.length - 1; pt >= 0; pt--) {
      var pr = particles[pt];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0) particles.splice(pt, 1);
    }
  }

  function render() {
    ctx.fillStyle = '#060A13';
    ctx.fillRect(0, 0, W, H);

    for (var s = 0; s < stars.length; s++) {
      ctx.fillStyle = 'rgba(243, 247, 255, 0.45)';
      ctx.fillRect(stars[s].x, stars[s].y, stars[s].size, stars[s].size);
    }

    // Powerups
    for (var p = 0; p < powerups.length; p++) {
      var pw = powerups[p];
      ctx.fillStyle = pw.kind === 'twin' ? '#00D9FF' : '#10B981';
      ctx.beginPath();
      ctx.arc(pw.x, pw.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#080D18';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pw.kind === 'twin' ? 'W' : '+', pw.x, pw.y + 1);
    }

    // Player bullets
    ctx.fillStyle = '#00D9FF';
    for (var b = 0; b < bullets.length; b++) {
      ctx.fillRect(bullets[b].x - 2, bullets[b].y - 8, 4, 14);
    }

    // Enemy bullets
    ctx.fillStyle = '#F43F5E';
    for (var eb = 0; eb < enemyBullets.length; eb++) {
      ctx.beginPath();
      ctx.arc(enemyBullets[eb].x, enemyBullets[eb].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (var e = 0; e < enemies.length; e++) {
      var en = enemies[e];
      ctx.save();
      ctx.translate(en.x, en.y);
      ctx.fillStyle = en.kind === 'cruiser' ? '#F59E0B' : en.kind === 'diver' ? '#EC4899' : '#E11D48';
      ctx.beginPath();
      ctx.moveTo(0, en.h / 2);
      ctx.lineTo(-en.w / 2, -en.h / 3);
      ctx.lineTo(0, -en.h / 2);
      ctx.lineTo(en.w / 2, -en.h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Player ship
    if (ship.invuln <= 0 || Math.floor(ship.invuln * 14) % 2 === 0) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.fillStyle = '#168CFF';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(-18, 16);
      ctx.lineTo(0, 8);
      ctx.lineTo(18, 16);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#00D9FF';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-6, 4);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (var pt = 0; pt < particles.length; pt++) {
      var pr = particles[pt];
      ctx.globalAlpha = Math.max(0, pr.life / pr.max);
      ctx.fillStyle = pr.color;
      ctx.fillRect(pr.x - 2, pr.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

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
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { keys.up = true; e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { keys.down = true; e.preventDefault(); }
    else if (e.key === ' ') { keys.fire = true; e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
    if (e.key === ' ') keys.fire = false;
  });

  canvas.addEventListener('touchmove', function (e) {
    if (state !== 'PLAYING' || !e.touches[0]) return;
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    ship.x = Math.max(24, Math.min(W - 24, (e.touches[0].clientX - rect.left) * (W / rect.width)));
    ship.y = Math.max(40, Math.min(H - 28, (e.touches[0].clientY - rect.top) * (H / rect.height)));
    keys.fire = true;
  }, { passive: false });
  canvas.addEventListener('touchend', function () { keys.fire = false; });

  function bindHold(el, keyName) {
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      keys[keyName] = true;
      el.classList.add('active');
    });
    var rel = function () { keys[keyName] = false; el.classList.remove('active'); };
    el.addEventListener('pointerup', rel);
    el.addEventListener('pointercancel', rel);
    el.addEventListener('pointerleave', rel);
  }
  bindHold(leftTouch, 'left');
  bindHold(rightTouch, 'right');
  bindHold(fireTouch, 'fire');

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
