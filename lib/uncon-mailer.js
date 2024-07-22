var fs = require('fs');
var path = require('path');
var watch = require('watch');
var validator = require('validator');
var mongoose = require('mongoose');
var config = require('../config.json');
var Entrepreneur = require('./schemas/entrepreneur.js');
var Investors = require('./schemas/investor.js');
var MailUtils = require('./mail-utils.js');
var mailUtils = MailUtils(config);

mongoose.connect(config.dbURI);

mongoose.connection.on('error', function (err) {
  var timestamp = new Date().toString();
  console.error('Mongoose connection error at ' + timestamp + ': ' + err);
});

mongoose.connection.on('connected', function () {
  var timestamp = new Date().toString();
  console.log('Mongoose connected to ' + config.dbURI + ' at ' + timestamp);
});

mongoose.connection.on('disconnected', function () {
  var timestamp = new Date().toString();
  console.log('Mongoose disconnected to ' + config.dbURI + ' at ' + timestamp);
});

process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    var timestamp = new Date().toString();
    console.log('Mongoose disconnected through app termination at ' + timestamp);
    process.exit(0);
  });
});

function isEntrepreneur (testObj) {
  return ('company_name' in testObj);
}

function isInvestor (testObj) {
  return ('firm_name' in testObj);
}

function buildResponseModel (filename, callback) {
  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) {
      return callback(err, null);
    }
    var procString = mailUtils.processMailString(data);
    var responseModel = JSON.parse(procString);
    if (Object.keys(responseModel).length === 0 && responseModel.constructor === Object) {
      return callback('buildResponseModel returned empty object', null);
    }
    callback(null, responseModel);
  });
}

function storeAndEmailEntrepreneur (model) {
  var newEntrepreneur = new Entrepreneur(model);
  newEntrepreneur.save (function (err, entrepreneur) {
    var timestamp = new Date().toString();
    if (err) {
      mailUtils.emailError(err);
      return console.error('Failure to save entrepreneur ' + entrepreneur + ' at ' + timestamp + ' returned error: ' + err);
    }
    console.log('Saved entrepreneur ' + entrepreneur.name + ' at ' + timestamp);
    mailUtils.emailConfirmation(entrepreneur.email);
  });
}

function storeAndEmailInvestor (model) {
  var newInvestor = new Investor(model);
  newInvestor.save (function (err, investor) {
    var timestamp = new Date().toString();
    if (err) {
      mailUtils.emailError(err);
      return console.error('Failure to save investor ' + investor + ' at ' + timestamp + ' returned error: ' + err);
    }
    console.log('Saved investor ' + investor.name + ' at ' + timestamp);
    mailUtils.emailConfirmation(investor.email);
  });
}

function buildAndSaveModel (filename) {
  buildResponseModel(filename, function (buildErr, responseModel) {
    var formid, errorText, timestamp;
    if (buildErr) {
      timestamp = new Date().toString();
      mailUtils.emailError(buildErr);
      errorText = 'Failure to build model from file ' + filename + ' at ' + timestamp + ' returned error: ' + buildErr;
      return console.error(errorText);
    }
    if (isEntrepreneur(responseModel)) {
      formid = responseModel.form_id;
      Entrepreneur.count({ form_id: formid }, function (countErr, count) {
        if (countErr) {
          timestamp = new Date().toString();
          mailUtils.emailError(countErr);
          errorText = 'Entrepreneur count at ' + timestamp + ' returned error: ' + countErr;
          return console.error(errorText);
        }
        if (count > 0) {
          timestamp = new Date().toString();
          errorText = 'Attempted to add duplicate entreprenuer ' + responseModel.name + ' at ' + timestamp;
          mailUtils.emailError(errorText);
          return console.error(errorText);
        }
        storeAndEmailEntrepreneur(responseModel);
      });
    } else if (isInvestor(responseModel)) {
      formid = responseModel.form_id;
      Investor.count({ form_id: formid }, function (countErr, count) {
        if (countErr) {
          timestamp = new Date().toString();
          mailUtils.emailError(countErr);
          errorText = 'Investor count at ' + timestamp + ' returned error: ' + countErr;
          return console.error(errorText);
        }
        if (count > 0) {
          timestamp = new Date().toString();
          errorText = 'Attempted to add duplicate investor ' + responseModel.name + ' at ' + timestamp;
          mailUtils.emailError(errorText);
          return console.error(errorText);
        }
        storeAndEmailInvestor(responseModel);
      });
    } else {
      timestamp = new Date().toString();
      errorText = 'Attempted to build invalid model ' + JSON.stringify(responseModel) + ' at ' + timestamp;
      mailUtils.emailError(errorText);
      return console.error(errorText);
    }
  });
}

watch.createMonitor(config.mailWatchDirectory, function (monitor) {
  monitor.on('created', function (filename, stat) {
    buildAndSaveModel(filename);
  });
});
