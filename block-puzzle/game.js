(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('scoreEl');
  var bestEl = document.getElementById('bestEl');
  var linesEl = document.getElementById('linesEl');
  var levelEl = document.getElementById('levelEl');
  var startOverlay = document.getElementById('startOverlay');
  var overOverlay = document.getElementById('overOverlay');
  var finalScoreEl = document.getElementById('finalScoreEl');
  var finalBestEl = document.getElementById('finalBestEl');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var muteBtn = document.getElementById('muteBtn');

  var BEST_KEY = 'l9itha_block_puzzle_best';
  var bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = bestScore;
  window.L9ithaSfx.syncButton(muteBtn);

  var COLS = 10;
  var ROWS = 20;
  var CELL = 25;
  var BOARD_X = 28;
  var BOARD_Y = 20;

  var SHAPES = [
    { color: '#00D9FF', m: [[1, 1, 1, 1]] },               // I
    { color: '#F59E0B', m: [[1, 1], [1, 1]] },             // O
    { color: '#8B5CF6', m: [[0, 1, 0], [1, 1, 1]] },       // T
    { color: '#10B981', m: [[0, 1, 1], [1, 1, 0]] },       // S
    { color: '#F43F5E', m: [[1, 1, 0], [0, 1, 1]] },       // Z
    { color: '#168CFF', m: [[1, 0, 0], [1, 1, 1]] },       // J
    { color: '#FB923C', m: [[0, 0, 1], [1, 1, 1]] }        // L
  ];

  var state = 'MENU';
  var board = [];
  var bag = [];
  var current = null;
  var nextPiece = null;
  var score = 0;
  var lines = 0;
  var level = 1;
  var dropAcc = 0;
  var lastTime = 0;

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      b.push(new Array(COLS).fill(null));
    }
    return b;
  }

  function refillBag() {
    var indices = [0, 1, 2, 3, 4, 5, 6];
    for (var i = indices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    bag = bag.concat(indices);
  }

  function pullPiece() {
    if (bag.length < 3) refillBag();
    var idx = bag.shift();
    var def = SHAPES[idx];
    var m = def.m.map(function (row) { return row.slice(); });
    return {
      m: m,
      color: def.color,
      x: Math.floor((COLS - m[0].length) / 2),
      y: 0
    };
  }

  function updateHud() {
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_KEY, String(bestScore));
      bestEl.textContent = bestScore;
    }
  }

  function collides(piece, dx, dy, testMatrix) {
    var m = testMatrix || piece.m;
    for (var r = 0; r < m.length; r++) {
      for (var c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        var nx = piece.x + c + dx;
        var ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateMatrix(m) {
    var rows = m.length;
    var cols = m[0].length;
    var out = [];
    for (var c = 0; c < cols; c++) {
      var row = [];
      for (var r = rows - 1; r >= 0; r--) {
        row.push(m[r][c]);
      }
      out.push(row);
    }
    return out;
  }

  function tryRotate() {
    if (state !== 'PLAYING' || !current) return;
    var rotated = rotateMatrix(current.m);
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(current, kicks[i], 0, rotated)) {
        current.m = rotated;
        current.x += kicks[i];
        window.L9ithaSfx.click();
        return;
      }
    }
  }

  function moveHoriz(dx) {
    if (state !== 'PLAYING' || !current) return;
    if (!collides(current, dx, 0)) {
      current.x += dx;
    }
  }

  function lockPiece() {
    for (var r = 0; r < current.m.length; r++) {
      for (var c = 0; c < current.m[r].length; c++) {
        if (current.m[r][c]) {
          var by = current.y + r;
          var bx = current.x + c;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            board[by][bx] = current.color;
          }
        }
      }
    }

    var cleared = 0;
    for (var row = ROWS - 1; row >= 0; row--) {
      if (board[row].every(function (cell) { return cell !== null; })) {
        board.splice(row, 1);
        board.unshift(new Array(COLS).fill(null));
        cleared += 1;
        row += 1;
      }
    }

    if (cleared > 0) {
      var linePoints = [0, 100, 300, 500, 800][cleared] || 800;
      score += linePoints * level;
      lines += cleared;
      level = 1 + Math.floor(lines / 8);
      if (cleared >= 3) window.L9ithaSfx.bonus();
      else window.L9ithaSfx.score();
    } else {
      score += 10;
      window.L9ithaSfx.click();
    }

    current = nextPiece;
    nextPiece = pullPiece();
    updateHud();

    if (collides(current, 0, 0)) {
      endGame();
    }
  }

  function stepDown() {
    if (state !== 'PLAYING' || !current) return;
    if (!collides(current, 0, 1)) {
      current.y += 1;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (state !== 'PLAYING' || !current) return;
    var dropDist = 0;
    while (!collides(current, 0, 1)) {
      current.y += 1;
      dropDist += 1;
    }
    score += dropDist * 2;
    lockPiece();
  }

  function resetGame() {
    board = emptyBoard();
    bag = [];
    score = 0;
    lines = 0;
    level = 1;
    dropAcc = 0;
    current = pullPiece();
    nextPiece = pullPiece();
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

  function drawCell(px, py, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha !== undefined ? alpha : 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(px + 3, py + 3, CELL - 6, 3);
    ctx.restore();
  }

  function update(dt) {
    if (state !== 'PLAYING') return;
    var interval = Math.max(0.12, 0.72 - (level - 1) * 0.065);
    dropAcc += dt;
    if (dropAcc >= interval) {
      dropAcc = 0;
      stepDown();
    }
  }

  function render() {
    ctx.fillStyle = '#060A13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Board frame
    ctx.fillStyle = '#0C1424';
    ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = '#1E314F';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, COLS * CELL + 2, ROWS * CELL + 2);

    // Grid lines
    ctx.strokeStyle = 'rgba(30, 49, 79, 0.35)';
    ctx.lineWidth = 1;
    for (var c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * CELL, BOARD_Y);
      ctx.lineTo(BOARD_X + c * CELL, BOARD_Y + ROWS * CELL);
      ctx.stroke();
    }
    for (var r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * CELL);
      ctx.lineTo(BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
      ctx.stroke();
    }

    // Placed blocks
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        if (board[row][col]) {
          drawCell(BOARD_X + col * CELL, BOARD_Y + row * CELL, board[row][col]);
        }
      }
    }

    if (current) {
      // Ghost piece
      var ghostY = current.y;
      while (!collides({ m: current.m, x: current.x, y: ghostY }, 0, 1)) {
        ghostY += 1;
      }
      for (var gr = 0; gr < current.m.length; gr++) {
        for (var gc = 0; gc < current.m[gr].length; gc++) {
          if (current.m[gr][gc]) {
            drawCell(BOARD_X + (current.x + gc) * CELL, BOARD_Y + (ghostY + gr) * CELL, current.color, 0.22);
          }
        }
      }

      // Active piece
      for (var pr = 0; pr < current.m.length; pr++) {
        for (var pc = 0; pc < current.m[pr].length; pc++) {
          if (current.m[pr][pc]) {
            drawCell(BOARD_X + (current.x + pc) * CELL, BOARD_Y + (current.y + pr) * CELL, current.color, 1);
          }
        }
      }
    }

    // Side Next Piece panel
    var panelX = BOARD_X + COLS * CELL + 20;
    var panelY = BOARD_Y;
    var panelW = canvas.width - panelX - 20;
    ctx.fillStyle = '#101A2C';
    ctx.strokeStyle = '#1E314F';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, 130, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#9BAAC1';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT PIECE', panelX + panelW / 2, panelY + 24);

    if (nextPiece) {
      var nw = nextPiece.m[0].length * 20;
      var nh = nextPiece.m.length * 20;
      var sx = panelX + (panelW - nw) / 2;
      var sy = panelY + 42 + (70 - nh) / 2;
      for (var nr = 0; nr < nextPiece.m.length; nr++) {
        for (var nc = 0; nc < nextPiece.m[nr].length; nc++) {
          if (nextPiece.m[nr][nc]) {
            ctx.fillStyle = nextPiece.color;
            ctx.beginPath();
            ctx.roundRect(sx + nc * 20 + 1, sy + nr * 20 + 1, 18, 18, 3);
            ctx.fill();
          }
        }
      }
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
    if (state !== 'PLAYING' && e.key !== 'p' && e.key !== 'P') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { moveHoriz(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { moveHoriz(1); e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { tryRotate(); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { stepDown(); score += 1; updateHud(); e.preventDefault(); }
    else if (e.key === ' ') { hardDrop(); e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });

  document.getElementById('tLeft').addEventListener('pointerdown', function (e) { e.preventDefault(); moveHoriz(-1); });
  document.getElementById('tRight').addEventListener('pointerdown', function (e) { e.preventDefault(); moveHoriz(1); });
  document.getElementById('tRotate').addEventListener('pointerdown', function (e) { e.preventDefault(); tryRotate(); });
  document.getElementById('tDown').addEventListener('pointerdown', function (e) { e.preventDefault(); stepDown(); });
  document.getElementById('tDrop').addEventListener('pointerdown', function (e) { e.preventDefault(); hardDrop(); });

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
