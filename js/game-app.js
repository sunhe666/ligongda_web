// 游戏页面应用 - 支持多游戏类型
(function() {
  var roomId = '';
  var gameType = '';
  var gameStartTime = 0;
  var gameDuration = 30;

  // DOM 元素
  var gameCanvas = document.getElementById('gameCanvas');

  // Phaser 游戏实例（仅拔河用）
  var game;

  // 初始化
  function init() {
    var params = new URLSearchParams(window.location.search);
    roomId = params.get('roomId');

    if (!roomId) {
      alert('房间ID无效');
      setTimeout(function() {
        window.location.href = 'index.html';
      }, 1000);
      return;
    }

    setupNetworkListeners();
    Network.connect(GameConfig.WS_URL);
  }

  // 设置网络监听器
  function setupNetworkListeners() {
    Network.on('connected', function() {
      console.log('Connected to server, joining room:', roomId);
      Network.send('join_room', {
        roomId: roomId,
        userId: getUserId(),
        nickName: getUserName(),
      });
    });

    Network.on('disconnected', function() {
      console.log('Disconnected from server');
    });

    // 加入房间成功后，根据游戏类型初始化
    Network.on('room_joined', function(data) {
      gameType = data.gameType || 'tug-of-war';
      console.log('Room joined, game type:', gameType);

      // 隐藏等待画面
      var waitingOverlay = document.getElementById('waitingOverlay');
      if (waitingOverlay) {
        waitingOverlay.style.display = 'none';
      }

      initGameByType();
    });

    // 游戏状态更新
    Network.on('game_state', function(data) {
      if (gameType === 'tug-of-war') {
        updateTugOfWarState(data);
      }
    });

    // 反应游戏轮次更新
    Network.on('reaction_round', function(data) {
      updateReactionUI(data);
    });

    // 反应游戏点击反馈
    Network.on('reaction_tap', function(data) {
      showReactionTap(data);
    });

    // 反应游戏轮次结果
    Network.on('reaction_round_result', function(data) {
      showReactionResult(data);
    });

    // 记忆游戏轮次更新
    Network.on('memory_round', function(data) {
      updateMemoryUI(data);
    });

    // 记忆游戏答案反馈
    Network.on('memory_answer', function(data) {
      showMemoryAnswer(data);
    });

    // 记忆游戏轮次结果
    Network.on('memory_round_result', function(data) {
      showMemoryResult(data);
    });

    // 你画我猜 - 轮次开始
    Network.on('drawguess_round', function(data) {
      handleDrawGuessRound(data);
    });

    // 你画我猜 - 画图数据
    Network.on('drawguess_draw', function(data) {
      handleDrawGuessDraw(data);
    });

    // 你画我猜 - 清空画布
    Network.on('drawguess_clear', function(data) {
      handleDrawGuessClear(data);
    });

    // 你画我猜 - 猜测记录
    Network.on('drawguess_attempt', function(data) {
      handleDrawGuessAttempt(data);
    });

    // 你画我猜 - 猜对了
    Network.on('drawguess_correct', function(data) {
      handleDrawGuessCorrect(data);
    });

    // 你画我猜 - 轮次结果
    Network.on('drawguess_round_result', function(data) {
      handleDrawGuessResult(data);
    });

    // 倒计时
    Network.on('game_starting', function(data) {
      var overlay = document.getElementById('countdownOverlay');
      var text = document.getElementById('countdownText');
      if (overlay && text) {
        overlay.style.display = 'flex';
        text.textContent = data.countdown;
      }
    });

    // 游戏开始
    Network.on('game_start', function(data) {
      var overlay = document.getElementById('countdownOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    });

    // 游戏结束
    Network.on('game_over', function(data) {
      console.log('Game over:', data);
      setTimeout(function() {
        window.location.href = 'result.html?roomId=' + roomId +
          '&data=' + encodeURIComponent(JSON.stringify(data));
      }, 1500);
    });

    Network.on('error', function(err) {
      console.error('Game error:', err);
    });
  }

  // 根据游戏类型初始化不同游戏
  function initGameByType() {
    var container = document.getElementById('gameContainer');
    if (!container) return;

    // 清空容器
    container.innerHTML = '';

    if (gameType === 'reaction') {
      initReactionGame(container);
    } else if (gameType === 'memory') {
      initMemoryGame(container);
    } else if (gameType === 'draw-guess') {
      initDrawGuessGame(container);
    } else {
      // 默认拔河
      initTugOfWarGame(container);
    }
  }

  // ==================== 拔河比赛 ====================
  function initTugOfWarGame(container) {
    // 显示 Canvas
    var canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.display = 'block';

    // 显示分数面板
    var scoreboard = document.getElementById('scoreboard');
    if (scoreboard) scoreboard.style.display = 'flex';

    // 显示点击提示
    var tapHint = document.getElementById('tapHint');
    if (tapHint) tapHint.style.display = 'block';

    createPhaserGame();
  }

  function createPhaserGame() {
    var config = {
      type: Phaser.CANVAS,
      width: window.innerWidth,
      height: window.innerHeight,
      canvas: document.getElementById('gameCanvas'),
      scene: {
        init: function() {
          this.roomId = roomId;
        },
        create: createTugOfWarScene,
        update: updateTugOfWarScene
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    game = new Phaser.Game(config);
  }

  function createTugOfWarScene() {
    var self = this;
    var w = this.scale.width;
    var h = this.scale.height;

    var bg = this.add.graphics();
    bg.fillStyle(0x0F0F23, 1);
    bg.fillRect(0, 0, w, h);

    var line = this.add.graphics();
    line.lineStyle(2, 0x444455, 0.5);
    line.beginPath();
    line.moveTo(w / 2, 0);
    line.lineTo(w / 2, h);
    line.strokePath();

    var teamABg = this.add.graphics();
    teamABg.fillStyle(0xFF6B35, 0.1);
    teamABg.fillRect(0, 0, w / 2, h);

    var teamBBg = this.add.graphics();
    teamBBg.fillStyle(0x4DA6FF, 0.1);
    teamBBg.fillRect(w / 2, 0, w / 2, h);

    this.rope = this.add.image(w / 2, h / 2, 'rope');
    this.rope.setScale(0.5);

    this.input.on('pointerdown', function(pointer) {
      Network.send('tap', {
        userId: getUserId(),
        roomId: roomId,
        power: 1
      });

      showTapFeedback(pointer.x, pointer.y);

      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    });

    createRopeTexture(this);
  }

  function createRopeTexture(scene) {
    var canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 60;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 400, 60);

    ctx.strokeStyle = '#6B3513';
    ctx.lineWidth = 2;
    for (var i = 0; i < 400; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 10);
      ctx.lineTo(i + 10, 30);
      ctx.lineTo(i, 50);
      ctx.stroke();
    }

    scene.textures.addCanvas('rope', canvas);
  }

  function showTapFeedback(x, y) {
    if (!game || !game.scene.scenes[0]) return;
    var scene = game.scene.scenes[0];

    var circle = scene.add.circle(x, y, 10, 0xFFD700, 0.8);
    scene.tweens.add({
      targets: circle,
      radius: 40,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: function() { circle.destroy(); }
    });

    var number = scene.add.text(x, y - 20, '+1', {
      fontSize: '20px',
      color: '#FFD700',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    scene.tweens.add({
      targets: number,
      y: y - 60,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: function() { number.destroy(); }
    });
  }

  function updateTugOfWarScene() {}

  function updateTugOfWarState(data) {
    var teamAPowerEl = document.getElementById('teamAPower');
    var teamBPowerEl = document.getElementById('teamBPower');
    var gameTimeEl = document.getElementById('gameTime');

    if (teamAPowerEl && data.teamAPower !== undefined) {
      teamAPowerEl.textContent = Math.round(data.teamAPower);
    }
    if (teamBPowerEl && data.teamBPower !== undefined) {
      teamBPowerEl.textContent = Math.round(data.teamBPower);
    }
    if (gameTimeEl && data.timeLeft !== undefined) {
      gameTimeEl.textContent = data.timeLeft;
    }

    // 更新绳子位置
    if (game && game.scene.scenes[0] && game.scene.scenes[0].rope && data.ropeOffset !== undefined) {
      var scene = game.scene.scenes[0];
      var centerX = scene.scale.width / 2;
      scene.rope.x = centerX + data.ropeOffset;
    }
  }

  // ==================== 反应大比拼（多人版） ====================
  function initReactionGame(container) {
    container.innerHTML = '' +
      '<div id="reactionGame" class="reaction-game">' +
      '  <div id="reactionPhase" class="reaction-phase">' +
      '    <div id="reactionSignal" class="reaction-signal">等待中...</div>' +
      '    <div id="reactionInfo" class="reaction-info">' +
      '      <div class="reaction-team">' +
      '        <span>🔴 A队: <strong id="reactionAScore">0</strong></span>' +
      '      </div>' +
      '      <div class="reaction-round">第 <strong id="reactionRound">1</strong>/5 轮</div>' +
      '      <div class="reaction-team">' +
      '        <span>🔵 B队: <strong id="reactionBScore">0</strong></span>' +
      '      </div>' +
      '    </div>' +
      '    <div id="reactionStatus" class="reaction-status"></div>' +
      '  </div>' +
      '  <button id="reactionTapBtn" class="reaction-tap-btn" disabled>等待变绿！</button>' +
      '</div>';

    var tapBtn = document.getElementById('reactionTapBtn');
    tapBtn.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      Network.send('tap', {
        userId: getUserId(),
        roomId: roomId,
        power: 1
      });
      if (navigator.vibrate) navigator.vibrate(30);
    });
  }

  function updateReactionUI(data) {
    var signal = document.getElementById('reactionSignal');
    var tapBtn = document.getElementById('reactionTapBtn');
    var roundEl = document.getElementById('reactionRound');
    var aScoreEl = document.getElementById('reactionAScore');
    var bScoreEl = document.getElementById('reactionBScore');
    var statusEl = document.getElementById('reactionStatus');

    if (roundEl) roundEl.textContent = data.round;
    if (aScoreEl) aScoreEl.textContent = data.teamAScore;
    if (bScoreEl) bScoreEl.textContent = data.teamBScore;
    if (statusEl) statusEl.textContent = '';

    if (data.phase === 'waiting') {
      if (signal) {
        signal.textContent = '🔴 等待绿色...';
        signal.className = 'reaction-signal red';
      }
      if (tapBtn) {
        tapBtn.disabled = true;
        tapBtn.textContent = '等待变绿！';
        tapBtn.className = 'reaction-tap-btn red';
      }
    } else if (data.phase === 'green_light') {
      if (signal) {
        signal.textContent = '🟢 任意队员快点击！';
        signal.className = 'reaction-signal green';
      }
      if (tapBtn) {
        tapBtn.disabled = false;
        tapBtn.textContent = '快点击！';
        tapBtn.className = 'reaction-tap-btn green';
      }
    }
  }

  function showReactionTap(data) {
    var statusEl = document.getElementById('reactionStatus');
    var tapBtn = document.getElementById('reactionTapBtn');
    if (tapBtn) tapBtn.disabled = true;

    if (data.earlyStart) {
      var teamLabel = data.teamId === 'A' ? '🔴 A队' : '🔵 B队';
      if (statusEl) statusEl.innerHTML = '⚠️ ' + teamLabel + ' <b>' + (data.nickName || '') + '</b> 抢跑了！';
    } else {
      var teamLabel = data.teamId === 'A' ? '🔴 A队' : '🔵 B队';
      var time = data.reactionTime || 0;
      if (statusEl) statusEl.innerHTML = '⚡ ' + teamLabel + ' <b>' + (data.nickName || '') + '</b> 点击了！用时 ' + time + 'ms';
    }
  }

  function showReactionResult(data) {
    var signal = document.getElementById('reactionSignal');
    var tapBtn = document.getElementById('reactionTapBtn');
    var statusEl = document.getElementById('reactionStatus');
    if (tapBtn) tapBtn.disabled = true;

    var msg = '';
    if (data.winner) {
      msg = (data.winner === 'A' ? '🔴 A队' : '🔵 B队') + '获胜！';
    } else {
      msg = '⚪ 平局（无人点击）';
    }

    if (signal) {
      signal.textContent = msg + ' (' + data.teamAScore + ':' + data.teamBScore + ')';
      signal.className = 'reaction-signal ' + (data.winner === 'A' ? 'red' : data.winner === 'B' ? 'blue' : '');
    }
    if (statusEl) {
      if (data.earlyStart) {
        statusEl.innerHTML = '⚠️ 因抢跑输掉本轮';
      }
    }
  }

  // ==================== 数字记忆王（多人版） ====================
  function initMemoryGame(container) {
    container.innerHTML = '' +
      '<div id="memoryGame" class="memory-game">' +
      '  <div id="memoryPhase" class="memory-phase">' +
      '    <div id="memoryNumber" class="memory-number"></div>' +
      '    <div id="memoryInfo" class="memory-info">' +
      '      <div class="memory-team">' +
      '        <span>🔴 A队: <strong id="memoryAScore">0</strong></span>' +
      '      </div>' +
      '      <div class="memory-round">第 <strong id="memoryRound">1</strong>/5 轮</div>' +
      '      <div class="memory-team">' +
      '        <span>🔵 B队: <strong id="memoryBScore">0</strong></span>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div id="memoryInputArea" class="memory-input-area" style="display:none;">' +
      '    <input type="number" id="memoryInput" class="memory-input" placeholder="输入数字..." pattern="[0-9]*">' +
      '    <button id="memorySubmit" class="memory-submit-btn">提交</button>' +
      '  </div>' +
      '  <div id="memoryStatus" class="memory-status"></div>' +
      '</div>';

    var input = document.getElementById('memoryInput');
    var submitBtn = document.getElementById('memorySubmit');

    submitBtn.addEventListener('click', function() {
      var val = input.value.trim();
      if (val !== '') {
        Network.send('memory_input', { input: val });
        input.value = '';
        // 不永久禁用，若答案还没被锁定，队友还能继续试
        input.focus();
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    });
  }

  function updateMemoryUI(data) {
    var numberEl = document.getElementById('memoryNumber');
    var roundEl = document.getElementById('memoryRound');
    var aScoreEl = document.getElementById('memoryAScore');
    var bScoreEl = document.getElementById('memoryBScore');
    var inputArea = document.getElementById('memoryInputArea');
    var statusEl = document.getElementById('memoryStatus');
    var inputEl = document.getElementById('memoryInput');
    var submitBtn = document.getElementById('memorySubmit');

    if (roundEl) roundEl.textContent = data.round;
    if (aScoreEl) aScoreEl.textContent = data.teamAScore;
    if (bScoreEl) bScoreEl.textContent = data.teamBScore;

    if (data.phase === 'show_number') {
      if (numberEl) {
        numberEl.textContent = data.number;
        numberEl.style.display = 'block';
      }
      if (inputArea) inputArea.style.display = 'none';
      if (statusEl) statusEl.textContent = '记住上面的数字！所有队员一起记！';
    } else if (data.phase === 'input') {
      if (numberEl) numberEl.style.display = 'none';
      if (inputArea) inputArea.style.display = 'flex';
      if (inputEl) { inputEl.disabled = false; inputEl.value = ''; }
      if (submitBtn) submitBtn.disabled = false;
      if (statusEl) statusEl.textContent = '请输入' + data.numberLength + '位数字（任意队员答对即获胜）';
    }
  }

  function showMemoryAnswer(data) {
    var statusEl = document.getElementById('memoryStatus');
    var teamLabel = data.teamId === 'A' ? '🔴 A队' : '🔵 B队';
    var nickLabel = data.nickName || '';
    if (statusEl) {
      statusEl.innerHTML = teamLabel + ' <b>' + nickLabel + '</b>: ' + data.input + (data.correct ? ' ✅ 答对了！' : ' ❌ 答错了');
    }
    // 本轮结束时禁用输入
    if (data.correct) {
      var inputEl = document.getElementById('memoryInput');
      var submitBtn = document.getElementById('memorySubmit');
      if (inputEl) inputEl.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
    }
  }

  function showMemoryResult(data) {
    var numberEl = document.getElementById('memoryNumber');
    var statusEl = document.getElementById('memoryStatus');
    var inputArea = document.getElementById('memoryInputArea');

    if (inputArea) inputArea.style.display = 'none';

    if (numberEl) {
      numberEl.textContent = '正确答案: ' + data.correctNumber + '';
      numberEl.style.display = 'block';
    }

    var msg = '';
    if (data.winner) {
      msg = (data.winner === 'A' ? '🔴 A队' : '🔵 B队') + '获胜！';
    } else {
      msg = '⚪ 平局（无人答对）';
    }

    if (statusEl) {
      statusEl.textContent = msg + ' (总分 ' + data.teamAScore + ':' + data.teamBScore + ')';
    }
  }

  // ==================== 你画我猜（多人版） ====================
  var drawCanvas = null;
  var drawCtx = null;
  var isDrawing = false;
  var isDrawer = false;
  var lastX = 0, lastY = 0;

  function initDrawGuessGame(container) {
    container.innerHTML = '' +
      '<div id="drawGuessGame" class="drawguess-game">' +
      '  <div class="drawguess-header">' +
      '    <div class="drawguess-score">' +
      '      <span class="score-a">🔴 A队: <strong id="dgAScore">0</strong></span>' +
      '      <span class="score-b">🔵 B队: <strong id="dgBScore">0</strong></span>' +
      '    </div>' +
      '    <div class="drawguess-round">第 <strong id="dgRound">1</strong>/5 轮</div>' +
      '    <div id="dgHint" class="drawguess-hint"></div>' +
      '  </div>' +
      '  <div id="dgWordDisplay" class="drawguess-word" style="display:none;"></div>' +
      '  <div class="drawguess-canvas-wrap">' +
      '    <canvas id="drawGuessCanvas" class="drawguess-canvas"></canvas>' +
      '    <div id="dgCanvasOverlay" class="drawguess-canvas-overlay" style="display:none;"></div>' +
      '  </div>' +
      '  <div id="dgToolbar" class="drawguess-toolbar" style="display:none;">' +
      '    <input type="color" id="dgColor" value="#000000">' +
      '    <select id="dgLineWidth">' +
      '      <option value="2">细</option>' +
      '      <option value="4" selected>中</option>' +
      '      <option value="8">粗</option>' +
      '    </select>' +
      '    <button id="dgClearBtn">清空</button>' +
      '  </div>' +
      '  <div class="drawguess-guess-area" id="dgGuessArea">' +
      '    <input type="text" id="dgGuessInput" class="drawguess-input" placeholder="输入你猜的词..." maxlength="10">' +
      '    <button id="dgGuessBtn">猜</button>' +
      '  </div>' +
      '  <div id="dgStatus" class="drawguess-status"></div>' +
      '</div>';

    // 初始化画布
    drawCanvas = document.getElementById('drawGuessCanvas');
    if (drawCanvas) {
      resizeCanvas();
      drawCtx = drawCanvas.getContext('2d');
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
    }

    window.addEventListener('resize', resizeCanvas);

    // 画图事件（仅画手可用）
    setupDrawEvents();

    // 工具栏
    var clearBtn = document.getElementById('dgClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (!isDrawer) return;
        clearLocalCanvas();
        Network.send('drawguess_clear', {});
      });
    }

    // 猜测
    var guessBtn = document.getElementById('dgGuessBtn');
    var guessInput = document.getElementById('dgGuessInput');
    if (guessBtn && guessInput) {
      guessBtn.addEventListener('click', function() {
        var guess = guessInput.value.trim();
        if (guess && !isDrawer) {
          Network.send('drawguess_guess', { guess: guess });
          guessInput.value = '';
        }
      });
      guessInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          guessBtn.click();
        }
      });
    }
  }

  function resizeCanvas() {
    if (!drawCanvas) return;
    var wrap = drawCanvas.parentElement;
    if (wrap) {
      var w = wrap.clientWidth;
      var h = Math.min(w * 0.7, window.innerHeight * 0.45);
      drawCanvas.width = w;
      drawCanvas.height = h;
    }
  }

  function setupDrawEvents() {
    if (!drawCanvas) return;

    function getPos(e) {
      var rect = drawCanvas.getBoundingClientRect();
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    drawCanvas.addEventListener('pointerdown', function(e) {
      if (!isDrawer) return;
      e.preventDefault();
      isDrawing = true;
      var pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
      drawCtx.beginPath();
      drawCtx.moveTo(lastX, lastY);
    });

    drawCanvas.addEventListener('pointermove', function(e) {
      if (!isDrawing || !isDrawer) return;
      e.preventDefault();
      var pos = getPos(e);
      drawLine(lastX, lastY, pos.x, pos.y);

      // 发送绘图数据
      Network.send('drawguess_draw', {
        x1: lastX, y1: lastY,
        x2: pos.x, y2: pos.y,
        color: document.getElementById('dgColor') ? document.getElementById('dgColor').value : '#000000',
        lineWidth: document.getElementById('dgLineWidth') ? parseInt(document.getElementById('dgLineWidth').value) : 4,
      });

      lastX = pos.x;
      lastY = pos.y;
    });

    drawCanvas.addEventListener('pointerup', function() {
      isDrawing = false;
    });

    drawCanvas.addEventListener('pointerleave', function() {
      isDrawing = false;
    });
  }

  function drawLine(x1, y1, x2, y2, color, lineWidth) {
    if (!drawCtx) return;
    drawCtx.strokeStyle = color || '#000000';
    drawCtx.lineWidth = lineWidth || 4;
    drawCtx.beginPath();
    drawCtx.moveTo(x1, y1);
    drawCtx.lineTo(x2, y2);
    drawCtx.stroke();
  }

  function clearLocalCanvas() {
    if (!drawCtx || !drawCanvas) return;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }

  function handleDrawGuessRound(data) {
    isDrawer = data.isDrawer;

    var roundEl = document.getElementById('dgRound');
    var aScore = document.getElementById('dgAScore');
    var bScore = document.getElementById('dgBScore');
    var hintEl = document.getElementById('dgHint');
    var wordDisplay = document.getElementById('dgWordDisplay');
    var toolbar = document.getElementById('dgToolbar');
    var overlay = document.getElementById('dgCanvasOverlay');
    var guessArea = document.getElementById('dgGuessArea');

    if (roundEl) roundEl.textContent = data.round;
    if (aScore) aScore.textContent = data.teamAScore;
    if (bScore) bScore.textContent = data.teamBScore;

    if (isDrawer) {
      // 画手：清空画布，显示工具栏和词语
      clearLocalCanvas();
      if (toolbar) toolbar.style.display = 'flex';
      if (wordDisplay) {
        wordDisplay.textContent = '🎨 请画: ' + data.word;
        wordDisplay.style.display = 'block';
      }
      if (hintEl) hintEl.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      if (guessArea) guessArea.style.display = 'none';
    } else {
      // 猜的人：显示覆盖层，隐藏工具栏
      if (toolbar) toolbar.style.display = 'none';
      if (wordDisplay) wordDisplay.style.display = 'none';
      if (hintEl) {
        hintEl.textContent = '🖌️ ' + data.drawerNickName + ' 正在画画 | ' + data.hint;
        hintEl.style.display = 'block';
      }
      if (overlay) overlay.style.display = 'none';
      if (guessArea) guessArea.style.display = 'flex';
    }
  }

  function handleDrawGuessDraw(data) {
    if (!drawCtx || !drawCanvas) return;
    drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.lineWidth);
  }

  function handleDrawGuessClear(data) {
    clearLocalCanvas();
  }

  function handleDrawGuessAttempt(data) {
    var statusEl = document.getElementById('dgStatus');
    if (statusEl) {
      var teamLabel = data.teamId === 'A' ? '🔴 A队' : '🔵 B队';
      var text = teamLabel + ' <b>' + data.nickName + '</b>: ' + data.guess;
      statusEl.innerHTML = text;
    }
  }

  function handleDrawGuessCorrect(data) {
    var statusEl = document.getElementById('dgStatus');
    var overlay = document.getElementById('dgCanvasOverlay');
    var guessArea = document.getElementById('dgGuessArea');

    if (overlay) {
      overlay.innerHTML = '🎉 ' + (data.teamId === 'A' ? '🔴 A队' : '🔵 B队') + ' <b>' + data.nickName + '</b> 猜对了！答案是: <b>' + data.word + '</b>';
      overlay.style.display = 'flex';
    }
    if (guessArea) guessArea.style.display = 'none';
    if (statusEl) statusEl.innerHTML = '';
  }

  function handleDrawGuessResult(data) {
    var statusEl = document.getElementById('dgStatus');
    var overlay = document.getElementById('dgCanvasOverlay');
    var guessArea = document.getElementById('dgGuessArea');

    if (overlay) {
      var msg = '';
      if (data.winner) {
        msg = (data.winner === 'A' ? '🔴 A队' : '🔵 B队') + ' 获胜！';
      } else {
        msg = '⏰ 时间到！无人猜对';
      }
      overlay.innerHTML = msg + '<br>答案: <b>' + data.correctWord + '</b>';
      overlay.style.display = 'flex';
    }
    if (guessArea) guessArea.style.display = 'none';
    if (statusEl) statusEl.textContent = '';
  }

  // ==================== 工具函数 ====================

  function getUserId() {
    var uid = localStorage.getItem('userId');
    if (!uid) {
      uid = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', uid);
    }
    return uid;
  }

  function getUserName() {
    return localStorage.getItem('userName') || ('玩家' + Math.random().toString(36).substr(2, 4));
  }

  document.addEventListener('DOMContentLoaded', init);
})();