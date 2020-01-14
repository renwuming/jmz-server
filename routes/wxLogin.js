const router = require('koa-router')()
const request = require('request-promise')
const getCache = require('./cache')
const WXBizDataCrypt = require('./WXBizDataCrypt')
const config = require('./config')
const Users = require('../models/user')
const { sessionUser } = require('./middleware')

router.prefix('/wx')

router.post('/userInfo', sessionUser, async ( ctx ) => {
  const { user } = ctx.state
  const { userInfo } = ctx.request.body
  const { openid } = user
  await Users.findOneAndUpdate({
    openid
  }, {
    userInfo,
  })
  ctx.body = {}
})

router.post('/login', async ( ctx ) => {
  const req = ctx.request.body
  const params = {
    appid: config.AppID,
    secret: config.AppSecret,
    js_code: req.code,
    grant_type: 'authorization_code'
  }
  const res = JSON.parse(await request({
    url: 'https://api.weixin.qq.com/sns/jscode2session',
    qs: params,
  }))

  if(res.errcode) {
    console.error(res.errcode)
    ctx.body = {}
  } else {
    const sessionID = WXBizDataCrypt.randomKey()
    getCache().set(sessionID, res)
    await updateUserByOpenid(res)
    ctx.body = {
      sessionID,
    }
  }
})

async function updateUserByOpenid(data) {
  const { openid } = data
  const user = await Users.findOne({
    openid
  })
  if(!user) {
    await Users.create({
      openid,
      userInfo: createDefaultUserInfo(openid),
    })
  }
}

// 生成默认userInfo
const defaultAvatarUrl = 'https://www.renwuming.cn/static/jmz/icon.jpg'
function createDefaultUserInfo(openid) {
  const nickID = openid.substr(-4)
  return {
    nickName: `玩家${nickID}`,
    avatarUrl: defaultAvatarUrl,
  }
}


router.post("/session/validate", sessionUser, async ( ctx ) => {
  const { user } = ctx.state

  ctx.body = {
    success: !!user
  };
});

module.exports = router
