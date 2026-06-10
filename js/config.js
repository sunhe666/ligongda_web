// 游戏配置 - 全局常量
// 后端服务器地址：本地开发自动使用当前页面 host，部署时可通过 localStorage 覆盖
// 设置方法: localStorage.setItem('BACKEND_HOST', 'your-server.onrender.com')
var BACKEND_HOST = localStorage.getItem('BACKEND_HOST') || location.host;
var isSecure = location.protocol === 'https:' || BACKEND_HOST.includes('.onrender.com');

window.GameConfig = {
  WS_URL: (isSecure ? 'wss://' : 'ws://') + BACKEND_HOST,
  API_URL: (isSecure ? 'https://' : 'http://') + BACKEND_HOST + '/api',
  SHARE_ORIGIN: (isSecure ? 'https://' : 'http://') + BACKEND_HOST,

  DESIGN_WIDTH: 375,
  DESIGN_HEIGHT: 667,

  COLORS: {
    PRIMARY: '#FF6B35',
    SECONDARY: '#004E89',
    BG_DARK: '#1A1A2E',
    BG_LIGHT: '#16213E',
    TEAM_A: '#FF4757',
    TEAM_B: '#2ED573',
    GOLD: '#FFD700',
    WHITE: '#FFFFFF',
    GRAY: '#888888',
    DARK: '#0F0F23',
  },

  // 点击参数
  TAP: {
    BASE_POWER: 15,         // 基础点击力量
    COMBO_BONUS: 2,         // 连击加成
    MAX_COMBO_BONUS: 20,    // 最大连击加成
    SEND_INTERVAL: 150,     // 发送间隔(ms)
  },

  // 游戏参数
  GAME_DURATION: 30,
  ROPE_MAX_OFFSET: 100,
};

// 共享工具函数
function getUserId() {
  if (!localStorage.getItem('game_uid')) {
    localStorage.setItem('game_uid', 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  }
  return localStorage.getItem('game_uid');
}

function getUserName() {
  if (!localStorage.getItem('game_name')) {
    var names = ['大力士','闪电侠','无敌手','旋风腿','铁臂王','弹簧人','暴风眼','金刚拳','飞毛腿','神射手'];
    localStorage.setItem('game_name', names[Math.floor(Math.random() * names.length)]);
  }
  return localStorage.getItem('game_name');
}
