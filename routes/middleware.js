const request = require('request-promise');
const { validateUrl_wx } = require('./config');
const getCache = require('./cache');

const sessionUser = async function(ctx, next) {
  const ticket = ctx.request.header['x-ticket'];
  try {
    const cache = getCache();
    let user = cache.get(ticket);
    if (!user) {
      user = await request({
        url: validateUrl_wx,
        method: 'POST',
        json: true,
        body: {
          ticket,
        },
      });
      cache.set(ticket, user);
    }
    ctx.state.user = user;
    await next();
  } catch (error) {
    console.error(error);
    ctx.body = {
      code: 408,
      error: '登录超时',
    };
  }
};

module.exports = {
  sessionUser,
};
