const router = require("koa-router")();
const Games = require("../models/game");
const { sessionUser } = require("./middleware");
const { msgListSecCheck } = require("./wxAuth");
const dictionary = require("./code");
let DEBUG_INDEX; // = 2; // todo

router.prefix("/games");

const stageMap = {
  0: {
    name: "加密", // 加密阶段
    time: 180 // 单位s
  },
  1: {
    name: "解密/拦截", // 解密/拦截阶段
    time: 180 // 单位s
  }
};

router.stageMap = stageMap;

async function getGame(ctx, next) {
  const { id } = ctx.params;
  try {
    let game = await Games.findOne({
      _id: id
    });
    ctx.state.game = game.toObject();
    await next();
  } catch (e) {
    console.error(e.toString());
    let error;
    if (!ctx.state.game) {
      error = "游戏ID不存在！";
    }
    ctx.body = {
      code: 500,
      error
    };
  }
}

const getGameData = async ctx => {
  const _id = ctx.state.user ? ctx.state.user._id : "";
  const game = ctx.state.game;
  const userList = game.userList.map(item => item.id.toString());
  let index = userList.indexOf(_id.toString());
  if (!isNaN(DEBUG_INDEX)) index = DEBUG_INDEX; // 用于debug
  let teamIndex = Math.floor(index / 2);
  if (teamIndex < 0) teamIndex = 0; // 此时为旁观者模式

  const { activeBattle, teams, over, battles, quickMode } = game;
  const battle = battles[activeBattle];
  const {
    desUsers,
    jiemiUsers,
    lanjieUsers,
    codes,
    questions,
    jiemiAnswers,
    lanjieAnswers
  } = battle;
  questionStrList = questions.map(question =>
    question ? question.map(str => str.replace(/\n|\s/g, "")) : ["", "", ""]
  );

  // 处理battle数据
  const battleData = {
    desUsers,
    jiemiUsers,
    lanjieUsers,
    jiamiStatus: questionStrList.map(e => !judgeEmpty(e)),
    jiemiStatus: jiemiAnswers.map(e => !judgeEmpty(e)),
    lanjieStatus: lanjieAnswers.map(e => !judgeEmpty(e)),
    codes: [
      [-1, -1, -1],
      [-1, -1, -1]
    ],
    type: ["等待", "等待"]
  };
  if (index >= 0) {
    // 若为加密者
    if (index === desUsers[teamIndex]) {
      // 获取本队的code
      battleData.codes[teamIndex] = codes[teamIndex];
      // 若尚未加密完成，则状态为加密中
      if (judgeEmpty(questions[teamIndex])) {
        battleData.type[teamIndex] = "加密";
      }
    }
    // 若为解密者
    if (index === jiemiUsers[teamIndex]) {
      // 若本队已加密，却未解密
      if (
        !judgeEmpty(questions[teamIndex]) &&
        judgeEmpty(jiemiAnswers[teamIndex])
      ) {
        battleData.type[teamIndex] = "解密";
      }
    }
    // 若为敌方队伍的拦截者
    if (index === lanjieUsers[1 - teamIndex]) {
      // 若敌方已加密，却未拦截
      if (
        !judgeEmpty(questions[1 - teamIndex]) &&
        judgeEmpty(lanjieAnswers[1 - teamIndex])
      ) {
        battleData.type[1 - teamIndex] = "拦截";
      }
    }
  }
  const battleList = battleData.codes.map((codes, teamIndex) => {
    const myQuestionStrList = questionStrList[teamIndex];
    return codes.map((code, index) => ({
      question: myQuestionStrList[index],
      code,
      answer: -1
    }));
  });

  const history1 = getWxGameHistory(battles.slice(0, -1), teamIndex);
  const history2 = getWxGameHistory(battles.slice(0, -1), 1 - teamIndex);
  const table1 = getHistoryTable(history1);
  const table2 = getHistoryTable(history2);
  const gameResult = handleSum(battles);
  const teamNames = teams.map(t => t.name);
  let { sumList, gameOver, winner, resultMap } = gameResult;
  if (gameOver && !over) {
    // 若游戏已结束，更新数据库
    await Games.findOneAndUpdate(
      {
        _id: game._id
      },
      {
        over: gameOver
      }
    );
  }
  if (over) gameOver = true; // 非正常情况，游戏被房主终止

  // 倒计时逻辑
  let countdownData = null;
  if (!gameOver && quickMode) {
    let { lastStage } = game;
    if (!lastStage) {
      lastStage = {
        timeStamp: game.timeStamp,
        stage: 0,
        first: true // 第一个阶段
      };
    }
    const { timeStamp, stage, first } = lastStage;
    const now = new Date().getTime();
    let remainingTime =
      stageMap[stage].time - Math.floor((now - timeStamp) / 1000);
    if (first) remainingTime += 120; // 第一个阶段加时120s
    countdownData = {
      time: remainingTime,
      name: stageMap[stage].name
    };
  }

  const bodyData = {
    userIndex: index,
    userList: game.userList.map(user => user.userInfo),
    teamNames,
    battleData,
    battle: battleList,
    history: history1,
    historyEnemy: history2,
    table: table1,
    tableEnemy: table2,
    sumList: sumList,
    resultMap,
    gameOver: !!gameOver,
    winner: winner,
    roundNumber: activeBattle,
    types: battleData.type,
    enemyWords: ["??", "??", "??", "??"],
    desUsers,
    jiemiUsers,
    teamIndex,
    lanjieUsers,
    quickMode,
    countdownData
  };

  if (gameOver) {
    bodyData.enemyWords = teams[1 - teamIndex].words;
    bodyData.teamWords = teams[teamIndex].words;
    if (index < 0) {
      bodyData.observeMode = true;
    }
  } else {
    if (index >= 0) {
      bodyData.teamWords = teams[teamIndex].words;
    } else {
      bodyData.teamWords = ["??", "??", "??", "??"];
      bodyData.observeMode = true;
    }
  }

  ctx.body = bodyData;
};

