const router = require('koa-router')();
const Seasons = require('../models/seasons');

router.prefix('/seasons');

const defaultRankUser = {
  userInfo: {
    nickName: '???',
    avatarUrl: 'https://www.renwuming.cn/static/jmz/icon.jpg',
  },
  score: '??',
};
router.get('/newest/rank', async ctx => {
  const season = await getNewestSeason();
  const { userMap } = season;
  let rankList = [];
  if (userMap) {
    rankList = Object.keys(userMap)
      .map(key => {
        const { userInfo, score } = userMap[key];
        return {
          userInfo: {
            ...userInfo,
            id: key,
          },
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  const L = rankList.length;
  if (L < 10) {
    rankList = rankList.concat(new Array(10 - L).fill(defaultRankUser));
  }

  ctx.body = rankList.slice(0, 50);
});

router.get('/newest', async ctx => {
  const season = await getNewestSeason();
  ctx.body = season;
});

async function getNewestSeason() {
  const season = await Seasons.findOne()
    .sort({
      startAt: -1,
    })
    .lean();
  return season;
}

router.getNewestSeason = getNewestSeason;
module.exports = router;
