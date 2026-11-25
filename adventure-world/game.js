(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('scoreEl');
  var stageEl = document.getElementById('stageEl');
  var crystalEl = document.getElementById('crystalEl');
  var livesEl = document.getElementById('livesEl');
  var startOverlay = document.getElementById('startOverlay');
  var overOverlay = document.getElementById('overOverlay');
  var overKicker = document.getElementById('overKicker');
  var overTitle = document.getElementById('overTitle');
  var finalScoreEl = document.getElementById('finalScoreEl');
  var finalBestEl = document.getElementById('finalBestEl');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var muteBtn = document.getElementById('muteBtn');

  var BEST_KEY = 'l9itha_adventure_world_best';
  var bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  window.L9ithaSfx.syncButton(muteBtn);

  var W = canvas.width;
  var H = canvas.height;
  var GRAVITY = 1480;
  var JUMP_VEL = -560;
  var MOVE_SPEED = 265;

  var LEVELS = [
    {
      width: 1750,
      spawn: { x: 60, y: 310 },
      portal: { x: 1640, y: 210 },
      platforms: [
        { x: 0, y: 380, w: 420, h: 60 },
        { x: 490, y: 340, w: 210, h: 24 },
        { x: 760, y: 295, w: 220, h: 24 },
        { x: 1050, y: 350, w: 260, h: 90 },
        { x: 1360, y: 290, w: 180, h: 24 },
        { x: 1580, y: 260, w: 170, h: 180 }
      ],
      crystals: [
        { x: 250, y: 340 }, { x: 590, y: 300 }, { x: 860, y: 255 },
        { x: 1180, y: 310 }, { x: 1450, y: 250 }
      ],
      enemies: [
        { x: 510, y: 316, minX: 500, maxX: 675, vx: 80 },
        { x: 1080, y: 326, minX: 1065, maxX: 1280, vx: 110 }
      ]
    },
    {
      width: 1950,
      spawn: { x: 50, y: 320 },
      portal: { x: 1840, y: 180 },
      platforms: [
        { x: 0, y: 380, w: 300, h: 60 },
        { x: 370, y: 320, w: 160, h: 22 },
        { x: 600, y: 260, w: 170, h: 22 },
        { x: 840, y: 330, w: 260, h: 24 },
        { x: 1170, y: 270, w: 160, h: 22 },
        { x: 1400, y: 215, w: 180, h: 22 },
        { x: 1650, y: 230, w: 300, h: 210 }
      ],
      crystals: [
        { x: 450, y: 280 }, { x: 685, y: 220 }, { x: 960, y: 290 },
        { x: 1250, y: 230 }, { x: 1490, y: 175 }, { x: 1740, y: 190 }
      ],
      enemies: [
        { x: 860, y: 306, minX: 850, maxX: 1070, vx: 125 },
        { x: 1420, y: 191, minX: 1410, maxX: 1555, vx: 95 },
        { x: 1670, y: 206, minX: 1660, maxX: 1800, vx: 110 }
      ]
    },
    {
      width: 2150,
      spawn: { x: 50, y: 320 },
      portal: { x: 2040, y: 155 },
      platforms: [
        { x: 0, y: 380, w: 280, h: 60 },
        { x: 350, y: 325, w: 150, h: 22 },
        { x: 570, y: 270, w: 140, h: 22 },
        { x: 780, y: 215, w: 150, h: 22 },
        { x: 1010, y: 320, w: 280, h: 24 },
        { x: 1360, y: 265, w: 160, h: 22 },
        { x: 1590, y: 210, w: 170, h: 22 },
        { x: 1840, y: 205, w: 310, h: 235 }
      ],
      crystals: [
        { x: 425, y: 285 }, { x: 640, y: 230 }, { x: 855, y: 175 },
        { x: 1140, y: 280 }, { x: 1440, y: 225 }, { x: 1675, y: 170 }, { x: 1920, y: 165 }
      ],
      enemies: [
        { x: 1030, y: 296, minX: 1020, maxX: 1265, vx: 145 },
        { x: 1610, y: 186, minX: 1600, maxX: 1735, vx: 105 },
        { x: 1860, y: 181, minX: 1850, maxX: 1995, vx: 130 }
      ]
    }
  ];

  var state = 'MENU';
  var levelIndex = 0;
  var score = 0;
  var crystalsCollected = 0;
  var lives = 3;
  var camX = 0;
  var lastTime = 0;

  var keys = { left: false, right: false, jump: false };
  var player = { x: 60, y: 300, w: 28, h: 38, vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuf: 0, invuln: 0 };
  var curLevel = null;
  var activeCrystals = [];
  var activeEnemies = [];

  function loadLevel(idx) {
    levelIndex = idx;
    var template = LEVELS[idx];
    curLevel = template;
    player.x = template.spawn.x;
    player.y = template.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.invuln = 0.8;
    activeCrystals = template.crystals.map(function (c) { return { x: c.x, y: c.y, taken: false }; });
    activeEnemies = template.enemies.map(function (e) { return { x: e.x, y: e.y, w: 26, h: 24, minX: e.minX, maxX: e.maxX, vx: e.vx }; });
    camX = 0;
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    stageEl.textContent = (levelIndex + 1) + '/' + LEVELS.length;
    crystalEl.textContent = crystalsCollected;
    livesEl.textContent = lives;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_KEY, String(bestScore));
    }
  }

  function startGame() {
    score = 0;
    crystalsCollected = 0;
    lives = 3;
    loadLevel(0);
    state = 'PLAYING';
    startOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    pauseBtn.textContent = 'Pause';
    window.L9ithaSfx.click();
  }

  function finishGame(won) {
    state = 'OVER';
    updateHud();
    overKicker.textContent = won ? 'All 3 Ruins Cleared' : 'Out of Lives';
    overTitle.textContent = won ? 'Victory!' : 'Quest Ended';
    finalScoreEl.textContent = score;
    finalBestEl.textContent = bestScore;
    overOverlay.classList.remove('hidden');
    if (won) window.L9ithaSfx.win();
    else window.L9ithaSfx.gameOver();
  }

  function hurtPlayer() {
    if (player.invuln > 0) return;
    lives -= 1;
    window.L9ithaSfx.hit();
    updateHud();
    if (lives <= 0) {
      finishGame(false);
      return;
    }
    player.x = curLevel.spawn.x;
    player.y = curLevel.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.invuln = 1.4;
  }

  function triggerJump() {
    player.jumpBuf = 0.14;
  }

  function update(dt) {
    if (state !== 'PLAYING' || !curLevel) return;

    if (player.invuln > 0) player.invuln -= dt;
    if (player.onGround) player.coyote = 0.11;
    else player.coyote -= dt;
    if (player.jumpBuf > 0) player.jumpBuf -= dt;

    player.vx = 0;
    if (keys.left) player.vx -= MOVE_SPEED;
    if (keys.right) player.vx += MOVE_SPEED;

    if (player.jumpBuf > 0 && player.coyote > 0) {
      player.vy = JUMP_VEL;
      player.onGround = false;
      player.coyote = 0;
      player.jumpBuf = 0;
      window.L9ithaSfx.jump();
    }

    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.x = Math.max(0, Math.min(curLevel.width - player.w, player.x));

    // Horizontal platform check
    for (var i = 0; i < curLevel.platforms.length; i++) {
      var pf = curLevel.platforms[i];
      if (player.x < pf.x + pf.w && player.x + player.w > pf.x && player.y < pf.y + pf.h && player.y + player.h > pf.y) {
        if (player.vx > 0) player.x = pf.x - player.w;
        else if (player.vx < 0) player.x = pf.x + pf.w;
      }
    }

    var prevBottom = player.y + player.h;
    player.y += player.vy * dt;
    player.onGround = false;

    for (var j = 0; j < curLevel.platforms.length; j++) {
      var pf2 = curLevel.platforms[j];
      if (player.x < pf2.x + pf2.w && player.x + player.w > pf2.x && player.y < pf2.y + pf2.h && player.y + player.h > pf2.y) {
        if (player.vy >= 0 && prevBottom <= pf2.y + 16) {
          player.y = pf2.y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = pf2.y + pf2.h;
          player.vy = 0;
        }
      }
    }

    // Fall in chasm
    if (player.y > H + 60) {
      hurtPlayer();
      if (state !== 'PLAYING') return;
    }

    // Collect crystals
    for (var c = 0; c < activeCrystals.length; c++) {
      var cr = activeCrystals[c];
      if (!cr.taken && Math.hypot(player.x + player.w / 2 - cr.x, player.y + player.h / 2 - cr.y) < 26) {
        cr.taken = true;
        crystalsCollected += 1;
        score += 50;
        window.L9ithaSfx.score();
        updateHud();
      }
    }

    // Patrol enemies
    for (var e = 0; e < activeEnemies.length; e++) {
      var en = activeEnemies[e];
      en.x += en.vx * dt;
      if (en.x <= en.minX || en.x >= en.maxX) {
        en.vx *= -1;
        en.x = Math.max(en.minX, Math.min(en.maxX, en.x));
      }

      if (
        player.x + 4 < en.x + en.w &&
        player.x + player.w - 4 > en.x &&
        player.y + 4 < en.y + en.h &&
        player.y + player.h > en.y
      ) {
        // Stomp from above
        if (player.vy > 0 && player.y + player.h - player.vy * dt <= en.y + 10) {
          en.x = -999;
          en.vx = 0;
          player.vy = JUMP_VEL * 0.72;
          score += 100;
          window.L9ithaSfx.bonus();
          updateHud();
        } else {
          hurtPlayer();
          if (state !== 'PLAYING') return;
        }
      }
    }

    // Portal exit
    var pt = curLevel.portal;
    if (Math.hypot(player.x + player.w / 2 - pt.x, player.y + player.h / 2 - pt.y) < 34) {
      score += 200;
      if (levelIndex + 1 < LEVELS.length) {
        window.L9ithaSfx.win();
        loadLevel(levelIndex + 1);
      } else {
        finishGame(true);
      }
      return;
    }

    camX = Math.max(0, Math.min(curLevel.width - W, player.x - W * 0.35));
  }

  function render() {
    ctx.fillStyle = '#060A13';
    ctx.fillRect(0, 0, W, H);

    if (!curLevel) return;

    // Distant twilight mountains (parallax)
    ctx.fillStyle = '#0D1729';
    for (var m = 0; m < 6; m++) {
      var mx = ((m * 320) - camX * 0.25) % (W + 320);
      ctx.beginPath();
      ctx.moveTo(mx - 160, H);
      ctx.lineTo(mx + 40, 210 + (m % 2) * 45);
      ctx.lineTo(mx + 240, H);
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-camX, 0);

    // Platforms
    for (var i = 0; i < curLevel.platforms.length; i++) {
      var pf = curLevel.platforms[i];
      ctx.fillStyle = '#14223B';
      ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
      ctx.fillStyle = '#168CFF';
      ctx.fillRect(pf.x, pf.y, pf.w, 4);
    }

    // Crystals
    for (var c = 0; c < activeCrystals.length; c++) {
      var cr = activeCrystals[c];
      if (cr.taken) continue;
      ctx.fillStyle = '#00D9FF';
      ctx.beginPath();
      ctx.moveTo(cr.x, cr.y - 12);
      ctx.lineTo(cr.x + 9, cr.y);
      ctx.lineTo(cr.x, cr.y + 12);
      ctx.lineTo(cr.x - 9, cr.y);
      ctx.closePath();
      ctx.fill();
    }

    // Portal
    var pt = curLevel.portal;
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, 18, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 217, 255, 0.22)';
    ctx.fill();

    // Enemies
    for (var e = 0; e < activeEnemies.length; e++) {
      var en = activeEnemies[e];
      if (en.x < -100) continue;
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.roundRect(en.x, en.y, en.w, en.h, 6);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(en.x + 5, en.y + 7, 5, 5);
      ctx.fillRect(en.x + en.w - 10, en.y + 7, 5, 5);
    }

    // Explorer player
    if (player.invuln <= 0 || Math.floor(player.invuln * 14) % 2 === 0) {
      ctx.fillStyle = '#168CFF';
      ctx.beginPath();
      ctx.roundRect(player.x, player.y + 10, player.w, player.h - 10, 6);
      ctx.fill();
      // Hood / Head
      ctx.fillStyle = '#00D9FF';
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

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

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') { triggerJump(); e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  function bindHold(id, prop) {
    var el = document.getElementById(id);
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); keys[prop] = true; el.classList.add('active'); });
    var rel = function () { keys[prop] = false; el.classList.remove('active'); };
    el.addEventListener('pointerup', rel);
    el.addEventListener('pointercancel', rel);
    el.addEventListener('pointerleave', rel);
  }
  bindHold('tLeft', 'left');
  bindHold('tRight', 'right');
  document.getElementById('tJump').addEventListener('pointerdown', function (e) { e.preventDefault(); triggerJump(); });

  function togglePause() {
    if (state === 'PLAYING') { state = 'PAUSED'; pauseBtn.textContent = 'Resume'; }
    else if (state === 'PAUSED') { state = 'PLAYING'; pauseBtn.textContent = 'Pause'; }
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  muteBtn.addEventListener('click', function () { window.L9ithaSfx.toggleMute(muteBtn); });

  loadLevel(0);
  requestAnimationFrame(loop);
})();
