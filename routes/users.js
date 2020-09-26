const router = require("koa-router")();
const Users = require("../models/user");
const Games = require("../models/game");
const gameRouter = require("./game");
const { sessionUser, sessionUser_PC } = require("./middleware");
const { mode, strongTip } = require("./config");
const getCache = require("./cache");

router.prefix("/users");

router.get("/gamedata/:id", sessionUser, async function (ctx, next) {
  let { id } = ctx.params;
  if (id === "self") {
    id = ctx.state.user._id;
  }
  const list = await gameHistoryData(id);
  const Sum = list.length;
  let winSum = 0;
  let pingSum = 0;
  list.forEach(item => {
    if (item.status === "胜利") {
      winSum++;
    }
    if (item.status === "平局") {
      pingSum++;
    }
  });
  const realSum = Sum - pingSum;
  const winRate =
    realSum === 0 ? 0 : Math.round((winSum / realSum).toFixed(2) * 100);
  ctx.body = {
    winRate,
    winSum,
    pingSum,
    Sum,
  };
});

router.post("/validate", sessionUser, async function (ctx, next) {
  const cache = getCache();
  const { _id } = ctx.state.user;
  const userID = _id.toString();
  // 获取在线匹配的数据
  const matchData = cache.get(userID) || {};
  const { activeGame } = matchData;
  const historyList = strongTip ? 0 : await gameHistoryData(userID);

  // 判断game是否已结束
  if (activeGame) {
    const game = await Games.findOne({ _id: activeGame });
    if (!game || game.over) {
      matchData.activeGame = null;
      cache.set(userID, matchData);
    }
  }

  ctx.body = {
    mode,
    ...handleUserObject(ctx.state.user),
    onlineMatch: matchData.activeGame,
    history: historyList.length,
  };
});

router.post("/pc/validate", sessionUser_PC, async function (ctx, next) {
  ctx.body = handleUserObject(ctx.state.user);
});

function handleUserObject(data) {
  if (data.toObject) {
    data = data.toObject();
  }
  delete data.openid; // 去掉openid
  delete data.secret; // 去掉secret
  delete data._id;
  delete data.__v;
  return data;
}

router.getWxUser = async id => {
  const user = await Users.findOne({
    _id: id,
  });
  if (user && user.userInfo) {
    const newUser = handleUserObject(user);
    newUser.id = id;
    return newUser;
  }
  return null;
};

router.get("/v2/history/games/:pageNum", sessionUser, async function (ctx) {
  const { pageNum } = ctx.params;
  const Min = pageNum * 10;
  const Max = Min + 10;
  let { _id } = ctx.state.user;
  _id = _id.toString();

  const list = await gameHistoryData(_id);
  ctx.body = list.slice(Min, Max).map(item => {
    const { _id, userList, status, timeStamp } = item;
    return { _id, userList, status, timeStamp };
  });
});

async function gameHistoryData(id) {
  const games = await Games.find({
    userList: { $elemMatch: { id } },
    over: true,
  }).sort({ timeStamp: -1 });

  const result = [];
  games.forEach(game => {
    game = game.toObject();
    let { userList } = game;
    userList = userList.map(e => e.id.toString());
    const userIndex = userList.indexOf(id);
    const teamIndex = userIndex >= 2 ? 1 : 0;
    const gameResult = gameRouter.handleSum(game);
    const { winner } = gameResult;
    game.status =
      winner < 0 || winner === undefined
        ? "平局"
        : winner === teamIndex
        ? "胜利"
        : "失败";
    result.push(game);
  });
  return result;
}

module.exports = router;
