const Dayjs = require('dayjs');
const router = require('koa-router')();
const Games = require('../models/game');
const Rooms = require('../models/room');
const { sessionUser } = require('./middleware');
const GameRouter = require('./game');
const UserRouter = require('./users');
const MODE = require('./config').mode;

router.prefix('/rooms');

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

// 小程序 - 开始某房间的游戏
router.post('/wx/:id/start', sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
  const { randomMode, quickMode } = ctx.request.body;
  const roomData = ctx.state.room;
  let { userList, activeGame } = roomData;
  // 已有游戏，则直接返回
  if (activeGame) {
    ctx.body = {
      id: activeGame,
    };
    return;
  }
  userList = userList.filter(user => user.userInfo);
  const roomOwnerID = userList.length > 0 ? userList[0].id.toString() : null;
  const ownRoom = roomOwnerID == _id;

  const playerFlag =
    MODE === 'game'
      ? userList.length >= 4
      : userList.length === 1 || userList.length >= 4;

  if (ownRoom && playerFlag) {
    const gameData = await GameRouter.gameInit(
      userList.slice(0, 4),
      randomMode,
      quickMode,
    );
    const game = await Games.create(gameData);
    const newGameId = game._id;
    await Rooms.findOneAndUpdate(
      {
        _id: roomData._id,
      },
      {
        $set: {
          activeGame: newGameId,
        },
      },
    );
    ctx.body = {
      id: newGameId,
    };
  } else {
    ctx.body = {
      code: 501,
      error: '人数不足',
    };
  }
});

// 加入房间
router.post('/:id', sessionUser, getRoom, async (ctx, next) => {
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
router.post('/:id/quit', sessionUser, getRoom, async (ctx, next) => {
  const { _id } = ctx.state.user;
  let roomData = ctx.state.room;

  if (roomData) {
    const userList = roomData.userList.map(user => user.id.toString());
    const userIndex = userList.indexOf(_id.toString());
    // 若为房主，则解散房间
    if (userIndex === 0) {
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
      error: '请求失败',
    };
  }
});

// 调整玩家顺序
router.post('/:id/edituserlist/:index', sessionUser, getRoom, async ctx => {
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
          _id: roomData._id,
        },
        roomData,
      );
      ctx.body = null;
    } else {
      ctx.body = {
        code: 502,
        error: '请求失败',
      };
    }
  } else {
    ctx.body = {
      code: 500,
      error: '请求失败',
    };
  }
});

// 小程序 - 获取房间数据
router.get('/wx/:id', sessionUser, getRoom, async (ctx, next) => {
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

async function getRoomData(userID, roomData) {
  let { userList, activeGame, over, _id, userStatus, timeStamp } = roomData;
  // 检查room的游戏是否结束
  await checkRoomIsOver([roomData]);

  userList = await updateAndHandleUserList(userList);
  const roomOwnerID = userList.length > 0 ? userList[0].id.toString() : null;
  const ownRoom = roomOwnerID == userID;
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
    id: _id,
    userList: userList,
    ownRoom,
    activeGame,
    inRoom,
    inGame,
    over,
    userOnlineStatus,
  };
}

function handleOnlineStatus(roomData) {
  const current = new Date().getTime();
  let { userList, userStatus } = roomData;
  userStatus = userStatus || {};
  return userList
    .map(item => item.id)
    .map(id => {
      // 在线的标准为，3s内更新过timeStamp
      const timeStamp = userStatus[id];
      console.log(timeStamp, current - 3000);
      return timeStamp > current - 3000;
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

// 创建房间
router.post('/', sessionUser, async (ctx, next) => {
  const { _id, userInfo } = ctx.state.user;
  const userID = _id.toString();
  const ownRoom = await Rooms.findOne({
    'userList.0.id': userID,
    over: { $ne: true },
  });

  // 如果已经拥有未结束的房间，则返回
  if (ownRoom) {
    ctx.body = {
      id: ownRoom._id,
    };
    return;
  }

  let room = await Rooms.create({
    timeStamp: +new Date(),
    userList: [
      {
        id: userID,
        userInfo,
      },
    ],
    mode: false,
    gameHistory: [],
  });

  ctx.body = {
    id: room._id,
  };
});

// 获取大厅房间列表 - 分页
router.get('/hall/list/:pageNum', sessionUser, async ctx => {
  const { pageNum } = ctx.params;
  const Start = pageNum * 10;
  const { user } = ctx.state;
  const { _id } = user;
  // 2小时以内的房间
  const DEADLINE = Dayjs()
    .subtract(2, 'hour')
    .valueOf();

  const roomList = await Rooms.find(
    {
      over: { $ne: true },
      timeStamp: { $gt: DEADLINE },
      $where: 'this.userList.length > 0',
    },
    {
      timeStamp: 1,
      userList: 1,
      activeGame: 1,
      userStatus: 1,
    },
  )
    .skip(Start)
    .limit(10)
    .sort({ timeStamp: -1 })
    .lean();

  roomList.forEach(room => {
    const { userList } = room;
    if (userList.map(user => user.id).includes(_id.toString())) {
      room.inRoom = true;
    }
    room.userOnlineStatus = handleOnlineStatus(room);
  });

  ctx.body = {
    list: roomList,
    hallTimeRange: '2小时',
  };
});

// 获取正在进行的游戏、未开始的房间列表 - 分页
router.get('/v3/list/:pageNum', sessionUser, async (ctx, next) => {
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

  let roomList = await Rooms.find(
    {
      userList: { $elemMatch: { id: userID } },
      over: { $ne: true },
    },
    {
      timeStamp: 1,
      userList: 1,
      activeGame: 1,
      userStatus: 1,
    },
  )
    .sort({ timeStamp: -1 })
    .lean();

  // 处理房间的游戏over状态
  roomList = await checkRoomIsOver(roomList);
  roomList.forEach(room => {
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
      const userIndex = userList.map(e => e.id).indexOf(userID);
      if (userIndex > 3) {
        resList[index].observe = true;
      }
    }
  });
  ctx.body = resList;
});

async function checkRoomIsOver(roomList) {
  const resList = [];
  for (let i = 0, L = roomList.length; i < L; i++) {
    const room = roomList[i];
    const { activeGame, _id } = room;
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
      resList.push(room);
    } else if (game.over) {
      await Rooms.findOneAndUpdate(
        {
          _id,
        },
        {
          over: true,
        },
      );
    } else {
      resList.push(room);
    }
  }

  return resList;
}

router.getRoomData = getRoomData;

module.exports = router;
