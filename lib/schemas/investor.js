var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// schema should match the investor-questions.json
var investorSchema = new Schema({
  form_id: {type: String, unique: true},
  name: String,
  email: String,
  phone: String,
  firm_name: String,
});

var Investor = mongoose.model('Investor', investorSchema);

module.exports = Investor;
