const request = require("request-promise");
const { validateUrl_wx, adminList } = require("./config");

const sessionUser = async function (ctx, next) {
  const ticket = ctx.request.header["x-ticket"] || ctx.cookies.get("ticket");
  try {
    user = await request({
      url: validateUrl_wx,
      method: "POST",
      json: true,
      body: {
        ticket,
      },
    });
    user.isAdmin = adminList && adminList.includes(user.openid);
    ctx.state.user = user;
    await next();
  } catch (error) {
    console.error(error);
    ctx.body = {
      code: 408,
      error: "登录超时",
    };
  }
};

module.exports = {
  sessionUser,
};
