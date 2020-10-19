const Dayjs = require("dayjs");
const router = require("koa-router")();
const Games = require("../models/game");
const Rooms = require("../models/room");
const { sessionUser } = require("./middleware");
const GameRouter = require("./game");
const UserRouter = require("./users");
const { mode: MODE } = require("./config");

router.prefix("/rooms");

async function getRoom(ctx, next) {
  const { id } = ctx.params;
  try {
    let room = await Rooms.findOne({
      _id: id,
    });
    ctx.state.room = room.toObject();
    await next();
  } catch (e) {
    console.error(e.toString());
    ctx.body = {
      code: 500,
    };
  }
}

function judgeOwnRoomOrNot(roomData, userID) {
  const { userList, owner } = roomData;
  const roomOwnerID = owner
    ? owner
    : userList.length > 0
    ? userList[0].id
    : null;
  return roomOwnerID.toString() === userID.toString();
}

// 小程序 - 开始某房间的游戏v2
router.post("/v2/wx/:id/start", sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
  const roomData = ctx.state.room;
  let {
    userList,
    activeGame,
    random,
    timer,
    relaxMode,
    owner,
    ownerQuitGame,
    teamMode,
    specialRules,
  } = roomData;
  // 已有游戏，则直接返回
  if (activeGame) {
    ctx.body = {
      id: activeGame,
    };
    return;
  }
  userList = userList.filter(user => user.userInfo);
  const ownRoom = judgeOwnRoomOrNot(roomData, _id);

  if (ownerQuitGame) {
    userList = userList.filter(e => e.id !== owner);
  }

  const playerFlag =
    MODE === "game"
      ? userList.length >= 3 // 普通模式至少3人
      : userList.length === 1 || userList.length >= 3;

  const userMax = teamMode ? 10 : 4; // 团队模式最多10人，普通模式最多4人
  if (ownRoom && playerFlag) {
    const gameUserList = userList.slice(0, userMax);

    // 若有人离线，则无法开始游戏
    const userOnlineStatus = handleOnlineStatus(roomData);
    if (userOnlineStatus.slice(0, userMax).some(e => !e)) {
      ctx.body = {
        code: 501,
        error: "有玩家离线，无法开始游戏",
      };
      return;
    }

    const gameData = await GameRouter.gameInit(
      gameUserList,
      random,
      timer,
      relaxMode,
      teamMode,
    );
    const game = await Games.create({ ...gameData, specialRules });
    const newGameId = game._id;
    await Rooms.findOneAndUpdate(
      {
        _id: roomData._id,
      },
      {
        $set: {
          activeGame: newGameId,
          // 添加保护状态
          protected: true,
        },
      },
    );
    ctx.body = {
      id: newGameId,
    };
    // 5s后去掉保护状态
    setTimeout(async () => {
      await Rooms.findOneAndUpdate(
        {
          _id: roomData._id,
        },
        {
          $set: {
            protected: false,
          },
        },
      );
    }, 5000);
  } else {
    ctx.body = {
      code: 501,
      error: "人数不足",
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
        userInfo,
      });
      await Rooms.updateOne(
        {
          _id: roomData._id,
        },
        roomData,
      );
    }
    ctx.body = null;
  } else {
    ctx.body = {
      code: 500,
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
    const ownRoom = judgeOwnRoomOrNot(roomData, _id);
    // 若为房主，则解散房间
    if (ownRoom) {
      await Rooms.remove({
        _id: roomData._id,
      });
    } else if (userIndex > 0) {
      roomData.userList.splice(userIndex, 1);
      await Rooms.updateOne(
        {
          _id: roomData._id,
        },
        roomData,
      );
    }
    ctx.body = null;
  } else {
    ctx.body = {
      code: 500,
      error: "请求失败",
    };
  }
});

// 调整玩家顺序
router.post("/:id/edituserlist/:playerID", sessionUser, getRoom, async ctx => {
  const { playerID } = ctx.params;
  const { _id } = ctx.state.user;
  let roomData = ctx.state.room;
  const { userList } = roomData;

  if (roomData) {
    const ownRoom = judgeOwnRoomOrNot(roomData, _id);
    if (ownRoom) {
      const others = userList.filter(e => e.id !== playerID);
      const editUser = userList.find(e => e.id === playerID);
      roomData.userList = [editUser, ...others];
      await Rooms.updateOne(
        {
          _id: roomData._id,
        },
        roomData,
      );
      ctx.body = null;
    } else {
      ctx.body = {
        code: 502,
        error: "请求失败",
      };
    }
  } else {
    ctx.body = {
      code: 500,
      error: "请求失败",
    };
  }
});

