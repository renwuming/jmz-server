var mongoose = require('mongoose')

var Schema = mongoose.Schema

var productionSchema = new Schema({
  activeGame: String,
  userList: Array,
  timeStamp: Number,
  over: Boolean,
  userStatus: Object, // 玩家的离线/在线状态
})

module.exports = mongoose.model('room', productionSchema)
