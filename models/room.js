var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var productionSchema = new Schema({
  activeGame: String,
  userList: Array,
  timeStamp: Number,
})

module.exports = mongoose.model('room',productionSchema)