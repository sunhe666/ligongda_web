// 绳子实体 - 拔河比赛核心视觉
var Rope = function(scene, x, y) {
  this.scene = scene;
  this.baseX = x;
  this.baseY = y;
  this.offset = 0;
  this.targetOffset = 0;
  this.wavePhase = 0;

  this.graphics = scene.add.graphics().setDepth(10);
  this.markerGfx = scene.add.graphics().setDepth(11);

  this.teamAText = scene.add.text(x - 90, y + 30, '◀ A队', {
    fontSize: '13px', fontFamily: 'Arial', color: '#FF4757'
  }).setOrigin(0.5).setDepth(11);

  this.teamBText = scene.add.text(x + 90, y + 30, 'B队 ▶', {
    fontSize: '13px', fontFamily: 'Arial', color: '#2ED573'
  }).setOrigin(0.5).setDepth(11);
};

Rope.prototype.update = function(offset, powerA, powerB, time) {
  this.targetOffset = Phaser.Math.Clamp(offset, -GameConfig.ROPE_MAX_OFFSET, GameConfig.ROPE_MAX_OFFSET);
  this.offset += (this.targetOffset - this.offset) * 0.15;
  this.wavePhase = time || Date.now();
  this.draw();
};

Rope.prototype.draw = function() {
  var g = this.graphics;
  var cx = this.baseX + this.offset;
  var len = 280;
  var sx = cx - len/2;
  var ex = cx + len/2;
  var y = this.baseY;

  g.clear();

  // 绳子
  g.lineStyle(8, 0xDEB887, 1);
  g.beginPath();
  for (var i = 0; i <= 20; i++) {
    var t = i / 20;
    var x = sx + t * len;
    var wy = y + Math.sin((t * 6 + this.wavePhase * 0.003) * Math.PI) * 2;
    if (i === 0) g.moveTo(x, wy); else g.lineTo(x, wy);
  }
  g.strokePath();

  // 中心标记
  var m = this.markerGfx;
  m.clear();
  m.fillStyle(0xFFD700, 1);
  m.beginPath();
  m.moveTo(cx, y - 8);
  m.lineTo(cx + 8, y);
  m.lineTo(cx, y + 8);
  m.lineTo(cx - 8, y);
  m.closePath();
  m.fillPath();

  this.teamAText.setX(cx - 90);
  this.teamBText.setX(cx + 90);
};

Rope.prototype.reset = function() {
  this.offset = 0;
  this.targetOffset = 0;
};

Rope.prototype.destroy = function() {
  this.graphics.destroy();
  this.markerGfx.destroy();
  this.teamAText.destroy();
  this.teamBText.destroy();
};

window.Rope = Rope;
