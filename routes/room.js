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
    console.error(e.toString());
    ctx.body = {
      code: 500
    };
  }
}

// 小程序 - 开始某房间的游戏
router.post("/wx/:id/start", sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
  const { randomMode, quickMode } = ctx.request.body;
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
      randomMode,
      quickMode
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
  const { _id, userInfo } = ctx.state.user;
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


// 退出房间
router.post("/:id/quit", sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
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
  const { _id, userInfo } = ctx.state.user;
  let room = await Rooms.create({
    timeStamp: +new Date(),
    userList: [
      {
        id: _id,
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
  const roomList = await Rooms.find(
    {
      userList: { $elemMatch: { id: _id.toString() } },
      over: { $ne: true }
    },
    {
      timeStamp: 1,
      userList: 1
    }
  );

  ctx.body = roomList.sort((a, b) => b.timeStamp - a.timeStamp);
});

// 获取我在的房间列表 - 分页
router.get("/v2/list/:pageNum", sessionUser, async (ctx, next) => {
  const { pageNum } = ctx.params;
  const Min = pageNum * 10;
  const Max = Min + 10;
  const { user } = ctx.state;
  const { _id } = user;
  const gamingRoomList = await Rooms.find(
    {
      userList: { $elemMatch: { id: _id.toString() } },
      over: { $ne: true },
      activeGame: { $exists: true, $ne: null }
    },
    {
      timeStamp: 1,
      userList: 1,
      activeGame: 1
    }
  ).sort({ timeStamp: -1 });

  const roomList = await Rooms.find(
    {
      userList: { $elemMatch: { id: _id.toString() } },
      over: { $ne: true },
      activeGame: { $in: [undefined, null] }
    },
    {
      timeStamp: 1,
      userList: 1,
      activeGame: 1
    }
  ).sort({ timeStamp: -1 });

  const resList = gamingRoomList.concat(roomList);

  ctx.body = resList.slice(Min, Max);
});

// 获取正在进行的游戏、未开始的房间列表 - 分页
router.get("/v3/list/:pageNum", sessionUser, async (ctx, next) => {
  const { pageNum } = ctx.params;
  const Min = pageNum * 10;
  const Max = Min + 10;
  const { user } = ctx.state;
  const { _id } = user;
  const userID = _id.toString();
  const gameList = await Games.find({
    userList: { $elemMatch: { id: userID } },
    over: { $ne: true }
  })
    .sort({ timeStamp: -1 })
    .lean();

  let roomList = await Rooms.find(
    {
      userList: { $elemMatch: { id: userID } },
      over: { $ne: true }
    },
    {
      timeStamp: 1,
      userList: 1,
      activeGame: 1
    }
  )
    .sort({ timeStamp: -1 })
    .lean();

  // 筛掉已经在游戏中的房间
  const gameIdList = gameList.map(e => e._id.toString());
  roomList = roomList.filter(item => {
    const { activeGame } = item;
    if (activeGame) {
      return !gameIdList.includes(item.activeGame);
    } else {
      return true;
    }
  });

  const resList = gameList.concat(roomList).slice(Min, Max);

  // 处理旁观中
  resList.forEach((item, index) => {
    const { activeGame, userList } = item;
    // 若已有游戏的房间，则是旁观中
    if (activeGame) {
      const userIndex = userList.map(e => e.id).indexOf(userID);
      if (userIndex > 3) {
        resList[index].observe = true;
      }
    }
  });
  ctx.body = resList;
});

module.exports = router;
