var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var wordSchema = new Schema({
  userID: String, // 贡献者ID
  content: String, // 词条内容
})

module.exports = mongoose.model('word',wordSchema)