const router = require('koa-router')()
const request = require('request-promise')
const getCache = require('./cache')
const WXBizDataCrypt = require('./WXBizDataCrypt')
const config = require('./config')
const Users = require('../models/user')
const { sessionUser } = require('./middleware')

router.prefix('/wxweb')

// router.post('/userInfo', sessionUser, async ( ctx ) => {
//   const { user } = ctx.state
//   const { userInfo } = ctx.request.body
//   const { openid } = user
//   await Users.findOneAndUpdate({
//     openid
//   }, {
//     userInfo,
//   })
//   ctx.body = {}
// })

// router.post('/login', async ( ctx ) => {
//   const req = ctx.request.body
//   const params = {
//     appid: config.WebAppID,
//     secret: config.WebAppSecret,
//     code: req.code,
//     grant_type: 'authorization_code'
//   }
//   const res = JSON.parse(await request({
//     url: 'https://api.weixin.qq.com/sns/oauth2/access_token',
//     qs: params,
//   }))

//   if(res.errcode) {
//     console.error(res.errcode)
//     ctx.body = {}
//   } else {
//     // const sessionID = WXBizDataCrypt.randomKey()
//     // getCache().set(sessionID, res)
//     // await updateUserByOpenid(res)
//     ctx.body = {
//       openid: res,
//     }
//   }
// })

// async function updateUserByOpenid(data) {
//   const { openid } = data
//   const user = await Users.findOne({
//     openid
//   })
//   if(!user) {
//     await Users.create({
//       openid,
//     })
//   }
// }


// router.post("/session/validate", sessionUser, async ( ctx ) => {
//   const { user } = ctx.state

//   ctx.body = {
//     success: !!user
//   };
// });

module.exports = router
