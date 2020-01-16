const request = require("request-promise");
const { validateUrl_wx } = require("./config");

const sessionUser = async function(ctx, next) {
  const ticket = ctx.headers["x-ticket"];
  try {
    const user = await request({
      url: validateUrl_wx,
      method: "POST",
      json: true,
      body: {
        ticket
      }
    });
    ctx.state.user = user;
    await next();
  } catch(error) {
    ctx.body = {
      code: 408,
      error: "登录超时"
    };
  }
};

module.exports = {
  sessionUser
};
