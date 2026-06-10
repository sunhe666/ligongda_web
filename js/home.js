// 首页交互逻辑
(function() {
  var selectedTeamSize = 5;
  var selectedGameType = 'tug-of-war';
  var userName = localStorage.getItem('userName') || '';

  // DOM 元素
  var nickInput = document.getElementById('nickInput');
  var createModal = document.getElementById('createModal');
  var joinModal = document.getElementById('joinModal');
  var closeCreateModal = document.getElementById('closeCreateModal');
  var closeJoinModal = document.getElementById('closeJoinModal');
  var createBtn = document.getElementById('createBtn');
  var joinBtn = document.getElementById('joinBtn');
  var createRoomBtn = document.getElementById('createRoomBtn');
  var joinRoomBtn = document.getElementById('joinRoomBtn');
  var roomNameInput = document.getElementById('roomNameInput');
  var roomIdInput = document.getElementById('roomIdInput');
  var roomPwdInput = document.getElementById('roomPwdInput');
  var joinPwdInput = document.getElementById('joinPwdInput');
  var onlineCount = document.getElementById('onlineCount');
  var numBtns = document.querySelectorAll('.num-btn');
  var gameTypeBtns = document.querySelectorAll('.game-type-btn');
  var selectedSizeSpan = document.querySelector('.selected-size');
  var tugOfWarCard = document.getElementById('tugOfWarCard');

  // 初始化
  function init() {
    // 设置昵称
    if (userName) {
      nickInput.value = userName;
      roomNameInput.value = userName + '的房间';
    }

    // 保存昵称
    nickInput.addEventListener('blur', function() {
      localStorage.setItem('userName', nickInput.value.trim());
      userName = nickInput.value.trim();
    });

    // 绑定事件
    bindEvents();

    // 先设置网络监听器（确保在连接建立前就注册好事件）
    setupNetworkListeners();

    // 连接服务器
    Network.connect(GameConfig.WS_URL);

    // 检查URL中的roomId参数，自动加入房间
    checkAutoJoinRoom();
  }

  // 检查URL参数，自动加入房间
  function checkAutoJoinRoom() {
    var urlParams = new URLSearchParams(window.location.search);
    var roomId = urlParams.get('roomId');
    
    console.log('[DEBUG] URL roomId:', roomId);
    
    if (roomId) {
      // 获取昵称
      var nick = nickInput.value.trim() || localStorage.getItem('userName') || '玩家' + Math.random().toString(36).substr(2, 4);
      localStorage.setItem('userName', nick);
      nickInput.value = nick;
      
      // 保存roomId以便在连接建立后使用
      localStorage.setItem('pendingRoomId', roomId);
      console.log('[DEBUG] pendingRoomId saved:', roomId);
      
      // 如果已经连接，立即加入房间
      if (Network.isConnected()) {
        console.log('[DEBUG] Already connected, joining room:', roomId);
        doAutoJoinRoom(roomId, nick);
      } else {
        console.log('[DEBUG] Not connected yet, waiting for connection...');
      }
      
      // 移除URL参数，避免重复处理
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // 自动加入房间
  function doAutoJoinRoom(roomId, nick) {
    Network.send('join_room', {
      userId: getUserId(),
      nickName: nick,
      roomId: roomId
    });
    localStorage.removeItem('pendingRoomId');
  }

  // 绑定事件
  function bindEvents() {
    // 创建房间按钮
    createBtn.addEventListener('click', function() {
      showCreateModal();
    });

    // 加入房间按钮
    joinBtn.addEventListener('click', function() {
      showJoinModal();
    });

    // 关闭创建房间弹窗
    closeCreateModal.addEventListener('click', function() {
      hideCreateModal();
    });

    // 关闭加入房间弹窗
    closeJoinModal.addEventListener('click', function() {
      hideJoinModal();
    });

    // 创建房间
    createRoomBtn.addEventListener('click', function() {
      doCreateRoom();
    });

    // 加入房间
    joinRoomBtn.addEventListener('click', function() {
      doJoinRoom();
    });

    // 人数选择按钮
    numBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        selectTeamSize(parseInt(btn.textContent));
      });
    });

    // 游戏类型选择按钮
    gameTypeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        selectGameType(btn.dataset.game);
      });
    });

    // 游戏卡片点击
    tugOfWarCard.addEventListener('click', function() {
      showCreateModal();
    });
  }

  // 设置网络监听器
  function setupNetworkListeners() {
    Network.on('connected', function() {
      console.log('Connected to server');
      
      // 检查是否有待处理的房间加入请求
      var pendingRoomId = localStorage.getItem('pendingRoomId');
      console.log('[DEBUG] pendingRoomId on connected:', pendingRoomId);
      
      if (pendingRoomId) {
        var nick = nickInput.value.trim() || localStorage.getItem('userName') || '玩家' + Math.random().toString(36).substr(2, 4);
        console.log('[DEBUG] Auto joining room:', pendingRoomId, 'with nick:', nick);
        doAutoJoinRoom(pendingRoomId, nick);
      }
    });

    Network.on('disconnected', function() {
      console.log('Disconnected from server');
    });

    Network.on('online_count', function(data) {
      if (onlineCount) {
        onlineCount.textContent = data.count;
      }
    });

    Network.on('room_joined', function(data) {
      console.log('Room joined:', data);
      
      // 判断是从创建还是加入进入的
      if (createModal.classList.contains('show')) {
        hideCreateModal();
      }
      if (joinModal.classList.contains('show')) {
        hideJoinModal();
      }
      
      window.location.href = 'room.html?roomId=' + data.roomId;
    });

    Network.on('error', function(err) {
      alert(err.message || '操作失败');
    });

    Network.on('connection_error', function(err) {
      console.error('[DEBUG] Connection error:', err);
      alert(err.message || '无法连接到服务器，请确认与房主在同一网络');
    });
  }

  // 显示创建房间弹窗
  function showCreateModal() {
    createModal.classList.add('show');
  }

  // 隐藏创建房间弹窗
  function hideCreateModal() {
    createModal.classList.remove('show');
  }

  // 显示加入房间弹窗
  function showJoinModal() {
    joinModal.classList.add('show');
  }

  // 隐藏加入房间弹窗
  function hideJoinModal() {
    joinModal.classList.remove('show');
  }

  // 选择队伍人数
  function selectTeamSize(size) {
    selectedTeamSize = size;
    selectedSizeSpan.textContent = size + '人';
    
    // 更新按钮状态
    numBtns.forEach(function(btn) {
      btn.classList.remove('active');
      if (parseInt(btn.textContent) === size) {
        btn.classList.add('active');
      }
    });
  }

  // 选择游戏类型
  function selectGameType(type) {
    selectedGameType = type;
    
    // 更新按钮状态
    gameTypeBtns.forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.dataset.game === type) {
        btn.classList.add('active');
      }
    });
  }

  // 创建房间
  function doCreateRoom() {
    var nick = nickInput.value.trim();
    if (!nick) {
      alert('请先设置你的昵称！');
      return;
    }

    var roomName = roomNameInput.value.trim();
    var password = roomPwdInput.value.trim();

    Network.send('create_room', {
      userId: getUserId(),
      nickName: nick,
      roomName: roomName || undefined,
      teamSize: selectedTeamSize,
      gameType: selectedGameType,
      password: password || undefined
    });
  }

  // 加入房间
  function doJoinRoom() {
    var nick = nickInput.value.trim();
    if (!nick) {
      alert('请先设置你的昵称！');
      return;
    }

    var roomId = roomIdInput.value.trim();
    if (!roomId) {
      alert('请输入房间ID！');
      return;
    }

    var password = joinPwdInput.value.trim();

    Network.send('join_room', {
      userId: getUserId(),
      nickName: nick,
      roomId: roomId,
      password: password || undefined
    });
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