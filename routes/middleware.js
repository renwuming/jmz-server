const request = require("request-promise");
const {
  validateUrl_wx,
  validateUrl_pc,
  adminList,
  superAuditorList,
  auditorList,
} = require("./config");

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
    handleRole(user);
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
    handleRole(user);
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

const sessionAuditor = async function (ctx, next) {
  const { isAuditor } = ctx.state.user;
  if (isAuditor) {
    await next();
    return;
  } else {
    ctx.body = {
      code: 408,
      error: "无权限",
    };
  }
};

function handleRole(data) {
  const { unionid } = data;
  if (adminList && adminList.includes(unionid)) {
    data.isAdmin = true;
  }
  if (auditorList && auditorList.includes(unionid)) {
    data.isAuditor = true;
  }
  if (superAuditorList && superAuditorList.includes(unionid)) {
    data.isSuperAuditor = true;
  }
}

module.exports = {
  sessionUser,
  sessionUser_PC,
  sessionAuditor,
};
