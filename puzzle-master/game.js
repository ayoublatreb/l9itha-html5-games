(function () {
  'use strict';

  var boardEl = document.getElementById('board');
  var movesEl = document.getElementById('movesEl');
  var timeEl = document.getElementById('timeEl');
  var bestEl = document.getElementById('bestEl');
  var sizeSelect = document.getElementById('sizeSelect');
  var shuffleBtn = document.getElementById('shuffleBtn');
  var muteBtn = document.getElementById('muteBtn');
  var startOverlay = document.getElementById('startOverlay');
  var winOverlay = document.getElementById('winOverlay');
  var finalMovesEl = document.getElementById('finalMovesEl');
  var finalTimeEl = document.getElementById('finalTimeEl');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');

  window.L9ithaSfx.syncButton(muteBtn);

  var size = 4;
  var tiles = [];
  var moves = 0;
  var seconds = 0;
  var timerId = null;
  var active = false;

  function bestKey() {
    return 'l9itha_puzzle_master_best_' + size;
  }

  function formatTime(sec) {
    var m = String(Math.floor(sec / 60)).padStart(2, '0');
    var s = String(sec % 60).padStart(2, '0');
    return m + ':' + s;
  }

  function loadBest() {
    var val = localStorage.getItem(bestKey());
    bestEl.textContent = val ? val + ' mv' : '--';
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(function () {
      if (!active) return;
      seconds += 1;
      timeEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function createSolvedTiles(n) {
    var arr = [];
    for (var i = 1; i < n * n; i++) arr.push(i);
    arr.push(0);
    return arr;
  }

  // Shuffle via valid random legal moves so the board is 100% guaranteed solvable
  function generateSolvableBoard(n) {
    var arr = createSolvedTiles(n);
    var emptyIdx = n * n - 1;
    var lastIdx = -1;
    var steps = n * n * 24;

    for (var s = 0; s < steps; s++) {
      var r = Math.floor(emptyIdx / n);
      var c = emptyIdx % n;
      var neighbors = [];
      if (r > 0) neighbors.push(emptyIdx - n);
      if (r < n - 1) neighbors.push(emptyIdx + n);
      if (c > 0) neighbors.push(emptyIdx - 1);
      if (c < n - 1) neighbors.push(emptyIdx + 1);

      var filtered = neighbors.filter(function (idx) { return idx !== lastIdx; });
      var pick = filtered[Math.floor(Math.random() * filtered.length)];
      arr[emptyIdx] = arr[pick];
      arr[pick] = 0;
      lastIdx = emptyIdx;
      emptyIdx = pick;
    }

    if (isSolvedArray(arr)) {
      return generateSolvableBoard(n);
    }
    return arr;
  }

  function isSolvedArray(arr) {
    for (var i = 0; i < arr.length - 1; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return arr[arr.length - 1] === 0;
  }

  function renderBoard() {
    boardEl.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
    boardEl.style.gridTemplateRows = 'repeat(' + size + ', 1fr)';
    boardEl.innerHTML = '';

    tiles.forEach(function (val, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      if (val === 0) {
        btn.className = 'puzzle-tile empty';
        btn.disabled = true;
        btn.setAttribute('aria-label', 'Empty space');
      } else {
        var isCorrect = val === idx + 1;
        btn.className = 'puzzle-tile' + (isCorrect ? ' correct' : '');
        btn.textContent = String(val);
        btn.setAttribute('aria-label', 'Tile ' + val);
        btn.addEventListener('click', function () {
          tryMove(idx);
        });
      }
      boardEl.appendChild(btn);
    });
  }

  function tryMove(tileIdx) {
    if (!active) return;
    var emptyIdx = tiles.indexOf(0);
    var tr = Math.floor(tileIdx / size);
    var tc = tileIdx % size;
    var er = Math.floor(emptyIdx / size);
    var ec = emptyIdx % size;

    if (Math.abs(tr - er) + Math.abs(tc - ec) !== 1) return;

    tiles[emptyIdx] = tiles[tileIdx];
    tiles[tileIdx] = 0;
    moves += 1;
    movesEl.textContent = moves;
    window.L9ithaSfx.click();
    renderBoard();

    if (isSolvedArray(tiles)) {
      active = false;
      stopTimer();
      var prevBest = Number(localStorage.getItem(bestKey()) || 0);
      if (!prevBest || moves < prevBest) {
        localStorage.setItem(bestKey(), String(moves));
      }
      loadBest();
      finalMovesEl.textContent = moves;
      finalTimeEl.textContent = formatTime(seconds);
      winOverlay.classList.remove('hidden');
      window.L9ithaSfx.win();
    }
  }

  function newGame() {
    size = Number(sizeSelect.value) || 4;
    tiles = generateSolvableBoard(size);
    moves = 0;
    seconds = 0;
    active = true;
    movesEl.textContent = '0';
    timeEl.textContent = '00:00';
    loadBest();
    startOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    renderBoard();
    startTimer();
  }

  window.addEventListener('keydown', function (e) {
    if (!active) return;
    var emptyIdx = tiles.indexOf(0);
    var er = Math.floor(emptyIdx / size);
    var ec = emptyIdx % size;
    var target = -1;

    if (e.key === 'ArrowUp' && er < size - 1) target = emptyIdx + size;
    else if (e.key === 'ArrowDown' && er > 0) target = emptyIdx - size;
    else if (e.key === 'ArrowLeft' && ec < size - 1) target = emptyIdx + 1;
    else if (e.key === 'ArrowRight' && ec > 0) target = emptyIdx - 1;

    if (target !== -1) {
      e.preventDefault();
      tryMove(target);
    }
  });

  startBtn.addEventListener('click', function () {
    window.L9ithaSfx.click();
    newGame();
  });
  restartBtn.addEventListener('click', function () {
    window.L9ithaSfx.click();
    newGame();
  });
  shuffleBtn.addEventListener('click', function () {
    window.L9ithaSfx.click();
    newGame();
  });
  sizeSelect.addEventListener('change', newGame);
  muteBtn.addEventListener('click', function () {
    window.L9ithaSfx.toggleMute(muteBtn);
  });

  // Initial preview render
  tiles = createSolvedTiles(size);
  loadBest();
  renderBoard();
})();
