const router = require('koa-router')()
const { mode } = require('./config')

router.prefix('/mode')

router.get('/', async function (ctx, next) {
  ctx.body = {
    mode,
  }
})

module.exports = router
