(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('scoreEl');
  var bestEl = document.getElementById('bestEl');
  var livesEl = document.getElementById('livesEl');
  var comboEl = document.getElementById('comboEl');
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

  var BEST_KEY = 'l9itha_star_catcher_best';
  var bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = bestScore;
  window.L9ithaSfx.syncButton(muteBtn);

  var W = canvas.width;
  var H = canvas.height;
  var state = 'MENU';
  var score = 0;
  var lives = 3;
  var combo = 1;
  var streak = 0;
  var spawnTimer = 0;
  var elapsed = 0;
  var lastTime = 0;

  var keys = { left: false, right: false };
  var paddle = { x: W / 2 - 58, y: H - 36, w: 116, h: 16, speed: 520 };
  var items = [];
  var particles = [];
  var bgStars = Array.from({ length: 65 }, function () {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.6 + 0.2
    };
  });

  function resetGame() {
    score = 0;
    lives = 3;
    combo = 1;
    streak = 0;
    spawnTimer = 0;
    elapsed = 0;
    items = [];
    particles = [];
    paddle.x = W / 2 - paddle.w / 2;
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    comboEl.textContent = combo + 'x';
    if (score > bestScore) {
      bestScore = score;
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
    finalScoreEl.textContent = score;
    finalBestEl.textContent = bestScore;
    overOverlay.classList.remove('hidden');
    window.L9ithaSfx.gameOver();
  }

  function spawnBurst(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = 40 + Math.random() * 140;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.45,
        maxLife: 0.45,
        color: color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function spawnItem() {
    var difficulty = Math.min(2.4, 1 + elapsed / 35);
    var roll = Math.random();
    var type = 'star';
    if (roll < 0.24) type = 'meteor';
    else if (roll > 0.88) type = 'comet';

    items.push({
      x: 24 + Math.random() * (W - 48),
      y: -22,
      r: type === 'meteor' ? 15 : type === 'comet' ? 12 : 13,
      vy: (155 + Math.random() * 90) * difficulty,
      vx: (Math.random() - 0.5) * (type === 'comet' ? 75 : 25),
      type: type,
      rot: Math.random() * Math.PI * 2
    });
  }

  function drawStarShape(cx, cy, spikes, outerR, innerR, rot, fill, stroke) {
    var step = Math.PI / spikes;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var r = i % 2 === 0 ? outerR : innerR;
      var x = Math.cos(i * step) * r;
      var y = Math.sin(i * step) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function update(dt) {
    if (state !== 'PLAYING') return;
    elapsed += dt;

    if (keys.left) paddle.x -= paddle.speed * dt;
    if (keys.right) paddle.x += paddle.speed * dt;
    paddle.x = Math.max(8, Math.min(W - paddle.w - 8, paddle.x));

    var spawnInterval = Math.max(0.28, 0.72 - elapsed * 0.006);
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnItem();
    }

    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.rot += dt * 2.2;

      if (it.x < it.r || it.x > W - it.r) {
        it.vx *= -1;
        it.x = Math.max(it.r, Math.min(W - it.r, it.x));
      }

      var hitPaddle =
        it.y + it.r >= paddle.y &&
        it.y - it.r <= paddle.y + paddle.h &&
        it.x + it.r >= paddle.x &&
        it.x - it.r <= paddle.x + paddle.w;

      if (hitPaddle) {
        if (it.type === 'meteor') {
          lives -= 1;
          streak = 0;
          combo = 1;
          spawnBurst(it.x, it.y, '#F43F5E', 14);
          window.L9ithaSfx.hit();
          items.splice(i, 1);
          updateHud();
          if (lives <= 0) {
            endGame();
            return;
          }
          continue;
        } else {
          streak += 1;
          combo = Math.min(5, 1 + Math.floor(streak / 5));
          var pts = (it.type === 'comet' ? 30 : 10) * combo;
          score += pts;
          spawnBurst(it.x, it.y, it.type === 'comet' ? '#00D9FF' : '#FBBF24', 10);
          if (it.type === 'comet') window.L9ithaSfx.bonus();
          else window.L9ithaSfx.score();
          items.splice(i, 1);
          updateHud();
          continue;
        }
      }

      if (it.y - it.r > H) {
        if (it.type === 'star') {
          streak = 0;
          combo = 1;
          updateHud();
        }
        items.splice(i, 1);
      }
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(p, 1);
    }
  }

  function render() {
    ctx.fillStyle = '#060A13';
    ctx.fillRect(0, 0, W, H);

    // Background starfield
    for (var s = 0; s < bgStars.length; s++) {
      var st = bgStars[s];
      ctx.fillStyle = 'rgba(243, 247, 255, ' + st.a + ')';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Items
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.type === 'star') {
        drawStarShape(it.x, it.y, 5, it.r, it.r * 0.48, it.rot, '#FBBF24', '#FEF08A');
      } else if (it.type === 'comet') {
        drawStarShape(it.x, it.y, 6, it.r, it.r * 0.45, it.rot, '#00D9FF', '#E0F2FE');
      } else {
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot);
        ctx.fillStyle = '#E11D48';
        ctx.strokeStyle = '#FDA4AF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var k = 0; k < 7; k++) {
          var ang = (k / 7) * Math.PI * 2;
          var rad = k % 2 === 0 ? it.r : it.r * 0.72;
          var px = Math.cos(ang) * rad;
          var py = Math.sin(ang) * rad;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Particles
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Paddle
    var grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y);
    grad.addColorStop(0, '#168CFF');
    grad.addColorStop(0.5, '#00D9FF');
    grad.addColorStop(1, '#168CFF');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(243, 247, 255, 0.4)';
    ctx.fillRect(paddle.x + 14, paddle.y + 3, paddle.w - 28, 3);

    if (state === 'PAUSED') {
      ctx.fillStyle = 'rgba(8, 13, 24, 0.72)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#F3F7FF';
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
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

  function movePointer(clientX) {
    if (state !== 'PLAYING') return;
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var canvasX = (clientX - rect.left) * scaleX;
    paddle.x = Math.max(8, Math.min(W - paddle.w - 8, canvasX - paddle.w / 2));
  }

  canvas.addEventListener('mousemove', function (e) {
    movePointer(e.clientX);
  });
  canvas.addEventListener('touchmove', function (e) {
    if (e.touches[0]) {
      e.preventDefault();
      movePointer(e.touches[0].clientX);
    }
  }, { passive: false });
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches[0]) movePointer(e.touches[0].clientX);
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keys.left = true;
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keys.right = true;
      e.preventDefault();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePause();
    }
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
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

  function togglePause() {
    if (state === 'PLAYING') {
      state = 'PAUSED';
      pauseBtn.textContent = 'Resume';
    } else if (state === 'PAUSED') {
      state = 'PLAYING';
      pauseBtn.textContent = 'Pause';
    }
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  muteBtn.addEventListener('click', function () {
    window.L9ithaSfx.toggleMute(muteBtn);
  });

  requestAnimationFrame(loop);
})();
