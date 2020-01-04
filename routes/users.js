const router = require("koa-router")();
const Users = require("../models/user");
const Games = require("../models/game");
const gameRouter = require("./game");
const { sessionUser } = require("./middleware");

router.prefix("/users");

router.get("/", sessionUser, async function(ctx, next) {
  ctx.body = handleUserObject(ctx.state.user);
});

router.post("/validate", sessionUser, async function(ctx, next) {
  ctx.body = handleUserObject(ctx.state.user);
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
  const games = await Games.find({
    userList: { $elemMatch: { id: _id.toString() } },
    over: true
  });
  const result = [];
  games.forEach(game => {
    game = game.toObject();
    let { userList, battles } = game;
    userList = userList.map(e => e.id.toString());
    const userIndex = userList.indexOf(_id);
    const teamIndex = userIndex >= 2 ? 1 : 0;
    const gameResult = gameRouter.handleSum(battles);
    const { winner } = gameResult;
    game.status =
      winner < 0 || winner === undefined ? "平局" : winner === teamIndex ? "胜利" : "失败";
    result.push(game);
  });

  ctx.body = result.sort((a, b) => b.timeStamp - a.timeStamp);
});

module.exports = router;
