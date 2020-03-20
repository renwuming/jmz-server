var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// 赛季数据库
var seasonSchema = new Schema(
  {
    name: String, // 赛季名称
    startAt: Date, // 开始时间
    endAt: Date, // 结束时间
    end: Boolean, // 是否已结束
    userMap: Object, // 参赛玩家列表
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('seasons', seasonSchema);
