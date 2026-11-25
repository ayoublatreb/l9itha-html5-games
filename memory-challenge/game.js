(function () {
  'use strict';

  var SYMBOLS = [
    '◆', '▲', '●', '★', '✦', '⬡',
    '◈', '✚', '❖', '◩', '☀', '☾'
  ];

  var gridEl = document.getElementById('cardGrid');
  var scoreEl = document.getElementById('scoreEl');
  var movesEl = document.getElementById('movesEl');
  var pairsEl = document.getElementById('pairsEl');
  var timeEl = document.getElementById('timeEl');
  var diffSelect = document.getElementById('diffSelect');
  var muteBtn = document.getElementById('muteBtn');
  var resetBtn = document.getElementById('resetBtn');
  var startOverlay = document.getElementById('startOverlay');
  var winOverlay = document.getElementById('winOverlay');
  var finalScoreEl = document.getElementById('finalScoreEl');
  var finalMovesEl = document.getElementById('finalMovesEl');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');

  window.L9ithaSfx.syncButton(muteBtn);

  var totalPairs = 8;
  var deck = [];
  var flipped = [];
  var matchedCount = 0;
  var moves = 0;
  var score = 0;
  var streak = 0;
  var seconds = 0;
  var timerId = null;
  var locked = false;
  var active = false;

  function formatTime(sec) {
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
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

  function updateHud() {
    scoreEl.textContent = score;
    movesEl.textContent = moves;
    pairsEl.textContent = matchedCount + '/' + totalPairs;
    timeEl.textContent = formatTime(seconds);
  }

  function renderGrid() {
    var cols = totalPairs === 12 ? 6 : 4;
    gridEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    gridEl.innerHTML = '';

    deck.forEach(function (card, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mem-card';
      if (card.matched) btn.className += ' matched';
      else if (card.open) btn.className += ' flipped';

      btn.disabled = card.matched;
      btn.setAttribute('aria-label', card.open || card.matched ? 'Symbol ' + card.symbol : 'Hidden card ' + (idx + 1));

      if (card.open || card.matched) {
        btn.textContent = card.symbol;
      } else {
        var back = document.createElement('span');
        back.className = 'card-back';
        btn.appendChild(back);
      }

      btn.addEventListener('click', function () {
        flipCard(idx);
      });
      gridEl.appendChild(btn);
    });
  }

  function flipCard(idx) {
    if (!active || locked) return;
    var card = deck[idx];
    if (card.open || card.matched) return;

    card.open = true;
    flipped.push(idx);
    window.L9ithaSfx.click();
    renderGrid();

    if (flipped.length === 2) {
      moves += 1;
      locked = true;
      var a = deck[flipped[0]];
      var b = deck[flipped[1]];

      if (a.symbol === b.symbol) {
        a.matched = true;
        b.matched = true;
        matchedCount += 1;
        streak += 1;
        score += 100 * streak;
        flipped = [];
        locked = false;
        window.L9ithaSfx.bonus();
        updateHud();
        renderGrid();

        if (matchedCount === totalPairs) {
          active = false;
          stopTimer();
          var timeBonus = Math.max(0, 300 - seconds * 3);
          score += timeBonus;
          updateHud();
          finalScoreEl.textContent = score;
          finalMovesEl.textContent = moves;
          winOverlay.classList.remove('hidden');
          window.L9ithaSfx.win();
        }
      } else {
        streak = 0;
        updateHud();
        setTimeout(function () {
          a.open = false;
          b.open = false;
          flipped = [];
          locked = false;
          renderGrid();
        }, 650);
      }
    }
  }

  function startNewGame() {
    totalPairs = Number(diffSelect.value) || 8;
    var chosen = SYMBOLS.slice(0, totalPairs);
    deck = shuffle(chosen.concat(chosen)).map(function (sym) {
      return { symbol: sym, open: false, matched: false };
    });
    flipped = [];
    matchedCount = 0;
    moves = 0;
    score = 0;
    streak = 0;
    seconds = 0;
    locked = false;
    active = true;
    startOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    updateHud();
    renderGrid();
    startTimer();
  }

  startBtn.addEventListener('click', function () {
    window.L9ithaSfx.click();
    startNewGame();
  });
  restartBtn.addEventListener('click', function () {
    window.L9ithaSfx.click();
    startNewGame();
  });
  resetBtn.addEventListener('click', function () {
    window.L9ithaSfx.click();
    startNewGame();
  });
  diffSelect.addEventListener('change', startNewGame);
  muteBtn.addEventListener('click', function () {
    window.L9ithaSfx.toggleMute(muteBtn);
  });

  // Preview initial deck behind overlay
  totalPairs = 8;
  var initChosen = SYMBOLS.slice(0, totalPairs);
  deck = initChosen.concat(initChosen).map(function (sym) {
    return { symbol: sym, open: false, matched: false };
  });
  renderGrid();
})();