function judgeEmpty(list) {
  const type = typeof list[0];
  if (type === "string") {
    return list.join("").length <= 0;
  }
  if (type === "number") {
    return list.some(n => n < 0);
  }
}

router.get("/:id", getGame, getGameData);

// 小程序 - 获取游戏数据
router.get("/wx/:id", sessionUser, getGame, getGameData);

function handleSum(historylist) {
  const resultMap = [
    // 统计两队的得分情况
    {
      red: 0,
      black: 0,
      sum: 0
    },
    {
      red: 0,
      black: 0,
      sum: 0
    }
  ];
  historylist.forEach(round => {
    const { reds, blacks } = round;
    reds &&
      reds.forEach((red, teamIndex) => {
        if (red) {
          resultMap[teamIndex].red++;
          resultMap[1 - teamIndex].sum++;
        }
      });
    blacks &&
      blacks.forEach((black, teamIndex) => {
        if (black) {
          resultMap[teamIndex].black++;
          resultMap[teamIndex].sum--;
        }
      });
  });
  let winner = -1;
  let gameOver;
  let winNum = 0;
  let winFlag = false;
  if (resultMap[0].black >= 2 || resultMap[0].red >= 2) {
    winFlag = true;
    winNum++;
  }
  if (resultMap[1].black >= 2 || resultMap[1].red >= 2) {
    winFlag = true;
    winNum--;
  }
  if (winFlag) {
    gameOver = true;
    if (winNum > 0) winner = 1;
    else if (winNum < 0) winner = 0;
    else {
      if (resultMap[0].sum === resultMap[1].sum) winner = -1;
      else winner = resultMap[0].sum > resultMap[1].sum ? 0 : 1;
    }
  }

  return {
    gameOver,
    winner,
    sumList: resultMap.map(r => r.sum),
    resultMap
  };
}

