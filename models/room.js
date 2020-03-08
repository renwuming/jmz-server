var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var productionSchema = new Schema({
  activeGame: String,
  userList: Array,
  timeStamp: Number,
  over: Boolean,
  random: Boolean, // 是否随机组队
  timer: Boolean, // 是否限时
  publicStatus: Boolean, // 是否公开房间
  userStatus: Object, // 玩家的离线/在线状态
});

module.exports = mongoose.model('room', productionSchema);