// 踢出玩家
router.post(
  "/:id/edituserlist/delete/:playerID",
  sessionUser,
  getRoom,
  async ctx => {
    const { playerID } = ctx.params;
    const { _id } = ctx.state.user;
    let roomData = ctx.state.room;
    const { userList } = roomData;

    if (roomData) {
      const ownRoom = judgeOwnRoomOrNot(roomData, _id);
      if (ownRoom) {
        roomData.userList = userList.filter(e => e.id !== playerID);
        await Rooms.updateOne(
          {
            _id: roomData._id,
          },
          roomData,
        );
        ctx.body = null;
      } else {
        ctx.body = {
          code: 502,
          error: "请求失败",
        };
      }
    } else {
      ctx.body = {
        code: 500,
        error: "请求失败",
      };
    }
  },
);

// 房主是否参与游戏
router.post("/:id/ownerQuitGame", sessionUser, getRoom, async ctx => {
  const { _id } = ctx.state.user;
  let roomData = ctx.state.room;
  const { ownerQuitGame } = ctx.request.body;

  if (roomData) {
    const ownRoom = judgeOwnRoomOrNot(roomData, _id);
    if (ownRoom) {
      await Rooms.updateOne(
        {
          _id: roomData._id,
        },
        {
          ownerQuitGame,
        },
      );
      ctx.body = null;
    } else {
      ctx.body = {
        code: 502,
        error: "请求失败",
      };
    }
  } else {
    ctx.body = {
      code: 500,
      error: "请求失败",
    };
  }
});

// 调整room设置
router.post("/:id/status", sessionUser, getRoom, async ctx => {
  const status = ctx.request.body;
  const roomData = ctx.state.room;

  if (roomData) {
    await Rooms.updateOne(
      {
        _id: roomData._id,
      },
      status,
    );
    ctx.body = null;
  } else {
    ctx.body = {
      code: 500,
      error: "请求失败",
    };
  }
});

// 小程序 - 获取房间数据
router.get("/wx/:id", sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
  let roomData = ctx.state.room;
  if (roomData) {
    const data = await getRoomData(_id, roomData);
    ctx.body = data;
  } else {
    ctx.body = {
      code: 500,
    };
  }
});

async function getRoomData(userID, originRoomData) {
  // 检查room的游戏是否结束
  const [roomData] = await checkRoomIsOver([originRoomData]);
  let {
    userList,
    activeGame,
    over,
    _id,
    userStatus,
    timeStamp,
    gameHistory,
  } = roomData;

  userList = await updateAndHandleUserList(userList);

  const ownRoom = judgeOwnRoomOrNot(roomData, userID);
  const roomIndex = userList
    .map(user => user.id.toString())
    .indexOf(userID.toString());
  const inRoom = roomIndex >= 0;
  const inGame = inRoom && roomIndex < 4;

  // 更新用户的在线/离线状态
  const current = new Date().getTime();
  if (ownRoom) {
    // 房主会更新房间的活跃时间
    timeStamp = current;
  }
  if (!userStatus) userStatus = {};
  userStatus[userID] = current;
  roomData.userStatus = userStatus;
  const userOnlineStatus = handleOnlineStatus(roomData);

  const roomStatus = handleRoomStatus(roomData);

  // 历史游戏记录
  const gameHistoryList = [];
  for (let i = 0; i < gameHistory.length; i++) {
    const _id = gameHistory[i];
    const gameData = await Games.findOne(
      { _id },
      { userList: 1, timeStamp: 1 },
    );
    gameHistoryList.push(gameData);
  }

  await Rooms.findOneAndUpdate(
    {
      _id: roomData._id,
    },
    {
      userList,
      userStatus,
      timeStamp,
    },
  );
  return {
    ...roomData,
    id: _id,
    userList: userList,
    ownRoom,
    activeGame,
    inRoom,
    inGame,
    over,
    userOnlineStatus,
    ...roomStatus,
    gameHistory: gameHistoryList,
  };
}

