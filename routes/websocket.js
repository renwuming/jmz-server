const Koa = require('koa');
const router = require('koa-router')();
const websockify = require('koa-websocket');
const Games = require('../models/game');
const Rooms = require('../models/room');
const { sessionUser } = require('./middleware');
const { getGameData } = require('./game');
const { getRoomData } = require('./room');

const wsOptions = {};
const app = websockify(new Koa(), wsOptions);

app.ws.use(
  router
    .all('/', sessionUser, async ctx => {
      const userID = ctx.state.user._id.toString();
      ctx.websocket.on('message', async msg => {
        const [path, id] = msg.split('-');
        if (path === 'game') {
          let game =
            (await Games.findOne({
              _id: id,
            })) || {};
          game = game.toObject();
          const data = await getGameData(userID, game);
          ctx.websocket.send(JSON.stringify(data));
        } else if (path === 'room') {
          let room =
            (await Rooms.findOne({
              _id: id,
            })) || {};
          room = room.toObject();
          const data = await getRoomData(userID, room);
          ctx.websocket.send(JSON.stringify(data));
        }
      });
    })
    .routes(),
);

const port = 9994;
app.listen(port);
console.info('Websocket on ' + port);