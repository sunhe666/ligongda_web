// 音效管理 - 标准 Web Audio
window.SoundManager = (function() {
  var sounds = {};
  var sfxEnabled = true;
  var musicEnabled = true;

  function preload(key, path) {
    if (sounds[key]) return;
    try {
      sounds[key] = { path: path, audio: null };
    } catch(e) { console.warn('[Sound] 加载失败:', key); }
  }

  function play(key) {
    if (!sfxEnabled) return;
    var s = sounds[key];
    if (!s) return;
    try {
      if (!s.audio) s.audio = new Audio(s.path);
      s.audio.currentTime = 0;
      s.audio.play().catch(function(){});
    } catch(e) {}
  }

  function playMusic(key, loop) {
    if (!musicEnabled) return;
    var s = sounds[key];
    if (!s) return;
    try {
      if (!s.audio) { s.audio = new Audio(s.path); s.audio.loop = !!loop; }
      s.audio.play().catch(function(){});
    } catch(e) {}
  }

  function stopAll() {
    Object.keys(sounds).forEach(function(k) {
      if (sounds[k].audio) { try { sounds[k].audio.pause(); } catch(e) {} }
    });
  }

  function preloadGameSounds() {
    preload('countdown', 'assets/tug-of-war/audio/countdown.mp3');
    preload('go', 'assets/tug-of-war/audio/go.mp3');
    preload('tap', 'assets/tug-of-war/audio/shake.mp3');
    preload('intense', 'assets/tug-of-war/audio/intense.mp3');
    preload('victory', 'assets/tug-of-war/audio/victory.mp3');
    preload('defeat', 'assets/tug-of-war/audio/defeat.mp3');
    preload('bgm', 'assets/tug-of-war/audio/bgm.mp3');
  }

  return {
    preload: preload, play: play, playMusic: playMusic, stopAll: stopAll,
    preloadGameSounds: preloadGameSounds,
    set sfxEnabled(v) { sfxEnabled = v; },
    set musicEnabled(v) { musicEnabled = v; },
  };
})();
