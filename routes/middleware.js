const request = require('request-promise')
const { validateUrl } = require('./config')

const sessionUser = async function(ctx, next) {
  const ticket = ctx.cookies.get('ticket')
  try {
    const user = await request({
      url: validateUrl,
      method: 'POST',
      json: true,
      body: {
        ticket
      }
    })
    user.nick = user.userInfo.nickname
    ctx.state.user = user
    await next()
  } catch (error) {
    ctx.body = {
      code: 408,
      errMsg: '登录超时'
    }
  }
}

module.exports = {
  sessionUser
}
