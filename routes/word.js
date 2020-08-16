const router = require("koa-router")();
const Words = require("../models/word");
const Codes = require("../models/code");
const codeCategories = require("../models/codeCategory");
const dictionary = require("./code");
const { sessionUser, sessionUser_PC, sessionAuditor } = require("./middleware");
const { getUserDataUrl, getUserListUrl } = require("./config");
const request = require("request-promise");

router.prefix("/words");

router.post("/add", sessionUser, async ctx => {
  const { _id } = ctx.state.user;
  const { word } = ctx.request.body;
  const exists = await Words.findOne({
    content: word,
  });

  if (exists || dictionary.includes(word)) {
    ctx.body = {
      code: 501,
      error: "词条已存在",
    };
  } else {
    const newWord = new Words({
      content: word,
      userID: _id,
    });
    await newWord.save();
    ctx.body = null;
  }
});

router.get("/category/list", async ctx => {
  ctx.body = await codeCategories.find().lean();
});

router.get("/discard/list", async ctx => {
  ctx.body = await Codes.find({
    discarded: true,
  }).lean();
});

router.get("/category/list/:categoryID", async ctx => {
  const { categoryID } = ctx.params;
  ctx.body = await Codes.find({
    category: { $in: [categoryID] },
    confirm: true,
  }).lean();
});

router.get("/audit", sessionUser_PC, sessionAuditor, async ctx => {
  const { lastcode } = ctx.request.query;
  const randomCode = await Codes.aggregate([
    {
      $match: {
        $or: [{ category: { $exists: false } }, { category: { $size: 0 } }], // 尚未分类
        confirm: { $ne: true }, // 未确认
        discarded: { $ne: true }, // 未被丢弃
      },
    },
    { $sample: { size: 2 } },
  ]);
  const resultCode = randomCode.filter(e => e.content !== lastcode);
  if (resultCode.length > 0) {
    ctx.body = await handleCode(resultCode[0]);
  } else {
    ctx.body = await handleCode(randomCode[0]);
  }
});

router.post("/audit", sessionUser_PC, sessionAuditor, async ctx => {
  const { unionid } = ctx.state.user;
  const { _id, ...updateData } = ctx.request.body;
  await Codes.findOneAndUpdate(
    {
      _id,
    },
    {
      ...updateData,
      auditor: unionid,
    },
  );
  ctx.body = null;
});

router.get("/confirm", sessionUser_PC, sessionAuditor, async ctx => {
  const { unionid, isSuperAuditor } = ctx.state.user;
  const { lastcode } = ctx.request.query;
  const randomCode = await Codes.aggregate([
    {
      $match: {
        category: { $nin: [undefined, []] }, // 已经分类
        confirm: { $ne: true }, // 未确认
        discarded: { $ne: true }, // 未被丢弃
        agreeList: isSuperAuditor
          ? { $ne: "never exists" }
          : { $nin: [unionid] }, // 没有“赞同”过
        opposeList: isSuperAuditor
          ? { $ne: "never exists" }
          : { $nin: [unionid] }, // 没有“反对”过
      },
    },
    { $sample: { size: 2 } },
  ]);
  const resultCode = randomCode.filter(e => e.content !== lastcode);
  if (resultCode.length > 0) {
    ctx.body = await handleCode(resultCode[0]);
  } else {
    ctx.body = await handleCode(randomCode[0]);
  }
});

router.post("/confirm", sessionUser_PC, sessionAuditor, async ctx => {
  const { isSuperAuditor } = ctx.state.user;
  if (isSuperAuditor) {
    const { _id } = ctx.request.body;
    await Codes.findOneAndUpdate(
      {
        _id,
      },
      {
        confirm: true,
      },
    );
  }

  ctx.body = null;
});

router.post("/confirm/reaudit", sessionUser_PC, sessionAuditor, async ctx => {
  const { isSuperAuditor } = ctx.state.user;
  if (isSuperAuditor) {
    const { _id } = ctx.request.body;
    await Codes.findOneAndUpdate(
      {
        _id,
      },
      {
        category: [],
        difficult: false,
        agreeList: [],
        opposeList: [],
        discarded: false,
      },
    );
  }

  ctx.body = null;
});

router.post("/confirm/agree", sessionUser_PC, sessionAuditor, async ctx => {
  const { unionid } = ctx.state.user;
  const { _id } = ctx.request.body;

  const codeData = await Codes.findOne({
    _id,
  }).lean();
  const { agreeList, opposeList } = codeData;
  const newAgreeList = [...new Set((agreeList || []).concat(unionid))];
  if (opposeList.includes(unionid)) {
    const index = opposeList.indexOf(unionid);
    opposeList.splice(index, 1);
  }
  await Codes.findOneAndUpdate(
    {
      _id,
    },
    {
      agreeList: newAgreeList,
      opposeList,
    },
  );
  ctx.body = null;
});

router.post("/confirm/oppose", sessionUser_PC, sessionAuditor, async ctx => {
  const { unionid } = ctx.state.user;
  const { _id } = ctx.request.body;

  const codeData = await Codes.findOne({
    _id,
  }).lean();
  const { opposeList, agreeList } = codeData;
  const newList = [...new Set((opposeList || []).concat(unionid))];
  if (agreeList.includes(unionid)) {
    const index = agreeList.indexOf(unionid);
    agreeList.splice(index, 1);
  }
  await Codes.findOneAndUpdate(
    {
      _id,
    },
    {
      opposeList: newList,
      agreeList,
    },
  );
  ctx.body = null;
});

async function handleCode(code) {
  if (!code) return null;
  const { category, agreeList, opposeList, auditor, contributor } = code;
  const categoryList = [];
  for (let i = 0; i < category.length; i++) {
    categoryList.push(
      await codeCategories.findOne({ categoryID: category[i] }),
    );
  }
  code.category = categoryList;
  for (let i = 0; i < agreeList.length; i++) {
    const list = await request({
      url: getUserListUrl,
      method: "GET",
      json: true,
      body: agreeList.map(id => ({ unionid: id })),
    });
    code.agreeList = list;
  }
  for (let i = 0; i < opposeList.length; i++) {
    const list = await request({
      url: getUserListUrl,
      method: "GET",
      json: true,
      body: opposeList.map(id => ({ unionid: id })),
    });
    code.opposeList = list;
  }
  auditor &&
    (code.auditor = await request({
      url: getUserDataUrl,
      method: "GET",
      json: true,
      body: { unionid: auditor },
    }));
  contributor &&
    (code.contributor = await request({
      url: getUserDataUrl,
      method: "GET",
      json: true,
      body: { _id: contributor },
    }));
  return code;
}

module.exports = router;
