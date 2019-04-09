var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var productionSchema = new Schema({
  activeGame: String,
  userList: Array,
//   gameList: Array,
})

module.exports = mongoose.model('room',productionSchema)