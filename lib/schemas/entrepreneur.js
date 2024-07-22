var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// schema should match the entrepreneur-questions.json 
var entrepreneurSchema = new Schema({
  form_id: {type: String, unique: true},
  name: String,
  email: String,
  phone: String,
  company_name: String,
});

var Entrepreneur = mongoose.model('Entrepreneur', entrepreneurSchema);

module.exports = Entrepreneur;
