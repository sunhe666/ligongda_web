// 网络通信模块 - 标准 WebSocket
window.Network = (function() {
  var ws = null;
  var callbacks = {};
  var connected = false;
  var reconnectTimer = null;
  var reconnectCount = 0;

  function connect(url) {
    url = url || GameConfig.WS_URL;
    try {
      ws = new WebSocket(url);
      ws.onopen = function() {
        console.log('[WS] 已连接');
        connected = true;
        reconnectCount = 0;
        emit('connected');
      };
      ws.onmessage = function(e) {
        try {
          var msg = JSON.parse(e.data);
          emit(msg.type, msg.payload || {});
        } catch(err) {
          console.warn('[WS] 消息解析失败');
        }
      };
      ws.onerror = function(err) {
        console.error('[WS] 连接错误');
        connected = false;
        emit('connection_error', { message: '无法连接到游戏服务器，请检查网络或服务器地址' });
      };
      ws.onclose = function() {
        console.log('[WS] 连接关闭');
        connected = false;
        emit('disconnected');
        scheduleReconnect(url);
      };
    } catch(e) {
      console.error('[WS] 连接异常:', e);
      scheduleReconnect(url);
    }
  }

  function scheduleReconnect(url) {
    if (reconnectTimer) return;
    if (reconnectCount >= 5) { emit('reconnect_failed'); return; }
    reconnectCount++;
    var delay = 2000 * Math.pow(1.5, reconnectCount - 1);
    console.log('[WS] ' + delay + 'ms 后重连...');
    reconnectTimer = setTimeout(function() {
      reconnectTimer = null;
      connect(url);
    }, delay);
  }

  function send(type, payload) {
    if (!connected || !ws) {
      console.log('[WS] send failed - not connected, connected:', connected, 'ws:', !!ws);
      return false;
    }
    try {
      var msg = JSON.stringify({ type: type, payload: payload || {} });
      console.log('[WS] sending message - type:', type, 'payload:', payload);
      ws.send(msg);
      return true;
    } catch(e) {
      console.error('[WS] send error:', e);
      return false;
    }
  }

  function on(event, cb) {
    if (!callbacks[event]) callbacks[event] = [];
    callbacks[event].push(cb);
  }

  function off(event, cb) {
    if (!callbacks[event]) return;
    if (!cb) { delete callbacks[event]; return; }
    callbacks[event] = callbacks[event].filter(function(f) { return f !== cb; });
  }

  function emit(event, data) {
    (callbacks[event] || []).forEach(function(cb) { try { cb(data); } catch(e) {} });
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    reconnectCount = 5;
    if (ws) { try { ws.close(); } catch(e) {} }
    connected = false;
    ws = null;
  }

  function isConnected() {
    return connected;
  }

  // HTTP 请求
  function http(method, path, data) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method || 'GET', GameConfig.API_URL + path);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res.success) { resolve(res.data); }
          else { reject(res.message || '请求失败'); }
        } catch(e) { reject('解析失败'); }
      };
      xhr.onerror = function() { reject('网络错误'); };
      xhr.send(data ? JSON.stringify(data) : undefined);
    });
  }

  function getLeaderboard(game, limit) {
    return http('GET', '/leaderboard?game=' + (game||'tug-of-war') + '&limit=' + (limit||50));
  }

  function getPlayerStats(userId) {
    return http('GET', '/leaderboard/stats?userId=' + userId);
  }

  return {
    connect: connect, send: send, on: on, off: off,
    disconnect: disconnect, http: http,
    getLeaderboard: getLeaderboard, getPlayerStats: getPlayerStats,
    get connected() { return connected; },
    isConnected: isConnected
  };
})();