function getWxGameHistory(list, teamIndex) {
  const history = [];
  list.forEach((item, index) => {
    const {
      codes,
      questions,
      jiemiAnswers,
      lanjieAnswers,
      blacks,
      reds
    } = item;
    const myQuestions = questions[teamIndex];
    const myJiemiAnswers = jiemiAnswers[teamIndex];
    const myLanjieAnswers = lanjieAnswers[teamIndex];
    const historyItem = codes[teamIndex].map((code, index2) => {
      return {
        question: myQuestions[index2],
        code,
        jiemiAnswer: myJiemiAnswers[index2],
        lanjieAnswer: myLanjieAnswers[index2]
      };
    });
    history.push({
      list: historyItem,
      black: (blacks || [])[teamIndex],
      red: (reds || [])[teamIndex]
    });
  });
  return history;
}

function getHistoryTable(history) {
  const table = [[], [], [], []];
  history.forEach(item => {
    const { list } = item;
    list.forEach(item => {
      const { code, question } = item;
      table[code].push(question);
    });
  });
  return table;
}

// 小程序 - 提交到对应游戏
router.post("/wx/:id/submit", sessionUser, getGame, async (ctx, next) => {
  const { _id } = ctx.state.user;
  const { battle, battleIndex } = ctx.request.body;
  const { game } = ctx.state;
  let { activeBattle, teams } = game;
  const qList = battle.map(item => item.question);

  // 是否包含违法内容
  const secResult = await msgListSecCheck(qList);
  if (secResult && secResult.length > 0) {
    const errorList = secResult.map(index => `第${index + 1}个内容`).join("，");
    ctx.body = {
      code: 501,
      error: `您所提交的内容含有违法违规内容：${errorList}`
    };
    return;
  }

  // 是否包含所提交的队伍的代码中的关键字
  const keywordsList = teams[battleIndex].words.reduce((list, words) => {
    return list.concat(words.split(""));
  }, []);
  const keyErrorList = [];
  let keyError;
  qList.forEach((q, index) => {
    const flag = [].some.call(q, word => keywordsList.includes(word));
    if (flag) {
      keyErrorList.push(index);
      keyError = true;
    }
  });
  if (keyError) {
    const errorList = keyErrorList
      .map(index => `第${index + 1}个内容`)
      .join("，");
    ctx.body = {
      code: 501,
      error: `您所提交的内容含有词语关键字：${errorList}`
    };
    return;
  }

  // 提交者的基本信息
  const userList = game.userList.map(item => item.id.toString());
  let index = userList.indexOf(_id.toString());
  if (!isNaN(DEBUG_INDEX)) index = DEBUG_INDEX; // 用于debug
  const teamIndex = Math.floor(index / 2);
  const newBattleData = game.battles[activeBattle];

  // 判断提交者的角色
  const type = getBattleType(index, newBattleData, battleIndex);
  if (type !== "等待") {
    // 若为加密阶段
    if (type === "加密") {
      newBattleData.questions[teamIndex] = battle.map(item => item.question);
    } else if (type === "解密") {
      newBattleData.jiemiAnswers[teamIndex] = battle.map(item => item.answer);
    } else if (type === "拦截") {
      newBattleData.lanjieAnswers[battleIndex] = battle.map(
        item => item.answer
      );
    }
    game.battles[activeBattle] = newBattleData;

    await updateGameAfterSubmit(activeBattle, newBattleData, game);

    ctx.body = null;
  } else {
    ctx.body = {
      code: 501,
      error: "你不在游戏中 or 未轮到你答题"
    };
  }
});

