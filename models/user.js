var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var userInfoSchema = new Schema({
  nick: String,
  secret: String,
  game: String,
})

module.exports = mongoose.model('user',userInfoSchema)