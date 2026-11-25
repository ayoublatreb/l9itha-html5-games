(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('scoreEl');
  var bestEl = document.getElementById('bestEl');
  var goalsEl = document.getElementById('goalsEl');
  var kicksEl = document.getElementById('kicksEl');
  var startOverlay = document.getElementById('startOverlay');
  var overOverlay = document.getElementById('overOverlay');
  var finalScoreEl = document.getElementById('finalScoreEl');
  var finalBestEl = document.getElementById('finalBestEl');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var muteBtn = document.getElementById('muteBtn');

  var BEST_KEY = 'l9itha_goal_striker_best';
  var bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = bestScore;
  window.L9ithaSfx.syncButton(muteBtn);

  var W = canvas.width;
  var H = canvas.height;
  var GOAL = { x: 140, y: 74, w: 440, h: 170 };
  var SPOT = { x: W / 2, y: H - 62 };

  var state = 'MENU';
  var score = 0;
  var goals = 0;
  var kicksLeft = 5;
  var phase = 'AIM'; // AIM | FLIGHT | RESULT
  var aim = { x: W / 2, y: GOAL.y + 85 };
  var ball = { x: SPOT.x, y: SPOT.y, r: 16, sx: SPOT.x, sy: SPOT.y, tx: W / 2, ty: 140, t: 0 };
  var keeper = { x: W / 2, y: GOAL.y + GOAL.h - 26, w: 54, h: 72, startX: W / 2, targetX: W / 2, t: 0 };
  var bannerText = '';
  var bannerTimer = 0;
  var lastTime = 0;

  function updateHud() {
    scoreEl.textContent = score;
    goalsEl.textContent = goals;
    kicksEl.textContent = kicksLeft;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_KEY, String(bestScore));
      bestEl.textContent = bestScore;
    }
  }

  function resetRound() {
    phase = 'AIM';
    ball.x = SPOT.x;
    ball.y = SPOT.y;
    ball.r = 16;
    ball.t = 0;
    keeper.x = W / 2;
    keeper.startX = W / 2;
    keeper.targetX = W / 2;
    keeper.t = 0;
    bannerText = '';
  }

  function startGame() {
    score = 0;
    goals = 0;
    kicksLeft = 5;
    aim.x = W / 2;
    aim.y = GOAL.y + 85;
    resetRound();
    state = 'PLAYING';
    startOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    updateHud();
    window.L9ithaSfx.click();
  }

  function endGame() {
    state = 'OVER';
    updateHud();
    finalScoreEl.textContent = score;
    finalBestEl.textContent = bestScore;
    overOverlay.classList.remove('hidden');
    if (goals >= 3) window.L9ithaSfx.win();
    else window.L9ithaSfx.gameOver();
  }

  function shoot(targetX, targetY) {
    if (state !== 'PLAYING' || phase !== 'AIM') return;
    var tx = Math.max(GOAL.x - 16, Math.min(GOAL.x + GOAL.w + 16, targetX));
    var ty = Math.max(GOAL.y - 10, Math.min(GOAL.y + GOAL.h - 10, targetY));

    phase = 'FLIGHT';
    ball.sx = SPOT.x;
    ball.sy = SPOT.y;
    ball.tx = tx;
    ball.ty = ty;
    ball.t = 0;

    // Keeper predicts with realistic human reaction variance
    var keeperBias = (Math.random() - 0.5) * 260;
    keeper.startX = W / 2;
    keeper.targetX = Math.max(GOAL.x + 34, Math.min(GOAL.x + GOAL.w - 34, tx + keeperBias));
    keeper.t = 0;
    window.L9ithaSfx.shoot();
  }

  function resolveShot() {
    phase = 'RESULT';
    bannerTimer = 1.15;
    kicksLeft -= 1;

    var insideGoal =
      ball.tx >= GOAL.x + 8 &&
      ball.tx <= GOAL.x + GOAL.w - 8 &&
      ball.ty >= GOAL.y + 8 &&
      ball.ty <= GOAL.y + GOAL.h - 4;

    var saved = Math.abs(ball.tx - keeper.x) < 42 && ball.ty > GOAL.y + 24;

    if (!insideGoal) {
      bannerText = 'WIDE!';
      window.L9ithaSfx.hit();
    } else if (saved) {
      bannerText = 'SAVED!';
      window.L9ithaSfx.hit();
    } else {
      goals += 1;
      var cornerBonus = (ball.tx < GOAL.x + 75 || ball.tx > GOAL.x + GOAL.w - 75) && ball.ty < GOAL.y + 65;
      var pts = cornerBonus ? 150 : 100;
      score += pts;
      bannerText = cornerBonus ? 'TOP CORNER! +' + pts : 'GOAL! +' + pts;
      window.L9ithaSfx.bonus();
    }
    updateHud();
  }

  function update(dt) {
    if (state !== 'PLAYING') return;

    if (phase === 'FLIGHT') {
      ball.t = Math.min(1, ball.t + dt * 2.15);
      keeper.t = Math.min(1, keeper.t + dt * 2.0);
      var ease = 1 - Math.pow(1 - ball.t, 2);
      ball.x = ball.sx + (ball.tx - ball.sx) * ease;
      ball.y = ball.sy + (ball.ty - ball.sy) * ease - Math.sin(ball.t * Math.PI) * 44;
      ball.r = 16 - ease * 5;

      var kEase = 1 - Math.pow(1 - keeper.t, 2);
      keeper.x = keeper.startX + (keeper.targetX - keeper.startX) * kEase;

      if (ball.t >= 1) {
        resolveShot();
      }
    } else if (phase === 'RESULT') {
      bannerTimer -= dt;
      if (bannerTimer <= 0) {
        if (kicksLeft <= 0) {
          endGame();
        } else {
          resetRound();
        }
      }
    }
  }

  function render() {
    // Stadium night sky
    ctx.fillStyle = '#070D19';
    ctx.fillRect(0, 0, W, H);

    // Pitch turf
    ctx.fillStyle = '#0D261F';
    ctx.fillRect(0, GOAL.y + GOAL.h - 8, W, H - (GOAL.y + GOAL.h - 8));
    ctx.strokeStyle = 'rgba(243, 247, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(85, GOAL.y + GOAL.h - 8, W - 170, 145);

    // Goal net
    ctx.fillStyle = '#0B1424';
    ctx.fillRect(GOAL.x, GOAL.y, GOAL.w, GOAL.h);
    ctx.strokeStyle = 'rgba(155, 170, 193, 0.22)';
    ctx.lineWidth = 1;
    for (var gx = GOAL.x + 22; gx < GOAL.x + GOAL.w; gx += 22) {
      ctx.beginPath();
      ctx.moveTo(gx, GOAL.y);
      ctx.lineTo(gx, GOAL.y + GOAL.h);
      ctx.stroke();
    }
    for (var gy = GOAL.y + 22; gy < GOAL.y + GOAL.h; gy += 22) {
      ctx.beginPath();
      ctx.moveTo(GOAL.x, gy);
      ctx.lineTo(GOAL.x + GOAL.w, gy);
      ctx.stroke();
    }

    // Goal frame
    ctx.strokeStyle = '#F3F7FF';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(GOAL.x, GOAL.y + GOAL.h);
    ctx.lineTo(GOAL.x, GOAL.y);
    ctx.lineTo(GOAL.x + GOAL.w, GOAL.y);
    ctx.lineTo(GOAL.x + GOAL.w, GOAL.y + GOAL.h);
    ctx.stroke();

    // Goalkeeper
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.roundRect(keeper.x - 18, keeper.y - 38, 36, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#F3F7FF';
    ctx.beginPath();
    ctx.arc(keeper.x, keeper.y - 48, 11, 0, Math.PI * 2);
    ctx.fill();
    // Gloves
    ctx.fillStyle = '#00D9FF';
    ctx.beginPath();
    ctx.arc(keeper.x - 26, keeper.y - 24, 8, 0, Math.PI * 2);
    ctx.arc(keeper.x + 26, keeper.y - 24, 8, 0, Math.PI * 2);
    ctx.fill();

    // Aim reticle
    if (state === 'PLAYING' && phase === 'AIM') {
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(aim.x - 22, aim.y);
      ctx.lineTo(aim.x + 22, aim.y);
      ctx.moveTo(aim.x, aim.y - 22);
      ctx.lineTo(aim.x, aim.y + 22);
      ctx.stroke();
    }

    // Penalty spot & ball
    ctx.fillStyle = 'rgba(243, 247, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(SPOT.x, SPOT.y + 8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F3F7FF';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#168CFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (bannerText) {
      ctx.fillStyle = 'rgba(8, 13, 24, 0.78)';
      ctx.fillRect(W / 2 - 140, H / 2 - 28, 280, 56);
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 140, H / 2 - 28, 280, 56);
      ctx.fillStyle = '#F3F7FF';
      ctx.font = '800 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bannerText, W / 2, H / 2);
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

  function pointerToCanvas(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height)
    };
  }

  canvas.addEventListener('mousemove', function (e) {
    if (state !== 'PLAYING' || phase !== 'AIM') return;
    var pt = pointerToCanvas(e.clientX, e.clientY);
    aim.x = Math.max(GOAL.x, Math.min(GOAL.x + GOAL.w, pt.x));
    aim.y = Math.max(GOAL.y, Math.min(GOAL.y + GOAL.h, pt.y));
  });

  canvas.addEventListener('click', function (e) {
    if (state !== 'PLAYING' || phase !== 'AIM') return;
    var pt = pointerToCanvas(e.clientX, e.clientY);
    shoot(pt.x, pt.y);
  });

  window.addEventListener('keydown', function (e) {
    if (state !== 'PLAYING' || phase !== 'AIM') return;
    if (e.key === 'ArrowLeft' || e.key === 'a') { aim.x = Math.max(GOAL.x + 12, aim.x - 26); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { aim.x = Math.min(GOAL.x + GOAL.w - 12, aim.x + 26); e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'w') { aim.y = Math.max(GOAL.y + 14, aim.y - 22); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 's') { aim.y = Math.min(GOAL.y + GOAL.h - 14, aim.y + 22); e.preventDefault(); }
    else if (e.key === ' ') { shoot(aim.x, aim.y); e.preventDefault(); }
  });

  document.getElementById('aimLeft').addEventListener('click', function () {
    aim.x = Math.max(GOAL.x + 12, aim.x - 36);
  });
  document.getElementById('aimRight').addEventListener('click', function () {
    aim.x = Math.min(GOAL.x + GOAL.w - 12, aim.x + 36);
  });
  document.getElementById('shootBtn').addEventListener('click', function () {
    shoot(aim.x, aim.y);
  });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  muteBtn.addEventListener('click', function () { window.L9ithaSfx.toggleMute(muteBtn); });

  requestAnimationFrame(loop);
})();
