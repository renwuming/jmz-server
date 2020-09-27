var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var productionSchema = new Schema(
  {
    activeGame: String,
    userList: Array,
    timeStamp: Number,
    over: Boolean,
    random: Boolean, // 是否随机组队
    timer: Boolean, // 是否限时
    publicStatus: Boolean, // 是否公开房间
    relaxMode: Boolean, // 是否为赛季模式，true 休闲模式，false 赛季模式
    teamMode: Boolean, // 是否为团队模式
    userStatus: Object, // 玩家的离线/在线状态
    ownerQuitGame: Boolean, // 房主是否参与游戏
    gameHistory: Array, // 历史游戏记录
    owner: String, // 房主的_id
    specialRules: Object, // 特殊规则
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("room", productionSchema);
