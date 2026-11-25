(function (window) {
  'use strict';

  var audioCtx = null;
  var muted = false;

  try {
    muted = localStorage.getItem('l9itha_sfx_muted') === '1';
  } catch (e) {
    muted = false;
  }

  function ensureContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, volume, slideTo) {
    if (muted) return;
    var ctx = ensureContext();
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(volume || 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Ignore audio errors when autoplay blocked
    }
  }

  window.L9ithaSfx = {
    isMuted: function () {
      return muted;
    },
    toggleMute: function (btnEl) {
      muted = !muted;
      try {
        localStorage.setItem('l9itha_sfx_muted', muted ? '1' : '0');
      } catch (e) {}
      if (btnEl) {
        btnEl.textContent = muted ? 'Sound: Off' : 'Sound: On';
      }
      if (!muted) {
        this.click();
      }
      return muted;
    },
    syncButton: function (btnEl) {
      if (btnEl) {
        btnEl.textContent = muted ? 'Sound: Off' : 'Sound: On';
      }
    },
    click: function () {
      playTone(540, 0.06, 'triangle', 0.05);
    },
    score: function () {
      playTone(660, 0.09, 'sine', 0.07, 920);
    },
    bonus: function () {
      playTone(520, 0.08, 'sine', 0.08, 1040);
      setTimeout(function () {
        playTone(880, 0.12, 'triangle', 0.07, 1320);
      }, 65);
    },
    shoot: function () {
      playTone(760, 0.07, 'square', 0.035, 280);
    },
    hit: function () {
      playTone(180, 0.16, 'sawtooth', 0.08, 65);
    },
    jump: function () {
      playTone(320, 0.11, 'sine', 0.06, 620);
    },
    win: function () {
      playTone(523, 0.1, 'triangle', 0.07);
      setTimeout(function () { playTone(659, 0.1, 'triangle', 0.07); }, 90);
      setTimeout(function () { playTone(784, 0.18, 'triangle', 0.08); }, 180);
    },
    gameOver: function () {
      playTone(340, 0.14, 'sawtooth', 0.07, 220);
      setTimeout(function () { playTone(220, 0.22, 'sawtooth', 0.07, 110); }, 130);
    }
  };
})(window);
