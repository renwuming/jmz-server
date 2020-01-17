const schedule = require("node-schedule");
const Games = require("../models/game");
const Rooms = require("../models/room");
const gameRouter = require("./game");

schedule.scheduleJob("*/1 * * * * *", function() {
  // 定时检查倒计时game的状态
  countdownQuickGames();
  // 定时检查room的game是否over
  checkRoomIsOver();
});

async function countdownQuickGames() {
  const quickGames = await Games.find(
    {
      quickMode: true,
      over: { $ne: true },
      lock: { $ne: true }
    },
    { lastStage: 1, activeBattle: 1, battles: 1, timeStamp: 1 }
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
      first: true // 第一个阶段
    };
  }
  const { timeStamp, stage, first } = lastStage;
  const realStage = handleStageByGame(game);
  // 若stage已经因为玩家提交而发生变化
  if (realStage !== stage) {
    lastStage.stage = realStage;
    lastStage.timeStamp = now;
    lastStage.first = false;
    await Games.findOneAndUpdate(
      {
        _id
      },
      {
        lastStage
      }
    );
    return;
  }
  let remainingTime =
    gameRouter.stageMap[stage].time - Math.floor((now - timeStamp) / 1000);
  // if (first) remainingTime += 120; // 第一个阶段加时120s
  // 已经超时
  if (remainingTime < -2) {
    const { activeBattle, battles } = game;
    const currentBattle = battles[activeBattle];
    // 超时的为加密阶段
    if (stage === 0) {
      currentBattle.questions.forEach((list, index) => {
        if (gameRouter.judgeEmpty(list)) {
          currentBattle.questions[index] = ["【超时】", "【超时】", "【超时】"];
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
        _id
      },
      {
        lock: true
      }
    );
    await gameRouter.updateGameAfterSubmit(activeBattle, currentBattle, game);
    // 更新lastStage
    const newGame = await Games.findOne(
      {
        _id
      },
      { activeBattle: 1, battles: 1 }
    );
    lastStage.timeStamp = now;
    lastStage.stage = handleStageByGame(newGame);
    lastStage.first = false;
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

async function checkRoomIsOver() {
  const roomList = await Rooms.find(
    {
      over: { $ne: true },
      activeGame: { $exists: true }
    },
    {
      activeGame: 1
    }
  );
  roomList.forEach(async room => {
    const { activeGame, _id } = room;
    const game = await Games.findOne({
      _id: activeGame
    });
    if (!game) {
      await Rooms.findOneAndUpdate(
        {
          _id
        },
        {
          activeGame: null,
          over: false
        }
      );
    } else if (game.over) {
      await Rooms.findOneAndUpdate(
        {
          _id
        },
        {
          over: true
        }
      );
    }
  });
}
