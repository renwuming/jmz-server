const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const session = require('koa-session')
const cors = require('koa2-cors');
const mongoose = require('mongoose')

const index = require('./routes/index')
const users = require('./routes/users')
const game = require('./routes/game')
const room = require('./routes/room')


global.mongoose = mongoose.connect('mongodb://localhost:27017/jmz', { useNewUrlParser: true });


global.db = mongoose.connection;

// cors
app.use(cors({
  origin: function (ctx) {
    return ctx.request.header.origin
    // console.log(ctx.request.header.origin)
    return 'http://localhost:7456' // todo
  },
  maxAge: 5,
  credentials: true,
}))

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes: ['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// session
app.keys = ['renwuming']
app.use(session({}, app));

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})



// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())
app.use(game.routes(), game.allowedMethods())
app.use(room.routes(), room.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
