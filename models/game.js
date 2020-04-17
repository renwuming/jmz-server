var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var productionSchema = new Schema(
  {
    userList: Array,
    teams: Array,
    battles: Array,
    activeBattle: Number,
    over: Boolean,
    timeStamp: Number,
    quickMode: Boolean,
    lastStage: Object, // 上一个阶段 加密 or 解密拦截
    lock: Boolean,
    userStatus: Object, // 玩家的离线/在线状态
    relaxMode: Boolean, // 是否为赛季模式，true 休闲模式，false 赛季模式
    teamMode: Boolean, // 是否为团队模式
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('game', productionSchema);
