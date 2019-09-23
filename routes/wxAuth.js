const router = require('koa-router')()
const request = require('request-promise')
const getCache = require('./cache')
const config = require('./config')

router.prefix('/wxauth')

async function getAccessToken() {
  const cache = getCache()
  let access_token = cache.get('access_token')

  if(access_token) {
    return access_token
  } else {
    const params = {
      appid: config.AppID,
      secret: config.AppSecret,
      grant_type: 'client_credential',
    }
    const result = JSON.parse(await request({
      url: 'https://api.weixin.qq.com/cgi-bin/token',
      qs: params,
    }))
    access_token = result.access_token
    // 缓存access_token为7000s
    cache.set('access_token', access_token, 7000)
    return access_token
  }
}

router.post('/msgSecCheck', async ( ctx ) => {
  const { content } = ctx.request.body
  const SecFlag = await msgSecCheck(content)

  ctx.body = SecFlag
})


async function msgSecCheck(content) {
  const access_token = await getAccessToken()

  const result = await request.post({
    method: "POST",
    url: 'https://api.weixin.qq.com/wxa/msg_sec_check',
    qs: {
      access_token,
    },
    json: true,
    body: {
      content,
    },
  })

  const { errcode } = result

  if(errcode === 87014) {
    return false
  } else {
    return true
  }
}

async function msgListSecCheck(list) {
  const secResult = []
  for(let i=0, L=list.length; i<L; i++) {
    const secFlag = await msgSecCheck(list[i])
    if(!secFlag) {
      secResult.push(i)
    }
  }

  return secResult
}


router.msgSecCheck = msgSecCheck
router.msgListSecCheck = msgListSecCheck


module.exports = router
