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
    const { _id } = ctx.state.user
    const roomData = ctx.state.room
    const { userList, mode } = roomData
    const roomOwnerID = userList.length > 0 ? userList[0].id.toString() : null
    const ownRoom = roomOwnerID == _id

    if (ownRoom && userList.length >= 4) {
        const gameData = await GameRouter.gameInit(userList.slice(0, 4), mode)
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

// 修改房间里玩家顺序
// todo 验证是否为房主
router.post('/:id/userList', sessionUser, getRoom, async ctx => {
    const { userList } = ctx.request.body
    let roomData = ctx.state.room
    if (roomData) {
        roomData.userList = userList
        await Rooms.updateOne({
            _id: roomData._id,
        }, roomData)
        ctx.body = {}
    } else {
        ctx.body = {
            code: 500,
        }
    }
})

// 修改房间的游戏模式
// todo 验证是否为房主
router.post('/:id/mode', sessionUser, getRoom, async ctx => {
    const { mode } = ctx.request.body
    let roomData = ctx.state.room
    if (roomData) {
        roomData.mode = mode
        await Rooms.updateOne({
            _id: roomData._id,
        }, roomData)
        ctx.body = {
            mode,
        }
    } else {
        ctx.body = {
            code: 500,
        }
    }
})

// 停止房间当前游戏
// todo 验证是否为房主
router.post('/:id/stop', sessionUser, getRoom, async ctx => {
    let roomData = ctx.state.room
    if (roomData) {
        roomData.gameHistory = roomData.gameHistory || []
        roomData.gameHistory.push(roomData.activeGame)
        roomData.activeGame = null
        await Rooms.updateOne({
            _id: roomData._id,
        }, roomData)
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
    const { userList, activeGame, mode } = roomData
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
            mode,
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
        timeStamp: +new Date(),
        userList: [{
            id: _id,
            nick,
        }],
        mode: false,
        gameHistory: [],
    })

    ctx.body = {
        id: room._id,
    }
})



// 获取房间列表 - 近一天的活跃房间
const DAY = 24 * 3600 * 1000
router.get('/', sessionUser, async (ctx, next) => {
    const now = +new Date()
    let roomList = await Rooms.find({
        timeStamp: {
            $gt: now - DAY,
        },
    })

    roomList = await handleData(roomList)

    ctx.body = roomList
})

async function handleData(list) {
    const L = list.length,
    resList = []
    for (let i = 0; i < L; i++) {
        const room = list[i]
        if(room.userList.length < 1) continue
        if (room.activeGame) {
            const game = await Games.findOne({
                _id: room.activeGame,
            })
            if(!game.over) {
                resList.push(room)
            }
        } else {
            resList.push(room)
        }
    }
    return resList
}


module.exports = router