function handleRoomStatus(roomData) {
  const { publicStatus, random, timer, relaxMode, teamMode } = roomData;

  const tags = [
    {
      text: publicStatus ? "公开房间" : "私密房间",
      red: !publicStatus,
    },
    {
      text: random ? "随机组队" : "固定组队",
      red: random,
    },
    {
      text: timer ? "限时" : "不限时",
      red: timer,
    },
  ];

  return {
    roomMode: {
      text: teamMode ? "团队模式" : relaxMode ? "休闲模式" : "赛季排位",
      red: !relaxMode,
    },
    tags,
  };
}

function handleOnlineStatus(roomData) {
  const current = new Date().getTime();
  let { userList, userStatus } = roomData;
  userStatus = userStatus || {};
  return userList
    .map(item => item.id)
    .map(id => {
      // 在线的标准为，10s内更新过timeStamp
      const timeStamp = userStatus[id];
      return timeStamp > current - 10000;
    });
}

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

// 创建房间 - v2
router.post("/v2/create", sessionUser, async (ctx, next) => {
  const { _id, userInfo } = ctx.state.user;
  const {
    publicStatus,
    random,
    timer,
    gameMode,
    specialRules,
  } = ctx.request.body;
  const userID = _id.toString();

  let room = await Rooms.create({
    timeStamp: +new Date(),
    userList: [
      {
        id: userID,
        userInfo,
      },
    ],
    owner: _id.toString(),
    random,
    timer,
    publicStatus,
    relaxMode: gameMode !== 0,
    teamMode: gameMode === 2,
    gameHistory: [],
    specialRules,
  });

  ctx.body = {
    id: room._id,
  };
});

// 获取大厅房间列表 - 分页
router.get("/hall/list/:pageNum", sessionUser, async ctx => {
  const { pageNum } = ctx.params;
  const Start = pageNum * 10;
  const { user } = ctx.state;
  const { _id } = user;
  // 3小时以内的房间
  const DEADLINE = Dayjs().subtract(3, "hour").valueOf();

  let roomList = await Rooms.find({
    publicStatus: true,
    over: { $ne: true },
    timeStamp: { $gt: DEADLINE },
    $where: "this.userList.length > 0",
  })
    .skip(Start)
    .limit(10)
    .sort({ timeStamp: -1 })
    .lean();

  // 处理房间的游戏over状态
  roomList = await checkRoomIsOver(roomList);

  roomList.forEach(room => {
    const { userList } = room;
    const index = userList.map(user => user.id).indexOf(_id.toString());
    if (index >= 0) {
      room.inRoom = true;
      room.ownRoom = judgeOwnRoomOrNot(room, _id);
    }
    room.userOnlineStatus = handleOnlineStatus(room);
  });

  ctx.body = {
    list: roomList,
    hallTimeRange: "3小时",
  };
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
    over: { $ne: true },
  })
    .sort({ timeStamp: -1 })
    .lean();

  let roomList = await Rooms.find({
    userList: { $elemMatch: { id: userID } },
    over: { $ne: true },
  })
    .sort({ timeStamp: -1 })
    .lean();

  // 处理房间的游戏over状态
  roomList = await checkRoomIsOver(roomList);
  roomList.forEach(room => {
    room.ownRoom = judgeOwnRoomOrNot(room, _id);
    room.userOnlineStatus = handleOnlineStatus(room);
  });

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
      // const userIndex = userList.map((e) => e.id).indexOf(userID);
      // if (userIndex > 3) {
      resList[index].observe = true;
      // }
    }
  });
  ctx.body = resList;
});

async function checkRoomIsOver(roomList) {
  const resList = [];
  for (let i = 0, L = roomList.length; i < L; i++) {
    const room = roomList[i];
    let { activeGame, _id, gameHistory, protected } = room;
    if (protected) {
      resList.push(room);
      continue;
    }
    const game = await Games.findOne({
      _id: activeGame,
    });
    if (!game) {
      await Rooms.findOneAndUpdate(
        {
          _id,
        },
        {
          activeGame: null,
          over: false,
        },
      );
      resList.push({ ...room, activeGame: null, over: false });
    } else if (game.over) {
      // 游戏结束后，房间不解散
      if (!gameHistory) gameHistory = [];
      gameHistory.push(activeGame);

      await Rooms.findOneAndUpdate(
        {
          _id,
        },
        {
          activeGame: null,
          gameHistory,
        },
      );
      resList.push({ ...room, activeGame: null });
    } else {
      resList.push(room);
    }
  }

  return resList;
}

router.getRoomData = getRoomData;

module.exports = router;
