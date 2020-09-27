let DEBUG_INDEX; // = 2; // todo
const router = require("koa-router")();
const Games = require("../models/game");
const Seasons = require("../models/seasons");
const { sessionUser } = require("./middleware");
const { msgListSecCheck } = require("./wxAuth");
const { getNewestSeason } = require("./season");
const dictionary = require("./code");

router.prefix("/games");

const stageMap = {
  0: {
    name: "传递情报", // 加密阶段
    time: 180, // 单位s
  },
  1: {
    name: "解密/拦截", // 解密/拦截阶段
    time: 180, // 单位s
  },
};

async function getGame(ctx, next) {
  const { id } = ctx.params;
  try {
    let game = await Games.findOne({
      _id: id,
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
      error,
    };
  }
}

const getGameData = async (userID, game) => {
  // 未获取到游戏
  if (!game) {
    ctx.body = {};
    return;
  }
  const userList = game.userList.map(item => item.id.toString());
  let index = userList.indexOf(userID);
  if (!isNaN(DEBUG_INDEX)) index = DEBUG_INDEX; // 用于debug
  const {
    activeBattle,
    teams,
    over,
    battles,
    quickMode,
    teamMode,
    _id,
    threeMode,
  } = game;
  const L = userList.length;
  const teamL = Math.ceil(L / 2);
  let teamIndex = Math.floor(index / teamL);
  if (teamIndex < 0) teamIndex = 0; // 此时为旁观者模式
  const battle = battles[activeBattle];
  const {
    desUsers,
    jiemiUsers,
    lanjieUsers,
    codes,
    questions,
    jiemiAnswers,
    lanjieAnswers,
  } = battle;
  questionStrList = questions.map(question =>
    question ? question.map(str => str.trim()) : ["", "", ""],
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
      [-1, -1, -1],
    ],
    type: ["等待", "等待"],
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
      answer: -1,
    }));
  });

  const history1 = getWxGameHistory(battles.slice(0, -1), teamIndex);
  const history2 = getWxGameHistory(battles.slice(0, -1), 1 - teamIndex);
  const table1 = getHistoryTable(history1);
  const table2 = getHistoryTable(history2);
  const gameResult = handleSum(game);
  let { sumList, gameOver, winner, resultMap } = gameResult;
  if (gameOver) {
    if (!over) {
      // 若游戏已结束，更新数据库
      await Games.findOneAndUpdate(
        {
          _id: game._id,
        },
        {
          over: gameOver,
        },
      );
    }
    if (!game.relaxMode) {
      handleSeasonRank(game.userList);
    }
  }
  if (over) gameOver = true; // 非正常情况，游戏被房主终止

  // 倒计时逻辑
  const now = new Date().getTime();
  let countdownData = null;
  if (!gameOver && quickMode) {
    let { lastStage } = game;
    if (!lastStage) {
      lastStage = {
        timeStamp: game.timeStamp,
        stage: 0,
        first: true, // 第一个阶段
      };
    }
    const { timeStamp, stage } = lastStage;
    let remainingTime =
      stageMap[stage].time - Math.floor((now - timeStamp) / 1000);
    countdownData = {
      time: remainingTime,
      name: stageMap[stage].name,
    };
  }

  // 更新用户的在线/离线状态
  let { userStatus } = game;
  if (!userStatus) userStatus = {};
  userStatus[userID] = now;
  await Games.findOneAndUpdate(
    {
      _id: game._id,
    },
    {
      userStatus,
    },
  );
  const userOnlineStatus = userList.map(id => {
    // 在线的标准为，10s内更新过timeStamp
    const timeStamp = userStatus[id];
    return timeStamp > now - 10000;
  });

  const bodyData = {
    id: _id,
    userIndex: index,
    userList: game.userList.map(user => ({ id: user.id, ...user.userInfo })),
    teamNames: getTeamNames(),
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
    countdownData,
    stageName: stageMap[handleStageByGame(game)].name,
    userOnlineStatus,
    teamMode,
    threeMode,
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

  return bodyData;
};

// 重新计算stage
function handleStageByGame(game) {
  const { activeBattle, battles, threeMode } = game;
  const currentBattle = battles[activeBattle];
  const { questions } = currentBattle;
  const jiamiFull = threeMode
    ? !judgeEmpty(questions[0])
    : questions.every(list => !judgeEmpty(list));
  if (jiamiFull) {
    return 1;
  }
  return 0;
}

