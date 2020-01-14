const schedule = require("node-schedule");
const Games = require("../models/game");
const gameRouter = require("./game");

// 定时检查倒计时game的状态
schedule.scheduleJob("*/1 * * * * *", function() {
  countdownQuickGames();
});

async function countdownQuickGames() {
  const quickGames = await Games.find({
    quickMode: true,
    over: { $ne: true },
    lock: { $ne: true }
  }).exec();
  quickGames.forEach(game => handleQuickGame(game));
}

async function handleQuickGame(game) {
  const now = new Date().getTime();
  let { _id, lastStage } = game;
  if (!lastStage) {
    lastStage = {
      timeStamp: game.timeStamp,
      stage: 0
    };
  }
  const { timeStamp, stage } = lastStage;
  const realStage = handleStageByGame(game);
  // 若stage已经因为玩家提交而发生变化
  if (realStage !== stage) {
    lastStage.stage = realStage;
    lastStage.timeStamp = now;
    await Games.findOneAndUpdate(
      {
        _id
      },
      {
        lastStage,
      }
    );
    return;
  }
  const remainingTime =
    gameRouter.stageMap[stage].time - Math.floor((now - timeStamp) / 1000);
  // 已经超时
  if (remainingTime < 0) {
    lastStage.timeStamp = now;
    lastStage.stage = 1 - stage;

    const { activeBattle, battles } = game;
    const currentBattle = battles[activeBattle];
    // 超时的为加密阶段
    if (stage === 0) {
      currentBattle.questions.forEach((list, index) => {
        if (gameRouter.judgeEmpty(list)) {
          currentBattle.questions[index] = ["--已超时--", "--已超时--", "--已超时--"];
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
        _id
      },
      {
        lock: true
      }
    );
    await gameRouter.updateGameAfterSubmit(activeBattle, currentBattle, game);
    await Games.findOneAndUpdate(
      {
        _id
      },
      {
        lastStage,
        // 全部更新完毕后，解锁
        lock: false
      }
    );
  }
}

// 重新计算stage
function handleStageByGame(game) {
  const { activeBattle, battles } = game;
  const currentBattle = battles[activeBattle];
  const { questions } = currentBattle;
  const jiamiFull = questions.every(list => !gameRouter.judgeEmpty(list));
  if (jiamiFull) {
    return 1;
  }
  return 0;
}
