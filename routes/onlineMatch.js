const router = require("koa-router")();
const Games = require("../models/game");
const { sessionUser } = require("./middleware");
const getCache = require("./cache");

router.prefix("/online");

const SuccessLength = 4; // 4人则分组成功
router.SuccessLength = SuccessLength;
router.cancelMatch = cancelMatch;

// 随机匹配
router.post("/match/update", sessionUser, async ctx => {
  const cache = getCache();
  const { _id } = ctx.state.user;
  const userID = _id.toString();
  const timeStamp = new Date().getTime();

  // 更新匹配时间
  const matchData = cache.get(userID) || {};
  const { activeGame } = matchData;
  // 判断game是否已结束
  if (activeGame) {
    const game = await Games.findOne({ _id: activeGame });
    if (!game || game.over) {
      matchData.activeGame = null;
    } else {
      // 仅更新心跳timeStamp
      matchData.timeStamp = timeStamp;
      cache.set(userID, matchData);
      ctx.body = { activeGame };
      return;
    }
  }
  matchData.userData = ctx.state.user;
  matchData.userID = userID;
  matchData.timeStamp = timeStamp;
  // 分组信息
  let ResGroup;
  const GroupPool = cache.get("groupPool") || [];
  const { groupIndex } = matchData;
  // 已分组则不变
  if (!isNaN(groupIndex) && GroupPool[groupIndex]) {
    ResGroup = GroupPool[groupIndex];
  } else {
    // 加入在线匹配group池
    let NotFullGroupPool = GroupPool.filter(
      item => item.list && item.list.length < SuccessLength
    );
    const NotFullAndHasPlayers = NotFullGroupPool.filter(
      item => item.list && item.list.length > 0
    );
    // 优先加入有玩家的group
    if (NotFullAndHasPlayers.length > 0) {
      NotFullGroupPool = NotFullAndHasPlayers;
    }
    if (NotFullGroupPool.length > 0) {
      ResGroup = NotFullGroupPool[0];
      ResGroup.list.push(matchData);
      const { groupIndex } = ResGroup;
      GroupPool[groupIndex] = ResGroup;
      cache.set("groupPool", GroupPool);
      matchData.groupIndex = groupIndex;
    } else {
      const groupIndex = GroupPool.length;
      ResGroup = {
        timeStamp,
        groupIndex,
        list: [matchData]
      };
      GroupPool.push(ResGroup);
      cache.set("groupPool", GroupPool);
      matchData.groupIndex = groupIndex;
    }
  }

  cache.set(userID, matchData);

  ResGroup.list.forEach(item => {
    if (item.userID === userID) {
      item.me = true;
    }
  });
  // 计算开局倒计时
  const { startTime } = ResGroup;
  if (startTime) {
    ResGroup.countDownTime = startTime - timeStamp;
  }
  ctx.body = ResGroup;
});

// 取消 - 随机匹配
router.post("/match/cancel", sessionUser, async ctx => {
  const { _id } = ctx.state.user;
  const userID = _id.toString();

  cancelMatch(userID);

  ctx.body = null;
});

function cancelMatch(userID) {
  const cache = getCache();
  const matchData = cache.get(userID);
  // 分组匹配池中去除
  const { groupIndex } = matchData;
  const GroupPool = cache.get("groupPool") || [];
  const Group = GroupPool[groupIndex];
  const { success } = Group;
  // 若是已经准备开局的组，则解散该组
  if (success) {
    Group.list.forEach(matchData => {
      const { userID } = matchData;
      // 更新匹配时间、分组Index
      cache.set(userID, {
        ...matchData,
        timeStamp: 0,
        groupIndex: null
      });
    });
    Group.list = [];
    Group.success = false;
    Group.startTime = null;
    GroupPool[groupIndex] = Group;
    cache.set("groupPool", GroupPool);
  } else {
    // 若是尚未满人的组，则在该组中去除此成员
    const itemIndex = Group.list.map(e => e.userID).indexOf(userID);
    Group.list.splice(itemIndex, 1);
    GroupPool[groupIndex] = Group;
    cache.set("groupPool", GroupPool);
    // 更新匹配时间、分组Index
    cache.set(userID, {
      ...matchData,
      timeStamp: 0,
      groupIndex: null
    });
  }
}

module.exports = router;
