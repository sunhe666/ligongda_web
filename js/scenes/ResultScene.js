// 结算场景
window.ResultScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function ResultScene() { Phaser.Scene.call(this, { key: 'ResultScene' }); },

  init: function(data) {
    this.winner = data.winner || null;
    this.tie = data.tie || false;
    this.mvp = data.mvp || '';
    this.mvpNickName = data.mvpNickName || '';
    this.teamAScore = data.teamAScore || 0;
    this.teamBScore = data.teamBScore || 0;
    this.playerTapCount = data.playerTapCount || 0;
    this.playerPower = data.playerPower || 0;
    this.leaderboard = [];
    this.confetti = [];
  },

  create: function() {
    var self = this;
    var w = this.scale.width;
    var h = this.scale.height;
    var C = GameConfig.COLORS;

    this.cameras.main.setBackgroundColor(C.DARK);
    var bg = this.add.graphics();
    bg.fillStyle(0x0F0F23, 1);
    bg.fillRect(0, 0, w, h);

    // 胜负结果
    var txt, clr;
    if (this.tie) { txt = '🤝 平局！'; clr = '#FFFFFF'; }
    else if (this.winner === 'A') { txt = '🔴 A队 获胜！'; clr = C.TEAM_A; }
    else { txt = '🟢 B队 获胜！'; clr = C.TEAM_B; }

    var label = this.add.text(w/2, h*0.05, txt, { fontSize: '24px', color: clr, fontStyle: 'bold' })
      .setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: label, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });

    // 比分
    this.add.text(w/2, h*0.11, Math.round(this.teamAScore) + ' : ' + Math.round(this.teamBScore), {
      fontSize: '18px', color: '#FFF'
    }).setOrigin(0.5);

    // MVP
    if (this.mvpNickName) {
      this.add.text(w/2, h*0.15, '🏆 MVP: ' + this.mvpNickName, { fontSize: '13px', color: C.GOLD }).setOrigin(0.5);
    }

    // 个人数据
    var sy = h*0.19;
    var sg = this.add.graphics();
    sg.fillStyle(0x1A1A3E, 0.7);
    sg.fillRoundedRect(w*0.1, sy, w*0.8, 40, 8);
    this.add.text(w/2, sy+20, '你的点击: ' + this.playerTapCount + '次  |  力量: ' + this.playerPower, {
      fontSize: '12px', color: C.GRAY
    }).setOrigin(0.5);

    // 庆祝粒子
    if (!this.tie) { this.startConfetti(); }

    // 排行榜
    var ly = h*0.28;
    this.add.text(w/2, ly, '📊 历史排行榜', { fontSize: '15px', color: C.GOLD, fontStyle: 'bold' }).setOrigin(0.5);

    this.loadText = this.add.text(w/2, ly+35, '加载中...', { fontSize: '11px', color: C.GRAY }).setOrigin(0.5);
    this.leaderboardY = ly + 25;

    Network.getLeaderboard('tug-of-war', 30).then(function(data) {
      self.leaderboard = data || [];
      self.renderLeaderboard();
    }).catch(function() {
      if (self.loadText) self.loadText.setText('排行榜加载失败');
    });

    // 按钮
    var by = h*0.88;
    this.createBtn(w/2-85, by, '🔄 再来一局', '#FF4757', function() {
      self.scene.start('RoomScene', { gameId: 'tug-of-war' });
    });
    this.createBtn(w/2+85, by, '🏠 返回大厅', '#555555', function() {
      self.scene.start('LobbyScene');
    });

    this.cameras.main.fadeIn(400, 15, 15, 35);
  },

  createBtn: function(x, y, label, color, cb) {
    var g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.9);
    g.fillRoundedRect(x-70, y-18, 140, 36, 18);
    this.add.text(x, y, label, { fontSize: '12px', color: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.zone(x, y, 140, 36).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
  },

  renderLeaderboard: function() {
    var self = this;
    var w = this.scale.width;
    if (this.loadText) { this.loadText.destroy(); this.loadText = null; }

    var list = this.leaderboard.slice(0, 10);
    if (list.length === 0) {
      this.add.text(w/2, this.leaderboardY+30, '暂无记录', { fontSize: '11px', color: '#888' }).setOrigin(0.5);
      return;
    }

    var rowW = w * 0.85;
    var lx = (w - rowW) / 2;
    var rowH = 24;

    list.forEach(function(item, i) {
      var y = self.leaderboardY + 15 + i * rowH;
      var clr = item.tie ? '#FFF' : (item.winner === 'A' ? '#FF4757' : '#2ED573');
      var winner = item.tie ? '平局' : (item.winner === 'A' ? '🔴A' : '🟢B');
      var score = Math.round(item.teamAScore||0) + ':' + Math.round(item.teamBScore||0);

      if (i%2===0) {
        var g = self.add.graphics();
        g.fillStyle(0x1A1A3E, 0.3);
        g.fillRoundedRect(lx, y, rowW, rowH-2, 4);
      }
      self.add.text(lx+10, y+5, '#'+(i+1), { fontSize: '10px', color: '#FFF' });
      self.add.text(lx+35, y+5, winner, { fontSize: '10px', color: clr });
      self.add.text(lx+80, y+5, score, { fontSize: '10px', color: '#FFD700' });
      self.add.text(lx+rowW-10, y+5, item.mvpNickName||'-', { fontSize: '10px', color: '#888' }).setOrigin(1,0);
    });
  },

  startConfetti: function() {
    var self = this;
    var w = this.scale.width;
    var h = this.scale.height;
    var color = this.winner === 'A' ? '#FF4757' : '#2ED573';

    for (var i = 0; i < 40; i++) {
      this.confetti.push({
        x: Math.random()*w, y: -20 - Math.random()*h*0.5,
        vx: (Math.random()-0.5)*2, vy: 1+Math.random()*2,
        size: 3+Math.random()*6,
        color: i%3===0?'#FFD700':(i%3===1?color:'#FFFFFF'),
        rotation: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.1
      });
    }

    this.confettiGfx = this.add.graphics().setDepth(20);
    this.confettiTimer = this.time.addEvent({ delay: 33, callback: function() { self.renderConfetti(); }, loop: true });
  },

  renderConfetti: function() {
    var w = this.scale.width;
    var h = this.scale.height;
    this.confettiGfx.clear();
    for (var i = this.confetti.length-1; i >= 0; i--) {
      var p = this.confetti[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.rotation += p.rotSpeed;
      if (p.y > h+20) { this.confetti.splice(i,1); continue; }
      this.confettiGfx.fillStyle(Phaser.Display.Color.HexStringToColor(p.color).color, 0.8);
      this.confettiGfx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size*0.6);
    }
  },

  shutdown: function() {
    if (this.confettiTimer) { this.confettiTimer.destroy(); }
    this.confetti = [];
    SoundManager.stopAll();
  }
});
