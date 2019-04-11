const router = require('koa-router')()
const Games = require('../models/game')
const { sessionUser } = require('./middleware')

router.prefix('/games')

async function getGame(ctx, next) {
    const { id } = ctx.params
    try {
        let game = await Games.findOne({
            _id: id,
        })
        ctx.state.game = game.toObject()
        await next()
    } catch (e) {
        console.log(e.toString())
        ctx.body = {
            code: 500,
        }
    }
}

router.get('/:id', sessionUser, getGame, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    const game = ctx.state.game
    const userList = game.userList.map(item => item.id.toString())
    let index = userList.indexOf(_id.toString())
    // index = 2 // todo 测试修改

    if (index >= 0) {
        const teamIndex = Math.floor(index / 2)
        const { activeBattle } = game
        const battle = game.battles[activeBattle]
        const { desTeam, desUser, codes, question, answerE, answerF } = battle
        questionStrList = question ? question.map(str => str.replace(/\n/g, '')) : null
        const desIndex = desTeam * 2 + desUser
        const battleData = {
            desTeam,
            desUser,
            question: questionStrList,
            answerE: !!answerE,
            answerF: !!answerF,
        }
        if (index === desIndex) {
            battleData.codes = codes
        }
        const history = await getGameHistory(game)
        const gameResult = handleSum(history)

        ctx.body = {
            userIndex: index,
            userList: game.userList,
            teamWords: game.teams[teamIndex].words,
            battle: battleData,
            history,
            sumList: gameResult.sumList,
            gameOver: gameResult.gameOver,
            winner: gameResult.winner,
            activeBattle,
        }
    } else {
        ctx.body = {
            code: 501,
            error: '你不在游戏中',
        }
    }
})

function handleSum(historylist) {
    const resultMap = [ // 统计两队的得分情况
        {
            red: 0,
            black: 0,
            sum: 0,
        },
        {
            red: 0,
            black: 0,
            sum: 0,
        },
    ]
    historylist.forEach(round => {
        const { desTeam } = round
        if (round.red) {
            resultMap[1 - desTeam].red++
            resultMap[1 - desTeam].sum++
        }
        if (round.black) {
            resultMap[desTeam].black++
            resultMap[desTeam].sum--
        }
    })
    let winner
    let gameOver
    let winNum = 0
    let winFlag = false
    if (resultMap[0].black >= 2 || resultMap[1].red >= 2) {
        winFlag = true
        winNum++
    }
    if (resultMap[1].black >= 2 || resultMap[0].red >= 2) {
        winFlag = true
        winNum--
    }
    if (winFlag) {
        gameOver = true
        if (winNum > 0) winner = 1
        else if (winNum < 0) winner = 0
        else {
            if (resultMap[0].sum === resultMap[1].sum) winner = -1
            else winner = resultMap[0].sum > resultMap[1].sum ? 0 : 1
        }
    }

    return {
        gameOver,
        winner,
        sumList: resultMap.map(r => r.sum),
    }
}

async function getGameHistory(gameData) {
    const { battles } = gameData
    const L = battles.length
    let sliceNum = -2
    if (L % 2) {
        sliceNum = -1
    }
    const list = battles.slice(0, sliceNum)
    return list
}

// 提交到对应游戏
router.post('/:id/submit', sessionUser, getGame, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    const { code } = ctx.request.body
    const game = ctx.state.game
    let { activeBattle } = game
    const battle = game.battles[activeBattle]
    const answerUsers = getAnswerUsers(battle, game) // 筛选出答题人列表
    const type = answerUsers[_id]
    if (type) {
        battle[type] = code
        game.battles[activeBattle] = battle
        if (battle.question && battle.answerF && battle.answerE) {
            const codeF = battle.answerF.join('')
            const codeE = battle.answerE.join('')
            const codeStr = battle.codes.join('')
            if (codeF !== codeStr) battle.black = true
            if (codeE === codeStr) battle.red = true
            game.battles[activeBattle] = battle
            game.battles.push(createBattle(activeBattle))
            activeBattle++
        }

        await Games.findOneAndUpdate({
            _id: game._id,
        }, {
                battles: game.battles,
                activeBattle,
            })

        ctx.body = null
    } else {
        ctx.body = {
            code: 501,
            error: '你不在游戏中 or 未轮到你答题',
        }
    }
})

function getAnswerUsers(battle, game) {
    const list = {}
    const { desTeam, desUser } = battle
    if (!battle.question) {
        const { id } = game.teams[desTeam].userList[desUser]
        list[id] = 'question'
        return list
    }
    if (!battle.answerF) {
        const { id } = game.teams[desTeam].userList[1 - desUser]
        list[id] = 'answerF'
    }
    if (!battle.answerE) {
        const { id } = game.teams[1 - desTeam].userList[desUser]
        list[id] = 'answerE'
    }

    return list
}


router.gameInit = async function (userList) {
    userList.shuffle()
    const [words0, words1] = await getWords()
    const data = {
        userList,
        teams: [
            {
                userList: userList.slice(0, 2),
                words: words0,
            },
            {
                userList: userList.slice(2, 4),
                words: words1,
            }
        ],
        battles: [
            createBattle(-1),
        ],
        activeBattle: 0,
    }
    return data
}

function createBattle(lastBattle) {
    const newBattle = lastBattle + 1
    return {
        desUser: Math.floor(newBattle % 4 / 2),
        desTeam: newBattle % 2,
        codes: getCodes(),
    }
}

function getCodes() {
    const list = [0, 1, 2, 3]
    const del = Math.ceil(Math.random() * 4) - 1
    list.splice(del, 1)
    return list.shuffle()
}

async function getWords() {
    const words = [
        '铁拐李',
        '何仙姑',
        '张果老',
        '吕洞宾',
        '魔鬼',
        '图书',
        '零度',
        '冰',
        '电视',
        '互联网',
        '大海',
        '天空',
    ].shuffle()

    return [
        words.slice(0, 4),
        words.slice(4, 8),
    ]

}

Array.prototype.shuffle = function () {
    return this.sort(_ => Math.random() - .5)
}


module.exports = router
