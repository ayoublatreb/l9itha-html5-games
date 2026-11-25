(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('scoreEl');
  var bestEl = document.getElementById('bestEl');
  var lenEl = document.getElementById('lenEl');
  var startOverlay = document.getElementById('startOverlay');
  var overOverlay = document.getElementById('overOverlay');
  var finalScoreEl = document.getElementById('finalScoreEl');
  var finalBestEl = document.getElementById('finalBestEl');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var muteBtn = document.getElementById('muteBtn');

  var BEST_KEY = 'l9itha_snake_classic_best';
  var bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = bestScore;
  window.L9ithaSfx.syncButton(muteBtn);

  var COLS = 20;
  var ROWS = 20;
  var CELL = canvas.width / COLS;

  var state = 'MENU';
  var snake = [];
  var dir = { x: 1, y: 0 };
  var dirQueue = [];
  var food = { x: 14, y: 10 };
  var bonusOrb = null;
  var bonusTimer = 0;
  var score = 0;
  var tickAcc = 0;
  var lastTime = 0;

  function randomFreeCell() {
    while (true) {
      var x = Math.floor(Math.random() * COLS);
      var y = Math.floor(Math.random() * ROWS);
      var occupied = snake.some(function (seg) { return seg.x === x && seg.y === y; });
      if (!occupied && !(bonusOrb && bonusOrb.x === x && bonusOrb.y === y)) {
        return { x: x, y: y };
      }
    }
  }

  function updateHud() {
    scoreEl.textContent = score;
    lenEl.textContent = snake.length;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_KEY, String(bestScore));
      bestEl.textContent = bestScore;
    }
  }

  function resetGame() {
    snake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 }
    ];
    dir = { x: 1, y: 0 };
    dirQueue = [];
    food = randomFreeCell();
    bonusOrb = null;
    bonusTimer = 0;
    score = 0;
    tickAcc = 0;
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

  function queueDir(nx, ny) {
    var last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (last.x === -nx && last.y === -ny) return;
    if (last.x === nx && last.y === ny) return;
    if (dirQueue.length < 2) dirQueue.push({ x: nx, y: ny });
  }

  function step() {
    if (dirQueue.length > 0) {
      dir = dirQueue.shift();
    }

    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      endGame();
      return;
    }

    var ateFood = head.x === food.x && head.y === food.y;
    var checkLen = ateFood ? snake.length : snake.length - 1;
    for (var i = 0; i < checkLen; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        endGame();
        return;
      }
    }

    snake.unshift(head);

    if (ateFood) {
      score += 10;
      food = randomFreeCell();
      window.L9ithaSfx.score();
      if (!bonusOrb && Math.random() < 0.28) {
        bonusOrb = randomFreeCell();
        bonusTimer = 6.0;
      }
    } else {
      snake.pop();
    }

    if (bonusOrb && head.x === bonusOrb.x && head.y === bonusOrb.y) {
      score += 35;
      bonusOrb = null;
      window.L9ithaSfx.bonus();
    }

    updateHud();
  }

  function update(dt) {
    if (state !== 'PLAYING') return;

    if (bonusOrb) {
      bonusTimer -= dt;
      if (bonusTimer <= 0) bonusOrb = null;
    }

    var stepInterval = Math.max(0.068, 0.145 - (snake.length - 3) * 0.0022);
    tickAcc += dt;
    while (tickAcc >= stepInterval && state === 'PLAYING') {
      tickAcc -= stepInterval;
      step();
    }
  }

  function render() {
    ctx.fillStyle = '#060A13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle coordinate grid
    ctx.strokeStyle = 'rgba(30, 49, 79, 0.45)';
    ctx.lineWidth = 1;
    for (var c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, canvas.height);
      ctx.stroke();
    }
    for (var r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(canvas.width, r * CELL);
      ctx.stroke();
    }

    // Food orb
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // Bonus orb
    if (bonusOrb) {
      ctx.fillStyle = '#00D9FF';
      ctx.beginPath();
      ctx.arc(bonusOrb.x * CELL + CELL / 2, bonusOrb.y * CELL + CELL / 2, CELL * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snake segments
    for (var i = snake.length - 1; i >= 0; i--) {
      var seg = snake[i];
      var pad = i === 0 ? 1.5 : 2.5;
      ctx.fillStyle = i === 0 ? '#00D9FF' : '#168CFF';
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 5);
      ctx.fill();
    }

    if (state === 'PAUSED') {
      ctx.fillStyle = 'rgba(8, 13, 24, 0.72)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#F3F7FF';
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
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
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { queueDir(0, -1); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { queueDir(0, 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { queueDir(-1, 0); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { queueDir(1, 0); e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });

  // Swipe support
  var touchStart = null;
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches[0]) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (!touchStart || !e.changedTouches[0]) return;
    var dx = e.changedTouches[0].clientX - touchStart.x;
    var dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 18) {
      queueDir(dx > 0 ? 1 : -1, 0);
    } else if (Math.abs(dy) > 18) {
      queueDir(0, dy > 0 ? 1 : -1);
    }
    touchStart = null;
  }, { passive: true });

  document.getElementById('btnLeft').addEventListener('pointerdown', function (e) { e.preventDefault(); queueDir(-1, 0); });
  document.getElementById('btnRight').addEventListener('pointerdown', function (e) { e.preventDefault(); queueDir(1, 0); });
  document.getElementById('btnUp').addEventListener('pointerdown', function (e) { e.preventDefault(); queueDir(0, -1); });
  document.getElementById('btnDown').addEventListener('pointerdown', function (e) { e.preventDefault(); queueDir(0, 1); });

  function togglePause() {
    if (state === 'PLAYING') { state = 'PAUSED'; pauseBtn.textContent = 'Resume'; }
    else if (state === 'PAUSED') { state = 'PLAYING'; pauseBtn.textContent = 'Pause'; }
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  muteBtn.addEventListener('click', function () { window.L9ithaSfx.toggleMute(muteBtn); });

  resetGame();
  requestAnimationFrame(loop);
})();
