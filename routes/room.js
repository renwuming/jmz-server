const router = require("koa-router")();
const Games = require("../models/game");
const Rooms = require("../models/room");
const { sessionUser } = require("./middleware");
const GameRouter = require("./game");
const UserRouter = require("./users");
const MODE = require("./config").mode;

router.prefix("/rooms");

async function getRoom(ctx, next) {
  const { id } = ctx.params;
  try {
    let room = await Rooms.findOne({
      _id: id
    });
    ctx.state.room = room.toObject();
    await next();
  } catch (e) {
    console.log(e.toString());
    ctx.body = {
      code: 500
    };
  }
}

// 小程序 - 开始某房间的游戏
router.post("/wx/:id/start", sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
  const { randomMode } = ctx.request.body;
  const roomData = ctx.state.room;
  let { userList } = roomData;
  userList = userList.filter(user => user.userInfo);
  const roomOwnerID = userList.length > 0 ? userList[0].id.toString() : null;
  const ownRoom = roomOwnerID == _id;

  const playerFlag =
    MODE === "game"
      ? userList.length >= 4
      : userList.length === 1 || userList.length >= 4;

  if (ownRoom && playerFlag) {
    const gameData = await GameRouter.gameInit(
      userList.slice(0, 4),
      randomMode
    );
    const game = await Games.create(gameData);
    const newGameId = game._id;
    await Rooms.findOneAndUpdate(
      {
        _id: roomData._id
      },
      {
        $set: {
          activeGame: newGameId
        }
      }
    );
    ctx.body = {
      id: newGameId
    };
  } else {
    ctx.body = {
      code: 501,
      error: "人数不足"
    };
  }
});

// 加入房间
router.post("/:id", sessionUser, getRoom, async (ctx, next) => {
  const { _id, nick, userInfo } = ctx.state.user;
  let roomData = ctx.state.room;
  if (roomData) {
    let flag = true; // 是否需要插入user数据
    roomData.userList.forEach(user => {
      if (user.id.toString() == _id) {
        flag = false;
      }
    });
    if (flag) {
      roomData.userList.push({
        id: _id,
        nick,
        userInfo
      });
      await Rooms.updateOne(
        {
          _id: roomData._id
        },
        roomData
      );
    }
    ctx.body = null;
  } else {
    ctx.body = {
      code: 500
    };
  }
});

// 修改房间里玩家顺序
// todo 验证是否为房主
// router.post("/:id/userList", sessionUser, getRoom, async ctx => {
//   const { userList } = ctx.request.body;
//   let roomData = ctx.state.room;
//   if (roomData) {
//     roomData.userList = userList;
//     await Rooms.updateOne(
//       {
//         _id: roomData._id
//       },
//       roomData
//     );
//     ctx.body = {};
//   } else {
//     ctx.body = {
//       code: 500
//     };
//   }
// });

async function stopRoomGame(roomData) {
  await Rooms.updateOne(
    {
      _id: roomData._id
    },
    {
      over: true
    }
  );
}

// 退出房间
router.post("/:id/quit", sessionUser, getRoom, async (ctx, next) => {
  const { _id, nick } = ctx.state.user;
  let roomData = ctx.state.room;

  if (roomData) {
    const userList = roomData.userList.map(user => user.id.toString());
    const userIndex = userList.indexOf(_id.toString());
    if (userIndex >= 0) {
      roomData.userList.splice(userIndex, 1);
      await Rooms.updateOne(
        {
          _id: roomData._id
        },
        roomData
      );
    }
    ctx.body = null;
  } else {
    ctx.body = {
      code: 500,
      error: "请求失败"
    };
  }
});

// 调整玩家顺序
router.post("/:id/edituserlist/:index", sessionUser, getRoom, async ctx => {
  const { index } = ctx.params;
  const { _id } = ctx.state.user;
  let roomData = ctx.state.room;
  const { userList } = roomData;

  if (roomData) {
    const _userList = userList.map(user => user.id.toString());
    const userIndex = _userList.indexOf(_id.toString());
    if (userIndex === 0) {
      const editUser = userList.splice(index, 1);
      roomData.userList = [userList[0], ...editUser, ...userList.slice(1)];
      console.log(editUser);
      await Rooms.updateOne(
        {
          _id: roomData._id
        },
        roomData
      );
      ctx.body = null;
    } else {
      ctx.body = {
        code: 502,
        error: "请求失败"
      };
    }
  } else {
    ctx.body = {
      code: 500,
      error: "请求失败"
    };
  }
});

// 小程序 - 获取房间数据
router.get("/wx/:id", sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
  let roomData = ctx.state.room;
  let { userList, activeGame, over } = roomData;
  userList = await updateAndHandleUserList(userList);
  if (roomData) {
    const roomOwnerID = userList.length > 0 ? userList[0].id.toString() : null;
    const ownRoom = roomOwnerID == _id;
    const roomIndex = userList
      .map(user => user.id.toString())
      .indexOf(_id.toString());
    const inRoom = roomIndex >= 0;
    const inGame = inRoom && roomIndex < 4;
    ctx.body = {
      userList: userList,
      ownRoom,
      activeGame,
      inRoom,
      inGame,
      over
    };
    await Rooms.findOneAndUpdate(roomData, {
      userList
    });
  } else {
    ctx.body = {
      code: 500
    };
  }
});

async function updateAndHandleUserList(list) {
  const userList = [];
  for (let i = 0, L = list.length; i < L; i++) {
    let user = list[i];
    if (user && user.userInfo) {
      userList.push(user);
    } else {
      user = await UserRouter.getWxUser(user.id);
      if (user) userList.push(user);
    }
  }
  return userList;
}

// 创建房间
router.post("/", sessionUser, async (ctx, next) => {
  const { _id, nick, userInfo } = ctx.state.user;
  let room = await Rooms.create({
    timeStamp: +new Date(),
    userList: [
      {
        id: _id,
        nick,
        userInfo
      }
    ],
    mode: false,
    gameHistory: []
  });

  ctx.body = {
    id: room._id
  };
});

// 小程序 - 获取我在的房间列表
router.get("/list/wx", sessionUser, async (ctx, next) => {
  const { user } = ctx.state;
  const { _id } = user;
  let roomList = await Rooms.find({
    userList: { $elemMatch: { id: _id.toString() } },
    over: { $ne: true }
  });

  roomList = await handleDataWX(roomList);

  ctx.body = roomList.sort((a, b) => b.timeStamp - a.timeStamp);
});

async function handleDataWX(list) {
  const L = list.length,
    resList = [];
  for (let i = 0; i < L; i++) {
    const room = list[i];
    const { userList } = room;
    if (!userList[0].userInfo) continue;
    if (room.activeGame) {
      const game = await Games.findOne({
        _id: room.activeGame
      });
      if (game && game.over) {
        await stopRoomGame(room);
        continue;
      }
    }
    resList.push(room);
  }
  return resList;
}

module.exports = router;
