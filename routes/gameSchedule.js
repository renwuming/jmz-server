const schedule = require("node-schedule");
const Games = require("../models/game");

// 每隔2s检查倒计时game的状态
schedule.scheduleJob("*/2 * * * * *", function() {
  countdownQuickGames();
});

async function countdownQuickGames() {
  const quickGames = await Games.find({
    quickMode: true
  }).exec();
  quickGames.forEach(game => handleQuickGame(game));
}

async function handleQuickGame(game) {
  const stageMap = {
    0: {
      name: "加密", // 加密阶段
      time: 120 // 单位s
    },
    1: {
      name: "解密/拦截", // 解密/拦截阶段
      time: 300 // 单位s
    }
  };
  let { _id, lastStage } = game;
  if (!lastStage) {
    lastStage = {
      timeStamp: game.timeStamp,
      stage: 0
    };
  }
  const { timeStamp, stage } = lastStage;
  const now = new Date().getTime();
  const remainingTime =
    stageMap[stage].time - Math.floor((now - timeStamp) / 1000);
  // 已经超时
  if (remainingTime < 0) {
    lastStage.timeStamp = now;
    lastStage.stage = 1 - stage;
    await Games.findOneAndUpdate({
        _id,
    }, {
        lastStage,
    })
  }
}
