var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var productionSchema = new Schema({
  userList: Array,
  teams: Array,
  battles: Array,
  activeBattle: Number,
  over: Boolean,
  timeStamp: Number,
})

module.exports = mongoose.model('game',productionSchema)