
const Users = require('../models/user')

const sessionUser = async function (ctx, next) {
    const { nick, secret } = ctx.session
    let user = await Users.findOne({
        nick,
        secret,
    })

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