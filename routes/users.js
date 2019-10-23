const router = require('koa-router')()
const Games = require('../models/game')
const gameRouter = require('./game')
const { sessionUser } = require('./middleware')
const request = require('request-promise')
const { logoutUrl } = require('./config')

router.prefix('/users')

router.get('/', sessionUser, async function(ctx, next) {
  ctx.body = handleUserObject(ctx.state.user)
})

router.post('/logout', async function(ctx, next) {
  const ticket = ctx.cookies.get('ticket')
  try {
    await request({
      url: logoutUrl,
      method: 'POST',
      json: true,
      body: {
        ticket
      }
    })
    ctx.body = {}
  } catch (error) {
    ctx.body = {
      code: 500,
      errMsg: '注销失败'
    }
  }
})

function handleUserObject(data) {
  if (data.toObject) {
    data = data.toObject()
  }
  return {
    nick: data.nick
  }
}

router.get('/history/games', sessionUser, async function(ctx, next) {
  let { _id } = ctx.state.user
  _id = _id.toString()
  const games = await Games.find({ over: true })
  const result = []
  games.forEach(game => {
    game = game.toObject()
    let { userList, battles } = game
    userList = userList.map(e => e.id.toString())
    const userIndex = userList.indexOf(_id)
    const teamIndex = userIndex >= 2 ? 1 : 0
    if (userList.includes(_id)) {
      const gameResult = gameRouter.handleSum(battles)
      const { winner } = gameResult
      game.status = winner === teamIndex ? '胜利' : '失败'
      result.push(game)
    }
  })

  ctx.body = result
})

module.exports = router
