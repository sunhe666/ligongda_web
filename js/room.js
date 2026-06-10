// 房间页面逻辑
(function() {
  var roomId = '';
  var isReady = false;
  var isOwner = false;
  var teamAPlayers = [];
  var teamBPlayers = [];

  // DOM 元素
  var roomTitle = document.getElementById('roomTitle');
  var roomIdEl = document.getElementById('roomId');
  var roomGameTypeEl = document.getElementById('roomGameType');
  var leaveBtn = document.getElementById('leaveBtn');
  var inviteBtn = document.getElementById('inviteBtn');
  var startBtn = document.getElementById('startBtn');
  var readyBtn = document.getElementById('readyBtn');
  var teamAPlayersEl = document.getElementById('teamAPlayers');
  var teamBPlayersEl = document.getElementById('teamBPlayers');
  
  // 邀请弹窗元素
  var inviteModal = document.getElementById('inviteModal');
  var closeInviteModal = document.getElementById('closeInviteModal');
  var qrcodeImg = document.getElementById('qrcodeImg');
  var copyRoomIdEl = document.getElementById('copyRoomId');
  var copyBtn = document.getElementById('copyBtn');
  var roomLinkEl = document.getElementById('roomLink');
  var copyLinkBtn = document.getElementById('copyLinkBtn');
  var shareBtn = document.getElementById('shareBtn');

  // 初始化
  function init() {
    // 获取房间ID
    var params = new URLSearchParams(window.location.search);
    roomId = params.get('roomId');
    
    if (!roomId) {
      alert('房间ID无效');
      setTimeout(function() {
        window.location.href = 'index.html';
      }, 1000);
      return;
    }

    // 设置房间ID显示
    roomIdEl.textContent = roomId;

    // 绑定事件
    bindEvents();

    // 先设置网络监听器（确保在连接建立前就注册好事件）
    setupNetworkListeners();

    // 连接服务器
    Network.connect(GameConfig.WS_URL);
  }

  // 绑定事件
  function bindEvents() {
    // 离开按钮
    leaveBtn.addEventListener('click', function() {
      if (confirm('确定要离开房间吗？')) {
        leaveRoom();
      }
    });

    // 邀请按钮
    inviteBtn.addEventListener('click', function() {
      showInviteModal();
    });

    // 关闭邀请弹窗
    closeInviteModal.addEventListener('click', function() {
      hideInviteModal();
    });

    // 复制房间ID
    copyBtn.addEventListener('click', function() {
      copyRoomId();
    });

    // 复制房间链接
    copyLinkBtn.addEventListener('click', function() {
      copyRoomLink();
    });

    // 分享按钮
    shareBtn.addEventListener('click', function() {
      shareToWechat();
    });

    // 开始按钮
    startBtn.addEventListener('click', function() {
      startGame();
    });

    // 准备按钮
    readyBtn.addEventListener('click', function() {
      toggleReady();
    });
  }

  // 设置网络监听器
  function setupNetworkListeners() {
    Network.on('connected', function() {
      console.log('[DEBUG] Connected to server, joining room:', roomId);
      // 延迟一点加入，确保连接稳定
      setTimeout(function() {
        joinRoom();
      }, 100);
    });

    Network.on('disconnected', function() {
      console.log('Disconnected from server');
    });

    Network.on('room_info', function(data) {
      console.log('Room info:', data);
      updateRoomInfo(data);
    });

    Network.on('room_joined', function(data) {
      console.log('[DEBUG] Successfully joined room:', data);
      updateRoomInfo(data);
    });

    Network.on('player_joined', function(data) {
      console.log('Player joined:', data);
      // 触发房间信息更新
      Network.send('get_room_info', { roomId: roomId });
    });

    Network.on('player_left', function(data) {
      console.log('Player left:', data);
      // 触发房间信息更新
      Network.send('get_room_info', { roomId: roomId });
    });

    Network.on('player_ready', function(data) {
      console.log('Player ready:', data);
      // 触发房间信息更新
      Network.send('get_room_info', { roomId: roomId });
    });

    Network.on('room_updated', function(data) {
      console.log('Room updated:', data);
      if (data.teamAList && data.teamBList) {
        updatePlayerList(data.teamAList, data.teamBList);
      }
    });

    Network.on('game_start', function(data) {
      console.log('Game starting...');
      window.location.href = 'game.html?roomId=' + roomId;
    });

    Network.on('error', function(err) {
      console.error('[DEBUG] Error received:', err);
      alert(err.message || '操作失败');
    });

    Network.on('connection_error', function(err) {
      console.error('[DEBUG] Connection error:', err);
      alert(err.message || '无法连接到服务器，请确认与房主在同一网络');

    });
  }

  // 加入房间
  function joinRoom() {
    var userName = getUserName();
    var userId = getUserId();
    
    // 如果没有用户名，生成一个随机昵称
    if (!userName) {
      userName = '玩家' + Math.random().toString(36).substr(2, 4);
      localStorage.setItem('userName', userName);
    }
    
    console.log('[DEBUG] Sending join_room:', { roomId, userId, userName });
    
    Network.send('join_room', {
      userId: userId,
      nickName: userName,
      roomId: roomId
    });
  }

  // 离开房间
  function leaveRoom() {
    Network.send('leave_room', {
      userId: getUserId(),
      roomId: roomId
    });
    window.location.href = 'index.html';
  }

  // 更新房间信息
  function updateRoomInfo(data) {
    roomTitle.textContent = data.roomName || '未命名房间';
    // 兼容 isOwner 和 isHost 两种字段名
    isOwner = data.isOwner || data.isHost || false;

    // 显示游戏类型
    if (roomGameTypeEl && data.gameType) {
      var gameTypeMap = {
        'tug-of-war': '🤝 拔河比赛',
        'reaction': '⚡ 反应大比拼',
        'memory': '🧠 数字记忆王'
      };
      roomGameTypeEl.textContent = gameTypeMap[data.gameType] || ('🎮 ' + data.gameType);
    }
    
    // 只有房主才能看到开始按钮
    if (isOwner) {
      startBtn.style.display = 'block';
    } else {
      startBtn.style.display = 'none';
    }
  }

  // 更新玩家列表
  function updatePlayerList(teamA, teamB) {
    teamAPlayers = teamA || [];
    teamBPlayers = teamB || [];

    // 更新A队
    teamAPlayersEl.innerHTML = '';
    teamAPlayers.forEach(function(player) {
      var playerItem = createPlayerItem(player);
      teamAPlayersEl.appendChild(playerItem);
    });

    // 更新B队
    teamBPlayersEl.innerHTML = '';
    teamBPlayers.forEach(function(player) {
      var playerItem = createPlayerItem(player);
      teamBPlayersEl.appendChild(playerItem);
    });

    // 检查是否所有玩家都准备好
    checkAllReady();
  }

  // 创建玩家项
  function createPlayerItem(player) {
    var item = document.createElement('div');
    item.className = 'player-item';
    
    var avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    avatar.textContent = player.nickName ? player.nickName.charAt(0) : '?';
    
    var name = document.createElement('div');
    name.className = 'player-name';
    name.textContent = player.nickName || '匿名玩家';
    
    if (player.ready) {
      var badge = document.createElement('span');
      badge.className = 'ready-badge';
      badge.textContent = '已准备';
      item.appendChild(badge);
    }
    
    item.appendChild(avatar);
    item.appendChild(name);
    
    return item;
  }

  // 切换准备状态
  function toggleReady() {
    isReady = !isReady;
    
    Network.send('player_ready', {
      userId: getUserId(),
      roomId: roomId,
      ready: isReady
    });

    if (isReady) {
      readyBtn.textContent = '❌ 取消准备';
      readyBtn.style.background = '#2A2A5E';
    } else {
      readyBtn.textContent = '✅ 准备';
      readyBtn.style.background = '';
    }
  }

  // 检查是否所有玩家都准备好
  function checkAllReady() {
    var allReady = true;
    var allPlayers = teamAPlayers.concat(teamBPlayers);
    
    allPlayers.forEach(function(player) {
      if (!player.ready) {
        allReady = false;
      }
    });

    if (isOwner && allPlayers.length >= 2) {
      startBtn.disabled = !allReady;
      startBtn.textContent = allReady ? '🚀 开始游戏' : '⏰ 等待玩家...';
      if (allReady) {
        startBtn.style.background = 'linear-gradient(145deg, #00CC66, #00AA55)';
      } else {
        startBtn.style.background = '#2A2A5E';
      }
    }
  }

  // 开始游戏
  function startGame() {
    Network.send('start_game', {
      roomId: roomId
    });
  }

  // 显示邀请弹窗
  function showInviteModal() {
    console.log('[DEBUG] roomId in showInviteModal:', roomId);
    
    // 更新房间ID显示
    copyRoomIdEl.textContent = roomId;
    
    // 生成房间链接（直接跳转到房间页面）
    var roomLink = 'http://192.168.43.4:3000/room.html?roomId=' + roomId;
    console.log('[DEBUG] Generated roomLink:', roomLink);
    roomLinkEl.value = roomLink;
    
    // 生成二维码（使用QRCode API）
    generateQRCode(roomLink);
    
    inviteModal.classList.add('show');
  }

  // 生成二维码（使用API）
  function generateQRCode(text) {
    if (!qrcodeImg) return;
    
    // 使用草料二维码API
    var encodedText = encodeURIComponent(text);
    var qrcodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodedText;
    
    qrcodeImg.src = qrcodeUrl;
  }

  // 隐藏邀请弹窗
  function hideInviteModal() {
    inviteModal.classList.remove('show');
  }

  // 复制房间ID
  function copyRoomId() {
    navigator.clipboard.writeText(roomId).then(function() {
      alert('房间ID已复制！');
    }).catch(function(err) {
      console.error('复制失败:', err);
      // 降级方案
      copyTextFallback(roomId);
    });
  }

  // 复制房间链接
  function copyRoomLink() {
    var roomLink = 'http://192.168.43.4:3000/room.html?roomId=' + roomId;
    navigator.clipboard.writeText(roomLink).then(function() {
      alert('房间链接已复制！');
    }).catch(function(err) {
      console.error('复制失败:', err);
      // 降级方案
      copyTextFallback(roomLink);
    });
  }

  // 复制文本降级方案
  function copyTextFallback(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('已复制！');
    } catch (err) {
      alert('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
  }

  // 分享到微信
  function shareToWechat() {
    var roomLink = 'http://192.168.43.4:3000/room.html?roomId=' + roomId;
    var shareText = '快来一起玩拔河比赛！房间ID: ' + roomId + '\n' + roomLink;
    
    // 尝试使用 Web Share API
    if (navigator.share) {
      navigator.share({
        title: '微信小游戏大全 - 拔河比赛',
        text: shareText,
        url: roomLink
      }).catch(function(err) {
        console.log('分享取消:', err);
      });
    } else {
      // 降级方案：复制链接并提示
      navigator.clipboard.writeText(shareText).then(function() {
        alert('链接已复制，请打开微信粘贴分享给好友！');
      }).catch(function() {
        alert('请手动复制房间ID: ' + roomId + ' 和链接: ' + roomLink);
      });
    }
  }

  // 获取用户ID
  function getUserId() {
    var uid = localStorage.getItem('userId');
    if (!uid) {
      uid = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', uid);
    }
    return uid;
  }

  // 获取用户名称
  function getUserName() {
    return localStorage.getItem('userName') || '';
  }

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', init);
})();