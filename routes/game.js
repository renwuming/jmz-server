const router = require('koa-router')()
const Games = require('../models/game')
const { sessionUser } = require('./middleware')
const dictionary = require('./code')

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
        let error
        if (!ctx.state.game) {
            error = '游戏ID不存在！'
        }
        ctx.body = {
            code: 500,
            error,
        }
    }
}

router.get('/:id', sessionUser, getGame, async (ctx, next) => {
    const { _id } = ctx.state.user
    const game = ctx.state.game
    const userList = game.userList.map(item => item.id.toString())
    let index = userList.indexOf(_id.toString())
    // index = 2 // todo 测试修改

    const { activeBattle, teams, over } = game
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
    const teamNames = teams.map(t => t.name)
    let { sumList, gameOver, winner } = gameResult
    if (gameOver && !over) { // 若游戏已结束，更新数据库
        await Games.findOneAndUpdate({
            _id: game._id,
        }, {
                over: gameOver,
            })
    }
    if(over) gameOver = true // 非正常情况，游戏被房主终止
    const teamIndex = Math.floor(index / 2)
    const bodyData = {
        userIndex: index,
        userList: game.userList,
        teamNames,
        battle: battleData,
        history,
        sumList: sumList,
        gameOver: gameOver,
        winner: winner,
        activeBattle,
    }

    if (index >= 0) {
        if (gameOver) {
            bodyData.enemyWords = teams[1 - teamIndex].words
        }
        const teamWords = teams[teamIndex].words
        bodyData.teamWords = teamWords
        ctx.body = bodyData
    } else {
        if (gameOver) {
            bodyData.allWords = teams.map(t => t.words)
        }
        ctx.body = bodyData
    }
})

