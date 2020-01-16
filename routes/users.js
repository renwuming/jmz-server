const router = require("koa-router")();
const Users = require("../models/user");
const Games = require("../models/game");
const gameRouter = require("./game");
const { sessionUser } = require("./middleware");
const { mode } = require("./config");

router.prefix("/users");

router.get("/gamedata/:id", sessionUser, async function(ctx, next) {
  const { id } = ctx.params;
  const list = await gameHistoryData(id);
  const Sum = list.length;
  let winSum = 0;
  list.forEach(item => {
    if (item.status === "胜利") {
      winSum++;
    }
  });
  const winRate = Sum === 0 ? 0 : Math.round((winSum / Sum).toFixed(2) * 100);
  ctx.body = {
    winRate,
    winSum,
    Sum
  };
});

router.post("/validate", sessionUser, async function(ctx, next) {
  ctx.body = {
    mode,
    ...handleUserObject(ctx.state.user)
  };
});

router.post("/", async function(ctx, next) {
  const { nick, secret } = ctx.request.body;
  if (!nick || !secret) {
    ctx.body = {
      code: 500,
      error: "用户名 or 密码错误"
    };
    return;
  }

  let user = await Users.findOne({
    nick,
    secret
  });

  if (!user) {
    user = await Users.create({
      nick,
      secret
    });
  }

  ctx.session.nick = nick;
  ctx.session.secret = secret;

  ctx.body = handleUserObject(user);
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
    _id: id
  });
  if (user && user.userInfo) {
    const newUser = handleUserObject(user);
    newUser.id = id;
    return newUser;
  }
  return null;
};

router.get("/history/games", sessionUser, async function(ctx, next) {
  let { _id } = ctx.state.user;
  _id = _id.toString();

  ctx.body = await gameHistoryData(_id);
});

async function gameHistoryData(id) {
  const games = await Games.find({
    userList: { $elemMatch: { id } },
    over: true
  });
  const result = [];
  games.forEach(game => {
    game = game.toObject();
    let { userList, battles } = game;
    userList = userList.map(e => e.id.toString());
    const userIndex = userList.indexOf(id);
    const teamIndex = userIndex >= 2 ? 1 : 0;
    const gameResult = gameRouter.handleSum(battles);
    const { winner } = gameResult;
    game.status =
      winner < 0 || winner === undefined
        ? "平局"
        : winner === teamIndex
        ? "胜利"
        : "失败";
    result.push(game);
  });
  return result.sort((a, b) => {
    const timeStampA = a.timeStamp || 0;
    const timeStampB = b.timeStamp || 0;
    return timeStampB - timeStampA;
  });
}

module.exports = router;
