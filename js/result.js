// 结果页面逻辑
(function() {
  var gameData = null;

  // DOM 元素
  var resultIcon = document.getElementById('resultIcon');
  var resultTitle = document.getElementById('resultTitle');
  var resultDesc = document.getElementById('resultDesc');
  var teamAScore = document.getElementById('teamAScore');
  var teamBScore = document.getElementById('teamBScore');
  var gameDuration = document.getElementById('gameDuration');
  var backBtn = document.getElementById('backBtn');
  var replayBtn = document.getElementById('replayBtn');

  // 初始化
  function init() {
    // 获取游戏结果数据
    var params = new URLSearchParams(window.location.search);
    var dataStr = params.get('data');
    
    if (dataStr) {
      try {
        gameData = JSON.parse(decodeURIComponent(dataStr));
      } catch (e) {
        console.error('Failed to parse game data:', e);
      }
    }

    // 更新显示
    updateResultDisplay();

    // 绑定事件
    bindEvents();
  }

  // 更新结果显示
  function updateResultDisplay() {
    if (!gameData) {
      return;
    }

    // 设置分数
    teamAScore.textContent = gameData.teamAScore || 0;
    teamBScore.textContent = gameData.teamBScore || 0;
    gameDuration.textContent = (gameData.duration || 30) + '秒';

    // 判断结果
    var winner = gameData.winner;
    var isTie = gameData.tie;

    if (isTie) {
      resultIcon.textContent = '🤝';
      resultTitle.textContent = '平局！';
      resultDesc.textContent = '双方势均力敌，再来一局吧！';
    } else if (winner === 'A') {
      resultIcon.textContent = '🏆';
      resultTitle.textContent = 'A队获胜！';
      resultDesc.textContent = '恭喜A队赢得比赛！';
    } else if (winner === 'B') {
      resultIcon.textContent = '🏆';
      resultTitle.textContent = 'B队获胜！';
      resultDesc.textContent = '恭喜B队赢得比赛！';
    }
  }

  // 绑定事件
  function bindEvents() {
    // 返回首页
    backBtn.addEventListener('click', function() {
      window.location.href = 'index.html';
    });

    // 再来一局
    replayBtn.addEventListener('click', function() {
      window.location.href = 'index.html';
    });
  }

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', init);
})();