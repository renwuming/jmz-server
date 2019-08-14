const router = require('koa-router')()
const Users = require('../models/user')
const { sessionUser } = require('./middleware')

router.prefix('/users')

router.get('/', sessionUser, async function (ctx, next) {
  ctx.body = handleUserObject(ctx.state.user)
})

router.post('/', async function (ctx, next) {

  const { nick, secret } = ctx.request.body
  if(!nick || !secret) {
    ctx.body = {
      code: 500,
      error: '用户名 or 密码错误',
    }
    return
  }

  let user = await Users.findOne({
    nick,
    secret,
  })

  if (!user) {
    user = await Users.create({
      nick,
      secret,
    })
  }

  ctx.session.nick = nick
  ctx.session.secret = secret

  ctx.body = handleUserObject(user)
})

function handleUserObject(data) {
  if(data.toObject) {
    data = data.toObject()
  }
  delete data.openid // 去掉openid
  delete data.secret // 去掉secret
  delete data._id
  delete data.__v
  return data
}

module.exports = router
