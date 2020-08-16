var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var codeSchema = new Schema(
  {
    content: String, // 词条内容
    category: Array, // 类别ID数组
    difficult: Boolean, // 是否困难
    contributor: String, // 贡献者_id
    auditor: String, // 审核者unionid
    confirm: Boolean, // 是否确认状态
    discarded: Boolean, // 是否丢弃
    agreeList: Array, // 同意列表
    opposeList: Array, // 反对列表
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("code", codeSchema);
