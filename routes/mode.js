const router = require('koa-router')()

router.prefix('/mode')

router.get('/', async function (ctx, next) {
  ctx.body = {
    mode: 'tool', // 工具模式
    // mode: 'game', // 游戏模式
  }
})

module.exports = router
