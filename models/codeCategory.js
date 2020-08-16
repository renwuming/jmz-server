var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var codeCategorySchema = new Schema({
  categoryID: String, // 类别ID
  category: String, // 类别
});

module.exports = mongoose.model("code_category", codeCategorySchema);
