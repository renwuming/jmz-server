
const getCache = require('./cache')
const Users = require('../models/user')

const sessionUser = async function (ctx, next) {
    const { sessionid } = ctx.request.header
    let user

    // 微信登录
    if(sessionid) {
        const openData = getCache().get(sessionid) || {}
        const { openid } = openData
        if(!openid) user = null
        else {
            user = await Users.findOne({
                openid,
            })
        }
    } else { // 用户名登录
        const { nick, secret } = ctx.session
        if(!nick || !secret) user = null
        else {
            user = await Users.findOne({
                nick,
                secret,
            })
        }
    }

    if (user) {
        ctx.state.user = user.toObject()
        await next()
    } else {
        ctx.body = {
            code: 408,
            errMsg: "登录超时",
        }
    }
}



module.exports = {
    sessionUser,
}