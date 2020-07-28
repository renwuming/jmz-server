const router = require("koa-router")();
const Words = require("../models/word");
const dictionary = require("./code");
const { sessionUser, sessionUser_PC } = require("./middleware");

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

router.get("/audit", sessionUser_PC, async ctx => {
  const { _id } = ctx.state.user;
  // const { word } = ctx.request.body;
  // const exists = await Words.findOne({
  //   content: word,
  // });
  ctx.body = {
    _id,
  };
});

module.exports = router;
