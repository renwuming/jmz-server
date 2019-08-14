var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var userInfoSchema = new Schema({
  nick: String,
  secret: String,
  game: String,
  // 微信用户独有
  openid: String,
  userInfo: Object,
})

module.exports = mongoose.model('user',userInfoSchema)