// 拔河比赛 - 核心玩法（Web DeviceMotion + 角色展示）
window.PlayingScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function PlayingScene() { Phaser.Scene.call(this, { key: 'PlayingScene' }); },

  init: function(data) {
    console.log('[PlayingScene] init called - data:', data);
    this.initialState = data ? data.initialState : null;
    this.teamAPower = 0;
    this.teamBPower = 0;
    this.ropeOffset = 0;
    this.gameTimeLeft = GameConfig.GAME_DURATION;
    this.tapPower = 0;
    this.lastTapSend = 0;
    this.playerTapCount = 0;
    this.gameOver = false;
    console.log('[PlayingScene] init - gameOver initialized to:', this.gameOver);
    this.tapCombo = 0;
    this.lastTapTime = 0;
    this.teamSize = 5; // 默认队伍大小
    this.playerSprites = { A: [], B: [] }; // 确保 playerSprites 已初始化
  },

  create: function() {
    var self = this;
    var w = this.scale.width;
    var h = this.scale.height;
    var C = GameConfig.COLORS;

    this.cameras.main.setBackgroundColor('#0A0A1E');

    // ── 背景草地 ──
    var groundY = h * 0.62;
    var skyGrad = this.add.graphics();
    skyGrad.fillGradientStyle(0x0A0A1E, 0x0A0A1E, 0x1A1A3E, 0x1A1A3E);
    skyGrad.fillRect(0, 0, w, groundY);
    var ground = this.add.graphics();
    ground.fillStyle(0x1a3a1a, 1);
    ground.fillRect(0, groundY, w, h - groundY);
    // 中场线
    ground.fillStyle(0xFFFFFF, 0.3);
    ground.fillRect(w/2 - 1, groundY, 2, h - groundY);

    // ── 玩家角色（A队左侧） ──
    this.buildPlayerRow('A', 15, groundY - 75, this.teamSize);
    // ── 玩家角色（B队右侧） ──
    this.buildPlayerRow('B', w - 15, groundY - 75, this.teamSize);

    // ── 绳子 ──
    this.rope = new Rope(this, w/2, groundY - 25);

    // ── 顶部 UI ──
    var topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.4);
    topBar.fillRect(0, 0, w, 48);

    this.add.text(10, 10, 'A队', { fontSize: '14px', color: '#FF4757', fontStyle: 'bold' });
    this.teamAPowerText = this.add.text(10, 28, '力量: 0', { fontSize: '11px', color: '#FF4757' });
    this.add.text(w - 10, 10, 'B队', { fontSize: '14px', color: '#2ED573', fontStyle: 'bold' }).setOrigin(1, 0);
    this.teamBPowerText = this.add.text(w - 10, 28, '力量: 0', { fontSize: '11px', color: '#2ED573' }).setOrigin(1, 0);

    this.timerText = this.add.text(w/2, 16, GameConfig.GAME_DURATION + 's', {
      fontSize: '18px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);

    // ── 力量条 ──
    this.createPowerBar(10, 52, w/2 - 20, 'A');
    this.createPowerBar(w/2 + 10, 52, w/2 - 20, 'B');

    // ── 提示文字 ──
    var tipY = h - 55;
    this.powerText = this.add.text(w/2, tipY + 22, '', { fontSize: '11px', color: '#888' }).setOrigin(0.5);

    // ── 网络事件 ──
    console.log('[PlayingScene] setting up network listeners');
    Network.on('game_state', function(d) { self.onState(d); });
    Network.on('game_over', function(d) { self.onGameOver(d); });

    // ── 点击屏幕产生力量 ──
    this.setupTapPower();

    this.sendTimer = this.time.addEvent({ delay: 100, callback: function() { self.sendTap(); }, loop: true });

    if (this.initialState) { this.onState(this.initialState); }
    this.cameras.main.fadeIn(300, 15, 15, 35);
  },

  buildPlayerRow: function(teamId, x, baseY, count) {
    var color = teamId === 'A' ? '#FF4757' : '#2ED573';
    var emojis = teamId === 'A'
      ? ['🏃','💪','🏋️','🦾','🤾']
      : ['🏃','💪','🏋️','🦾','🤾'];

    for (var i = 0; i < count; i++) {
      var sy = baseY - i * 30;
      var dir = teamId === 'A' ? 1 : -1;

      // 小人 emoji
      var spr = this.add.text(x, sy, emojis[i % emojis.length], {
        fontSize: '20px'
      }).setOrigin(0.5);

      // 名字标签
      var nameTag = this.add.text(x + dir * 25, sy - 4, '', {
        fontSize: '8px', color: color, fontStyle: 'bold'
      }).setOrigin(teamId === 'A' ? 0 : 1, 0.5);

      this.playerSprites[teamId].push({ sprite: spr, nameTag: nameTag, y: sy });
    }
  },

  updatePlayerNames: function(teamId, players) {
    if (!this.playerSprites || !this.playerSprites[teamId]) return;
    var sprites = this.playerSprites[teamId];
    if (!players || !Array.isArray(players)) return;
    for (var i = 0; i < sprites.length; i++) {
      if (i < players.length) {
        sprites[i].nameTag.setText(players[i].nickName || '玩家');
        sprites[i].sprite.setAlpha(1);
      } else {
        sprites[i].nameTag.setText('');
        sprites[i].sprite.setAlpha(0.3);
      }
    }
  },

  createPowerBar: function(x, y, w, teamId) {
    var isA = teamId === 'A';
    var color = isA ? 0xFF4757 : 0x2ED573;

    var bg = this.add.graphics();
    bg.fillStyle(0x222244, 0.8);
    bg.fillRoundedRect(x, y, w, 6, 3);

    var fill = this.add.graphics();
    fill.fillStyle(color, 1);
    fill.fillRoundedRect(isA ? x : x+w, y, 0, 6, 3);

    if (isA) { this.barA = { fill: fill, x: x, y: y, w: w, h: 6 }; }
    else     { this.barB = { fill: fill, x: x, y: y, w: w, h: 6 }; }
  },

  updateBar: function(teamId, power) {
    var bar = teamId === 'A' ? this.barA : this.barB;
    if (!bar) return;
    var ratio = Math.min(1, power / 100);
    var fw = bar.w * ratio;
    bar.fill.clear();
    bar.fill.fillStyle(teamId === 'A' ? 0xFF4757 : 0x2ED573, 1);
    if (teamId === 'A') {
      bar.fill.fillRoundedRect(bar.x, bar.y, fw, bar.h, bar.h/2);
    } else {
      bar.fill.fillRoundedRect(bar.x + bar.w - fw, bar.y, fw, bar.h, bar.h/2);
    }
  },

  // 点击屏幕产生力量
  setupTapPower: function() {
    var self = this;

    console.log('[PlayingScene] setupTapPower - tap to generate power');

    // 创建点击提示文字
    var hint = this.add.text(this.scale.width/2, this.scale.height - 50, '👆 点击屏幕助力！', {
      fontSize: '16px', color: '#FFD700', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0.8);

    // 点击事件
    this.input.on('pointerdown', function(pointer) {
      if (self.gameOver) return;

      // 每次点击+1
      self.tapPower += 1;
      self.playerTapCount++;

      console.log('[PlayingScene] tap - count:', self.playerTapCount, 'power:', self.tapPower);

      // 显示点击反馈
      self.showTapFeedback(pointer.x, pointer.y, 1);

      // 震动反馈
      if (navigator.vibrate) navigator.vibrate(30);
    });
  },

  // 显示点击反馈效果
  showTapFeedback: function(x, y, power) {
    // 创建圆圈扩散效果
    var circle = this.add.circle(x, y, 20, 0xFFD700, 0.5);
    this.tweens.add({
      targets: circle,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: function() { circle.destroy(); }
    });

    // 显示力量数字
    var text = this.add.text(x, y - 30, '+' + power, {
      fontSize: '20px', color: '#FFD700', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 500,
      onComplete: function() { text.destroy(); }
    });
  },

  sendTap: function() {
    console.log('[PlayingScene] sendTap called - gameOver:', this.gameOver, 'tapPower:', this.tapPower);
    if (this.gameOver || this.tapPower <= 0) {
      return;
    }
    var now = Date.now();
    if (now - this.lastTapSend < 150) { // 发送间隔 150ms
      return;
    }
    this.lastTapSend = now;
    console.log('[PlayingScene] sending tap - power:', this.tapPower, 'userId:', getUserId());
    Network.send('tap', { power: this.tapPower, userId: getUserId() });
    this.tapPower = 0;
  },

  onState: function(data) {
    console.log('[PlayingScene] onState received - timeLeft:', data.timeLeft, 'gameOver:', this.gameOver);
    if (this.gameOver) {
      console.log('[PlayingScene] onState skipped - game already over');
      return;
    }

    if (data.ropeOffset !== undefined) {
      this.ropeOffset = data.ropeOffset;
      this.rope.update(data.ropeOffset, data.teamAPower||0, data.teamBPower||0, Date.now());
    }
    if (data.teamAPower !== undefined) { this.teamAPower = data.teamAPower; this.updateBar('A', data.teamAPower); this.teamAPowerText.setText('力量: ' + Math.round(data.teamAPower)); }
    if (data.teamBPower !== undefined) { this.teamBPower = data.teamBPower; this.updateBar('B', data.teamBPower); this.teamBPowerText.setText('力量: ' + Math.round(data.teamBPower)); }

    // 更新玩家列表
    if (data.teamAList) { this.updatePlayerNames('A', data.teamAList); }
    if (data.teamBList) { this.updatePlayerNames('B', data.teamBList); }

    if (data.timeLeft !== undefined) {
      this.gameTimeLeft = data.timeLeft;
      this.timerText.setText(data.timeLeft + 's');
      console.log('[PlayingScene] timeLeft updated to:', this.gameTimeLeft);
      if (data.timeLeft <= 10) {
        this.timerText.setColor(data.timeLeft % 2 === 0 ? '#FF4757' : '#FFD700');
      }
    }
  },

  onGameOver: function(data) {
    console.log('[PlayingScene] onGameOver received:', data, 'current gameOver:', this.gameOver);
    if (this.gameOver) {
      console.log('[PlayingScene] onGameOver already called, ignoring');
      return;
    }
    this.gameOver = true;
    if (navigator.vibrate) navigator.vibrate(100);

    var self = this;
    this.time.delayedCall(1800, function() {
      self.cleanup();
      self.scene.start('ResultScene', {
        winner: data.winner, tie: data.tie,
        mvp: data.mvp, mvpNickName: data.mvpNickName,
        teamAScore: data.teamAScore, teamBScore: data.teamBScore,
        playerTapCount: self.playerTapCount, playerPower: self.tapPower
      });
    });
    this.showResult(data.winner, data.tie);
  },

  showResult: function(winner, tie) {
    var w = this.scale.width, h = this.scale.height;
    var overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, w, h);

    var txt, clr;
    if (tie) { txt = '🤝 平局！'; clr = '#FFF'; }
    else if (winner === 'A') { txt = 'A队 获胜！🔴'; clr = '#FF4757'; }
    else { txt = 'B队 获胜！🟢'; clr = '#2ED573'; }

    var label = this.add.text(w/2, h/2, txt, {
      fontSize: '30px', color: clr, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(51).setScale(0);
    this.tweens.add({ targets: label, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });
  },

  cleanup: function() {
    Network.off('game_state'); Network.off('game_over');
    if (this.sendTimer) this.sendTimer.destroy();
  },

  shutdown: function() { this.cleanup(); }
});