function judgeEmpty(list) {
  const type = typeof list[0];
  if (type === "string") {
    return list.join("").length <= 0;
  }
  if (type === "number") {
    return list.some(n => n < 0);
  }
}

router.get("/:id", getGame, async ctx => {
  const _id = ctx.state.user ? ctx.state.user._id : "";
  const data = await getGameData(_id.toString(), ctx.state.game);
  ctx.body = data;
});

// 小程序 - 获取游戏数据
router.get("/wx/:id", sessionUser, getGame, async ctx => {
  const _id = ctx.state.user ? ctx.state.user._id : "";
  const data = await getGameData(_id.toString(), ctx.state.game);
  ctx.body = data;
});

function handleSum(game) {
  const { battles: historylist, threeMode } = game;
  if (threeMode) {
    return handleSumThreeMode(game);
  }
  const resultMap = [
    // 统计两队的得分情况
    {
      red: 0,
      black: 0,
      sum: 0,
    },
    {
      red: 0,
      black: 0,
      sum: 0,
    },
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
    resultMap,
  };
}

// 三人模式
function handleSumThreeMode(game) {
  const { battles: historylist, activeBattle } = game;

  const resultMap = [
    // 统计两队的得分情况
    {
      red: 0,
      black: 0,
      sum: 0,
    },
    {
      red: 0,
      black: 0,
      sum: 0,
    },
  ];
  historylist.forEach(round => {
    const { reds, blacks } = round;
    reds &&
      reds.forEach((red, teamIndex) => {
        // 三人模式，只计算第一个队伍的拦截次数
        if (red && teamIndex === 0) {
          resultMap[teamIndex].red++;
          resultMap[1 - teamIndex].sum++;
        }
      });
    blacks &&
      blacks.forEach((black, teamIndex) => {
        // 三人模式，只计算第一个队伍的失误次数
        if (black && teamIndex === 0) {
          resultMap[teamIndex].black++;
          resultMap[teamIndex].sum--;
        }
      });
  });

  let winner = -1;
  const scoreDiff = Math.abs(resultMap[0].sum - resultMap[1].sum);

  // 五回合之内
  if (activeBattle < 5) {
    if (scoreDiff >= 2) winner = 1;
  } else {
    if (scoreDiff >= 2) winner = 1;
    else winner = 0;
  }

  return {
    gameOver: winner >= 0,
    winner,
    sumList: resultMap.map(r => r.sum),
    resultMap,
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
      reds,
    } = item;
    const myQuestions = questions[teamIndex];
    const myJiemiAnswers = jiemiAnswers[teamIndex];
    const myLanjieAnswers = lanjieAnswers[teamIndex];
    const historyItem = codes[teamIndex].map((code, index2) => {
      return {
        question: myQuestions[index2],
        code,
        jiemiAnswer: myJiemiAnswers[index2],
        lanjieAnswer: myLanjieAnswers[index2],
      };
    });
    history.push({
      list: historyItem,
      black: (blacks || [])[teamIndex],
      red: (reds || [])[teamIndex],
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
      table[code] && table[code].push(question);
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
      error: `您所提交的内容含有违法违规内容：${errorList}`,
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
    let flag = false;
    const includesWords = [];
    [].forEach.call(q, word => {
      if (keywordsList.includes(word)) {
        flag = true;
        includesWords.push(word);
      }
    });
    if (flag) {
      keyErrorList.push({
        index,
        includesWords,
      });
      keyError = true;
    }
  });
  if (keyError) {
    const errorList = keyErrorList
      .map(
        item =>
          `第${item.index + 1}个内容中，包含：${item.includesWords.join("/")}`,
      )
      .join("，");
    ctx.body = {
      code: 501,
      error: `您所提交的内容含有词语关键字：${errorList}`,
    };
    return;
  }

  // 提交者的基本信息
  const userList = game.userList.map(item => item.id.toString());
  let index = userList.indexOf(_id.toString());
  if (!isNaN(DEBUG_INDEX)) index = DEBUG_INDEX; // 用于debug
  const L = userList.length;
  const teamL = Math.ceil(L / 2);
  const teamIndex = Math.floor(index / teamL);
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
        item => item.answer,
      );
    }
    game.battles[activeBattle] = newBattleData;

    await updateGameAfterSubmit(activeBattle, newBattleData, game);

    ctx.body = null;
  } else {
    ctx.body = {
      code: 501,
      error: "你不在游戏中 or 未轮到你答题",
    };
  }
});