// 小程序 - 获取游戏数据
router.get('/wx/:id', sessionUser, getGame, async (ctx, next) => {
    const { _id } = ctx.state.user
    const game = ctx.state.game
    const userList = game.userList.map(item => item.id.toString())
    let index = userList.indexOf(_id.toString())
    const teamIndex = Math.floor(index / 2)
    // index = 2 // todo 测试修改

    const { activeBattle, teams, over } = game
    const battle = game.battles[activeBattle]
    const { desTeam, desUser, codes, question, answerE, answerF } = battle
    questionStrList = question ? question.map(str => str.replace(/\n/g, '')) : ['', '', '']
    const desIndex = desTeam * 2 + desUser
    const jiemiIndex = desIndex % 2 === 0 ? desIndex + 1 : desIndex - 1
    const lanjieIndex = jiemiIndex >= 2 ? jiemiIndex - 2 : jiemiIndex + 2
    const actionPaperIndex = Math.abs(teamIndex - desTeam)
    // 处理battle数据
    const battleData = {
        desTeam,
        desUser,
        question: questionStrList,
        answerE: !!answerE,
        answerF: !!answerF,
        codes: [-1, -1, -1],
        type: '等待',
    }
    if (index === desIndex) {
        battleData.codes = codes
        if(!question) {
            battleData.type = '加密'
        }
    } else if (index === jiemiIndex) {
        battleData.type = '解密'
    } else if (index === lanjieIndex) {
        battleData.type = '拦截'
    }
    const battleList = codes.map((code, index) => {
        return {
            question: questionStrList[index],
            code: code,
            answer: -1,
        }
    })

    const history = await getGameHistory(game)
    const [history1, history2] = getWxGameHistory(history, teamIndex)
    const table1 = getHistoryTable(history1)
    const table2 = getHistoryTable(history2)
    const gameResult = handleSum(history)
    const teamNames = teams.map(t => t.name)
    let { sumList, gameOver, winner } = gameResult
    if (gameOver && !over) { // 若游戏已结束，更新数据库
        await Games.findOneAndUpdate({
            _id: game._id,
        }, {
                over: gameOver,
            })
    }
    if(over) gameOver = true // 非正常情况，游戏被房主终止
    const bodyData = {
        userIndex: index,
        userList: game.userList,
        teamNames,
        battleData,
        battle: battleList,
        history: history1,
        historyEnemy: history2,
        table: table1,
        tableEnemy: table2,
        sumList: sumList,
        gameOver: gameOver,
        winner: winner,
        roundNumber: activeBattle,
        type: battleData.type,
        enemyWords: ['??', '??', '??', '??'],
        desUser: game.userList[desIndex].userInfo,
        jiemiUser: game.userList[jiemiIndex].userInfo,
        lanjieUser: game.userList[lanjieIndex].userInfo,
        actionPaperIndex,
    }

    if (index >= 0) {
        if (gameOver) {
            bodyData.enemyWords = teams[1 - teamIndex].words
        }
        const teamWords = teams[teamIndex].words
        bodyData.teamWords = teamWords
        ctx.body = bodyData
    } else {
        if (gameOver) {
            bodyData.allWords = teams.map(t => t.words)
        }
        ctx.body = bodyData
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

function getWxGameHistory(list, teamIndex) {
    const history1 = []
    const history2 = []
    list.forEach((item, index) => {
        const { codes, question, answerF } = item
        const historyItem = codes.map((code, index2) => {
            return {
                question: question[index2],
                code,
                answer: answerF[index2],
            }
        })
        // 我方历史回合
        if(index % 2 === teamIndex) {
            history1.push(historyItem)
        } else {
            // 敌方历史回合
            history2.push(historyItem)
        }
    })
    return [history1, history2]
}

function getHistoryTable(history) {
    const table = [
        [],
        [],
        [],
        [],
    ]
    history.forEach(list => {
        list.forEach(item => {
            const { code, question } = item
            table[code].push(question)
        })
    })
    return table
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
        if (activeBattle <= 1 && battle.question && battle.answerF) { // 若为前两轮，只需要队友解密
            delete battle.answerE
            const codeF = battle.answerF.join('')
            const codeStr = battle.codes.join('')
            if (codeF !== codeStr) battle.black = true
            game.battles[activeBattle] = battle
            game.battles.push(createBattle(activeBattle))
            activeBattle++
        } else if (battle.question && battle.answerF && battle.answerE) {
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

// 小程序 - 提交到对应游戏
router.post('/wx/:id/submit', sessionUser, getGame, async (ctx, next) => {
    const { _id, nick } = ctx.state.user
    const { battle } = ctx.request.body
    console.log(battle)
    const { game } = ctx.state
    let { activeBattle } = game
    
    const newBattleData = game.battles[activeBattle]
    const answerUsers = getAnswerUsers(newBattleData, game) // 筛选出答题人列表
    const type = answerUsers[_id]
    if (type) {
        // 若为加密阶段
        if(type === 'question') {
            newBattleData[type] = battle.map(item => item.question)
        } else if(type === 'answerF' || type === 'answerE') {
            newBattleData[type] = battle.map(item => item.answer)
        }
        game.battles[activeBattle] = newBattleData
        if (activeBattle <= 1 && newBattleData.question && newBattleData.answerF) { // 若为前两轮，只需要队友解密
            delete newBattleData.answerE
            const codeF = newBattleData.answerF.join('')
            const codeStr = newBattleData.codes.join('')
            if (codeF !== codeStr) newBattleData.black = true
            game.battles[activeBattle] = newBattleData
            game.battles.push(createBattle(activeBattle))
            activeBattle++
        } else if (newBattleData.question && newBattleData.answerF && newBattleData.answerE) {
            const codeF = newBattleData.answerF.join('')
            const codeE = newBattleData.answerE.join('')
            const codeStr = newBattleData.codes.join('')
            if (codeF !== codeStr) newBattleData.black = true
            if (codeE === codeStr) newBattleData.red = true
            game.battles[activeBattle] = newBattleData
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
    const { activeBattle } = game
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
    if (activeBattle > 1 && !battle.answerE) {
        const { id } = game.teams[1 - desTeam].userList[1 - desUser]
        list[id] = 'answerE'
    }

    return list
}


router.gameInit = async function (userList, mode) {
    // 在随机模式下，将玩家列表打乱顺序
    if(!mode) {
        userList.shuffle()
    }
    const [team0, team1] = getTeamNames()
    const [words0, words1] = await getWords()
    const data = {
        userList,
        teams: [
            {
                name: team0,
                userList: userList.slice(0, 2),
                words: words0,
            },
            {
                name: team1,
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

router.stopGame = async function (id) {
    await Games.update({
        _id: id,
    }, {
        over: true,
    })
}

function getTeamNames() {
    return ['马里奥', '酷霸王']
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
    const words = dictionary.shuffle()
    return [
        words.slice(0, 4),
        words.slice(-4),
    ]

}

Array.prototype.shuffle = function () {
    return this.sort(_ => Math.random() - .5)
}

module.exports = router