async function updateGameAfterSubmit(activeBattle, newBattleData, game) {
  const { codes, jiemiAnswers, questions, lanjieAnswers } = newBattleData;
  const jiamiFull = questions.every(list => !judgeEmpty(list));
  const jiemiFull = jiemiAnswers.every(list => !judgeEmpty(list));
  const lanjieFull = lanjieAnswers.every(list => !judgeEmpty(list));
  // 若为第一轮，不需要拦截
  if (activeBattle === 0 && jiamiFull && jiemiFull) {
    codes.forEach((codes, teamIndex) => {
      const answerStr = jiemiAnswers[teamIndex].join("");
      const codeStr = codes.join("");
      if (answerStr !== codeStr) {
        newBattleData.blacks[teamIndex] = true;
      }
    });
    game.battles[activeBattle] = newBattleData;
    game.battles.push(createBattle(activeBattle));
    activeBattle++;
  } else if (jiamiFull && jiemiFull && lanjieFull) {
    codes.forEach((codes, teamIndex) => {
      const lanjieStr = lanjieAnswers[teamIndex].join("");
      const answerStr = jiemiAnswers[teamIndex].join("");
      const codeStr = codes.join("");
      if (answerStr !== codeStr) {
        newBattleData.blacks[teamIndex] = true;
      }
      if (lanjieStr === codeStr) {
        newBattleData.reds[teamIndex] = true;
      }
    });
    game.battles[activeBattle] = newBattleData;
    game.battles.push(createBattle(activeBattle));
    activeBattle++;
  }

  await Games.findOneAndUpdate(
    {
      _id: game._id
    },
    {
      battles: game.battles,
      activeBattle
    }
  );
}

function getBattleType(index, battle, battleIndex) {
  const { desUsers, jiemiUsers, lanjieUsers } = battle;

  if (desUsers[battleIndex] === index) {
    return "加密";
  }
  if (jiemiUsers[battleIndex] === index) {
    return "解密";
  }
  if (lanjieUsers && lanjieUsers[battleIndex] === index) {
    return "拦截";
  }
  return "等待";
}

router.gameInit = async function(userList, randomMode, quickMode) {
  // 在随机模式下，将玩家列表打乱顺序
  if (randomMode) {
    userList.shuffle();
  }
  const [team0, team1] = getTeamNames();
  const [words0, words1] = await getWords();
  const data = {
    userList,
    teams: [
      {
        name: team0,
        userList: userList.slice(0, 2),
        words: words0
      },
      {
        name: team1,
        userList: userList.slice(2, 4),
        words: words1
      }
    ],
    battles: [createBattle(-1)],
    activeBattle: 0,
    timeStamp: +new Date(),
    quickMode
  };
  return data;
};

router.handleSum = handleSum;
router.updateGameAfterSubmit = updateGameAfterSubmit;
router.judgeEmpty = judgeEmpty;

function getTeamNames() {
  return ["马里奥", "酷霸王"];
}

function createBattle(lastBattle) {
  const newBattle = lastBattle + 1;
  const desUser = newBattle % 2;
  const desUsers = [desUser, desUser + 2];
  const jiemiUsers = desUsers.map(desIndex =>
    desIndex % 2 === 0 ? desIndex + 1 : desIndex - 1
  );
  // 第一回合，无拦截
  const lanjieUsers =
    newBattle > 0
      ? jiemiUsers.map(jiemiIndex =>
          jiemiIndex >= 2 ? jiemiIndex - 2 : jiemiIndex + 2
        )
      : [-1, -1];
  return {
    desUsers,
    jiemiUsers,
    lanjieUsers,
    codes: [getCodes(), getCodes()],
    questions: [
      ["", "", ""],
      ["", "", ""]
    ],
    jiemiAnswers: [
      [-1, -1, -1],
      [-1, -1, -1]
    ],
    lanjieAnswers: [
      [-1, -1, -1],
      [-1, -1, -1]
    ],
    blacks: [],
    reds: []
  };
}

function getCodes() {
  const list = [0, 1, 2, 3];
  const del = Math.ceil(Math.random() * 4) - 1;
  list.splice(del, 1);
  return list.shuffle();
}

async function getWords() {
  const words = dictionary.shuffle();
  return [words.slice(0, 4), words.slice(-4)];
}

Array.prototype.shuffle = function() {
  return this.sort(_ => Math.random() - 0.5);
};

// 小程序 - 获取所有游戏数据
router.get("/", async ctx => {
  const list = await Games.find({ over: true }).lean();

  ctx.body = list.map(item => {
    const { _id, userList, activeBattle } = item;
    return {
      id: _id,
      userList,
      battleCount: activeBattle + 1
    };
  });
});

module.exports = router;