async function updateGameAfterSubmit(activeBattle, newBattleData, game) {
  const { teamMode, userList, threeMode } = game;

  // 三人模式，有特别的规则
  if (threeMode) {
    await updateGameAfterSubmitThreeMode(activeBattle, newBattleData, game);
    return;
  }

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
    const newBattle = teamMode
      ? createTeamModeBattle(activeBattle, userList.length)
      : createBattle(activeBattle);
    game.battles.push(newBattle);
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
    const newBattle = teamMode
      ? createTeamModeBattle(activeBattle, userList.length)
      : createBattle(activeBattle);
    game.battles.push(newBattle);
    activeBattle++;
  }

  // 判断游戏是否结束
  const gameResult = handleSum(game);
  let { gameOver } = gameResult;
  if (gameOver && !game.over) {
    // 若游戏已结束，更新数据库
    await Games.findOneAndUpdate(
      {
        _id: game._id,
      },
      {
        over: gameOver,
      },
    );
  }

  await Games.findOneAndUpdate(
    {
      _id: game._id,
    },
    {
      battles: game.battles,
      activeBattle,
    },
  );
}

async function updateGameAfterSubmitThreeMode(
  activeBattle,
  newBattleData,
  game,
) {
  const { codes, jiemiAnswers, questions, lanjieAnswers } = newBattleData;
  const jiamiFull = !judgeEmpty(questions[0]);
  const jiemiFull = !judgeEmpty(jiemiAnswers[0]);
  const lanjieFull = !judgeEmpty(lanjieAnswers[0]);
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
    const newBattle = createThreeModeBattle(activeBattle);
    game.battles.push(newBattle);
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
    const newBattle = createThreeModeBattle(activeBattle);
    game.battles.push(newBattle);
    activeBattle++;
  }

  // 判断游戏是否结束
  const gameResult = handleSum(game);
  let { gameOver } = gameResult;
  if (gameOver && !game.over) {
    // 若游戏已结束，更新数据库
    await Games.findOneAndUpdate(
      {
        _id: game._id,
      },
      {
        over: gameOver,
      },
    );
  }

  await Games.findOneAndUpdate(
    {
      _id: game._id,
    },
    {
      battles: game.battles,
      activeBattle,
    },
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

function getTeamNames() {
  return ["潜伏者", "军情处"];
}

function createBattle(lastBattle) {
  const newBattle = lastBattle + 1;
  const desUser = newBattle % 2;
  const desUsers = [desUser, desUser + 2];
  const jiemiUsers = desUsers.map(desIndex =>
    desIndex % 2 === 0 ? desIndex + 1 : desIndex - 1,
  );
  // 第一回合，无拦截
  const lanjieUsers =
    newBattle > 0
      ? desUsers.map(index => (index >= 2 ? index - 2 : index + 2))
      : [-1, -1];
  return {
    desUsers,
    jiemiUsers,
    lanjieUsers,
    codes: [getCodes(), getCodes()],
    questions: [
      ["", "", ""],
      ["", "", ""],
    ],
    jiemiAnswers: [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
    lanjieAnswers: [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
    blacks: [],
    reds: [],
  };
}

function createTeamModeBattle(lastBattle, L) {
  const newBattle = lastBattle + 1;
  // 分组界线
  const teamL = Math.ceil(L / 2);
  const desUsers = [newBattle % teamL, (newBattle % (L - teamL)) + teamL];
  const jiemiUsers = [
    (newBattle + 1) % teamL,
    ((newBattle + 1) % (L - teamL)) + teamL,
  ];
  // 第一回合，无拦截
  const lanjieUsers =
    newBattle > 0
      ? [((newBattle + 2) % (L - teamL)) + teamL, (newBattle + 2) % teamL]
      : [-1, -1];
  return {
    desUsers,
    jiemiUsers,
    lanjieUsers,
    codes: [getCodes(), getCodes()],
    questions: [
      ["", "", ""],
      ["", "", ""],
    ],
    jiemiAnswers: [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
    lanjieAnswers: [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
    blacks: [],
    reds: [],
  };
}

function createThreeModeBattle(lastBattle) {
  const newBattle = lastBattle + 1;
  // 分组界线
  const desUsers = [newBattle % 2, -1];
  const jiemiUsers = [(newBattle + 1) % 2, -1];
  // 第一回合，无拦截
  const lanjieUsers = newBattle > 0 ? [2, -1] : [-1, -1];
  return {
    desUsers,
    jiemiUsers,
    lanjieUsers,
    codes: [getCodes(), [-1, -1, -1]],
    questions: [
      ["", "", ""],
      ["", "", ""],
    ],
    jiemiAnswers: [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
    lanjieAnswers: [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
    blacks: [],
    reds: [],
  };
}

function getCodes() {
  const list = [0, 1, 2, 3];
  const del = Math.floor(Math.random() * 4);
  list.splice(del, 1);
  return list.shuffle();
}

async function getWords() {
  const words = dictionary;
  var L = words.length;
  const result = [];
  for (var i = 0; i < 8; i++) {
    var index = ~~(Math.random() * L) + i;
    result[i] = words[index];
    words[index] = words[i];
    L--;
  }

  return [result.slice(0, 4), result.slice(-4)];
}

Array.prototype.shuffle = function () {
  for (let t, j, i = this.length; i; ) {
    j = Math.floor(Math.random() * i); // 在前i项中随机取一项，与第i项交换
    t = this[--i];
    this[i] = this[j];
    this[j] = t;
  }
  return this;
};

// 处理赛季逻辑
async function handleSeasonRank(userList) {
  const season = await getNewestSeason();
  let { startAt, userMap, _id } = season;
  if (!userMap) userMap = {};
  for (let i = 0, L = userList.length; i < L; i++) {
    const { id, userInfo } = userList[i];
    let score = 0;
    // 获取赛季内的游戏
    const seasonGames = await Games.find({
      userList: { $elemMatch: { id } },
      over: true,
      createdAt: { $gt: startAt },
    }).lean();
    seasonGames.forEach(game => {
      const { userList } = game;
      const userIndex = userList.map(e => e.id).indexOf(id);
      const L = userList.length;
      const teamL = Math.ceil(L / 2);
      const teamIndex = Math.floor(userIndex / teamL);
      const gameResult = handleSum(game);
      const { winner } = gameResult;
      if (winner < 0 || winner === undefined) {
        return;
      } else if (winner === teamIndex) {
        score += 2;
      } else {
        score -= 1;
      }
    });
    userMap[id] = {
      userInfo,
      score,
    };
  }

  await Seasons.findOneAndUpdate(
    {
      _id,
    },
    {
      userMap,
    },
  );
}

router.gameInit = async function (
  userList,
  randomMode,
  quickMode,
  relaxMode = false,
  teamMode = false,
) {
  // 在随机模式下，将玩家列表打乱顺序
  if (randomMode) {
    userList.shuffle();
  }
  // 为玩家分组
  const L = userList.length;
  const teamL = Math.ceil(L / 2);
  const userList1 = userList.slice(0, teamL);
  const userList2 = userList.slice(teamL);
  const threeMode = userList.length === 3;

  const firstBattle = threeMode
    ? createThreeModeBattle(-1)
    : teamMode
    ? createTeamModeBattle(-1, L)
    : createBattle(-1);
  const [team0, team1] = getTeamNames();
  const [words0, words1] = await getWords();
  const data = {
    userList,
    teams: [
      {
        name: team0,
        userList: userList1,
        words: words0,
      },
      {
        name: team1,
        userList: userList2,
        words: threeMode ? ["-", "-", "-", "-"] : words1,
      },
    ],
    battles: [firstBattle],
    activeBattle: 0,
    timeStamp: +new Date(),
    quickMode,
    relaxMode,
    teamMode,
    threeMode,
  };
  return data;
};

router.getGameData = getGameData;
router.handleStageByGame = handleStageByGame;
router.handleSum = handleSum;
router.updateGameAfterSubmit = updateGameAfterSubmit;
router.judgeEmpty = judgeEmpty;
router.stageMap = stageMap;
module.exports = router;
