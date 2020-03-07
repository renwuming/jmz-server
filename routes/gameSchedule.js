const schedule = require('node-schedule');
const Games = require('../models/game');
const Rooms = require('../models/room');
const gameRouter = require('./game');
const matchRouter = require('./onlineMatch');
const getCache = require('./cache');

// 匹配成功一段时间后，开始游戏
const MATCH_WAIT_TIME = 6 * 1000;

// 房间、游戏的过期时间为7天
const DEADLINE = 7 * 24 * 3600 * 1000;

schedule.scheduleJob('*/1 * * * * *', function() {
  // 定时检查倒计时game的状态
  countdownQuickGames();
  // 定时为在线匹配分组完成的玩家，启动游戏
  // handleMatchGroup();
});

schedule.scheduleJob('* * */1 * * *', function() {
  // 清理太久远的房间和游戏
  cleanOldRoomAndGame();
});

async function countdownQuickGames() {
  const quickGames = await Games.find(
    {
      quickMode: true,
      over: { $ne: true },
      lock: { $ne: true },
    },
    { lastStage: 1, activeBattle: 1, battles: 1, timeStamp: 1 },
  );
  quickGames.forEach(game => handleQuickGame(game));
}

async function handleQuickGame(game) {
  const now = new Date().getTime();
  let { _id, lastStage } = game;
  if (!lastStage) {
    lastStage = {
      timeStamp: game.timeStamp,
      stage: 0,
      first: true, // 第一个阶段
    };
  }
  const { timeStamp, stage } = lastStage;
  const realStage = gameRouter.handleStageByGame(game);
  // 若stage已经因为玩家提交而发生变化
  if (realStage !== stage) {
    lastStage.stage = realStage;
    lastStage.timeStamp = now;
    lastStage.first = false;
    await Games.findOneAndUpdate(
      {
        _id,
      },
      {
        lastStage,
      },
    );
    return;
  }
  let remainingTime =
    gameRouter.stageMap[stage].time - Math.floor((now - timeStamp) / 1000);
  // 已经超时
  if (remainingTime < -2) {
    const { activeBattle, battles } = game;
    const currentBattle = battles[activeBattle];
    // 超时的为加密阶段
    if (stage === 0) {
      currentBattle.questions.forEach((list, index) => {
        if (gameRouter.judgeEmpty(list)) {
          currentBattle.questions[index] = ['【超时】', '【超时】', '【超时】'];
          currentBattle.jiemiAnswers[index] = [4, 4, 4];
          currentBattle.lanjieAnswers[index] = [4, 4, 4];
        }
      });
    } else {
      // 超时的为解密/拦截阶段
      currentBattle.jiemiAnswers.forEach((list, index) => {
        if (gameRouter.judgeEmpty(list)) {
          currentBattle.jiemiAnswers[index] = [4, 4, 4];
        }
      });
      if (activeBattle > 0) {
        currentBattle.lanjieAnswers.forEach((list, index) => {
          if (gameRouter.judgeEmpty(list)) {
            currentBattle.lanjieAnswers[index] = [4, 4, 4];
          }
        });
      }
    }
    // 先为此game上锁
    await Games.findOneAndUpdate(
      {
        _id,
      },
      {
        lock: true,
      },
    );
    await gameRouter.updateGameAfterSubmit(activeBattle, currentBattle, game);
    // 更新lastStage
    const newGame = await Games.findOne(
      {
        _id,
      },
      { activeBattle: 1, battles: 1 },
    );
    lastStage.timeStamp = now;
    lastStage.stage = gameRouter.handleStageByGame(newGame);
    lastStage.first = false;
    await Games.findOneAndUpdate(
      {
        _id,
      },
      {
        lastStage,
        // 全部更新完毕后，解锁
        lock: false,
      },
    );
  }
}

async function cleanOldRoomAndGame() {
  const deadLine = new Date().getTime() - DEADLINE;

  await Rooms.remove({
    over: { $ne: true },
    timeStamp: { $lt: deadLine },
  });
  await Games.remove({
    over: { $ne: true },
    timeStamp: { $lt: deadLine },
  });
}

async function handleMatchGroup() {
  const cache = getCache();
  const GroupPool = cache.get('groupPool') || [];
  const FullList = GroupPool.filter(
    item => item.list && item.list.length >= matchRouter.SuccessLength,
  );
  FullList.forEach(async group => {
    const now = new Date().getTime();
    const { groupIndex, startTime } = group;
    // 检查group成员是否都心跳在线
    const result = checkGroupPlayers(group);
    if (!result) return;
    // 设置分组成功标志
    group.success = true;
    if (!startTime) {
      group.startTime = now + MATCH_WAIT_TIME;
    } else if (startTime < now) {
      const activeGame = await startGame(group);
      // 更新组内每个人的activeGame
      group.list.forEach(matchData => {
        const { userID } = matchData;
        cache.set(userID, {
          ...matchData,
          activeGame,
          timeStamp: 0,
          groupIndex: null,
        });
      });
      // 并解散该group
      group.list = [];
      group.success = false;
      group.startTime = null;
    }
    GroupPool[groupIndex] = group;
    cache.set('groupPool', GroupPool);
  });
}

async function startGame(group) {
  const userList = group.list.map(item => {
    const { _id } = item.userData;
    item.userData.id = _id;
    return item.userData;
  });
  const gameData = await gameRouter.gameInit(userList, true, true);
  const game = await Games.create(gameData);
  const activeGame = game._id;
  return activeGame;
}

function checkGroupPlayers(group) {
  const cache = getCache();
  let flag = true;
  const now = new Date().getTime();
  group.list.forEach(data => {
    const { userID } = data;
    const matchData = cache.get(userID);
    const { timeStamp } = matchData;
    // 已经有2.5s没有心跳
    if (now - timeStamp > 2500) {
      matchRouter.cancelMatch(userID);
      flag = false;
    }
  });

  return flag;
}
