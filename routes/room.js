const router = require('koa-router')()
const Games = require('../models/game')
const Rooms = require('../models/room')
const { sessionUser } = require('./middleware')
const GameRouter = require('./game')

router.prefix('/rooms')

async function getRoom(ctx, next) {
    const { id } = ctx.params
    try {
        let room = await Rooms.findOne({
            _id: id,
        })
        ctx.state.room = room.toObject()
        await next()
    } catch (e) {
        console.log(e.toString())
        ctx.body = {
            code: 500,
        }
    }
}

// 开始某房间的游戏
router.post('/:id/start', sessionUser, getRoom, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    const roomData = ctx.state.room
    const { userList } = roomData
    const roomOwnerID = userList.length > 0 ? userList[0].id.toString() : null
    const ownRoom = roomOwnerID == _id

    if (ownRoom && userList.length >= 4) {
        const gameData = await GameRouter.gameInit(userList.slice(0, 4))
        const game = await Games.create(gameData)
        const newGameId = game._id
        await Rooms.findOneAndUpdate({
            _id: roomData._id,
        }, {
                $set: {
                    activeGame: newGameId,
                }
            })
        ctx.body = {
            id: newGameId,
        }
    } else {
        ctx.body = {
            code: 501,
            error: '你不是房主 or 人数不足',
        }
    }
})

// 加入房间
router.post('/:id', sessionUser, getRoom, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    let roomData = ctx.state.room

    if (roomData) {
        let flag = true // 是否需要插入user数据
        roomData.userList.forEach(user => {
            if (user.id.toString() == _id) {
                flag = false
            }
        })
        if (flag) {
            roomData.userList.push({
                id: _id,
                nick,
            })
            await Rooms.updateOne({
                _id: roomData._id,
            }, roomData)
        }
        ctx.body = null
    } else {
        ctx.body = {
            code: 500,
        }
    }
})

// 退出房间
router.post('/:id/quit', sessionUser, getRoom, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    let roomData = ctx.state.room

    if (roomData) {
        const userList = roomData.userList.map(user => user.id.toString())
        const userIndex = userList.indexOf(_id.toString())
        if (userIndex >= 0) {
            roomData.userList.splice(userIndex, 1)
            await Rooms.updateOne({
                _id: roomData._id,
            }, roomData)
        }
        ctx.body = null
    } else {
        ctx.body = {
            code: 500,
        }
    }
})

// 获取房间数据
router.get('/:id', sessionUser, getRoom, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    let roomData = ctx.state.room
    const { userList, activeGame } = roomData
    if (roomData) {
        const roomOwnerID = userList.length > 0 ? userList[0].id.toString() : null
        const ownRoom = roomOwnerID == _id
        const roomIndex = userList.map(user => user.id.toString()).indexOf(_id.toString())
        const inRoom = roomIndex >= 0
        const inGame = inRoom && roomIndex < 4
        ctx.body = {
            userList: roomData.userList,
            ownRoom,
            activeGame,
            inRoom,
            inGame,
        }
    } else {
        ctx.body = {
            code: 500,
        }
    }
})

// 创建房间
router.post('/', sessionUser, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    let room = await Rooms.create({
        userList: [{
            id: _id,
            nick,
        }],
    })

    ctx.body = {
        id: room._id,
    }
})

async function handleData(data) {
    if (data.toObject) {
        data = data.toObject()
    }
    return data
}


module.exports = router
