const request = require("request-promise");
const { validateUrl_wx, validateUrl_pc, adminList } = require("./config");

const sessionUser = async function (ctx, next) {
  const ticket = ctx.request.header["x-ticket"];
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

const sessionUser_PC = async function (ctx, next) {
  const ticket = ctx.cookies.get("ticket");
  try {
    user = await request({
      url: validateUrl_pc,
      method: "POST",
      json: true,
      body: {
        ticket,
      },
    });
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
  sessionUser_PC,
};
