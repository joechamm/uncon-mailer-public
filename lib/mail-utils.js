var fs = require('fs');
var path = require('path');
var validator = require('validator');
var nodemailer = require('nodemailer');

function MailUtils(options) {

  if (!options || !options.domainName || !options.keySelector || !options.keyFilename || !options.replyFilename || !options.errorContactFrom || !options.errorContactTo) {
    throw new Error('options {domainName, keySelector, transporterKeyFilename, replyFilename, errorContactFrom, errorContactTo required for MailUtils');
  }

  var replyText, replyHtml, replyContactFrom;
  var errorContactFrom = options.errorContactFrom;
  var errorContactTo = options.errorContactTo;
  var sendError = options.sendMail.error;
  var sendReply = options.sendMail.reply;
  var transporter = nodemailer.createTransport();

  fs.readFile(options.replyFilename, 'utf8', function (err, data) {
    if (err) {
      return console.error(err);
    }
    var replyMailObject = JSON.parse(data);
    replyText = replyMailObject.text;
    replyHtml = replyMailObject.html;
    replyContactFrom = replyMailObject.fromAddress;
  });

  fs.readFile(options.keyFilename, 'utf8', function (err, data) {
    if (err) {
      return console.error(err);
    }
    transporter.use('stream', require('nodemailer-dkim').signer({
      domainName: options.domainName,
      keySelector: options.keySelector,
      privateKey: data
    }));
  });

  return {
    processMailString: function processMailString (mailstring) {
      var encodedIndex = mailstring.indexOf('base64');
      if (encodedIndex >= 0) {
        var tempString = mailstring.split('base64\n\n')[1];
        var tempBuffer = new Buffer(tempString, 'base64');
        tempString = tempBuffer.toString();
        return validator.stripLow(tempString, false).replace(/\s\s+/g,' ');
      } else { 
        encodedIndex = mailstring.indexOf('{"form_id"');
        return validator.stripLow(mailstring.substring(encodedIndex), false).replace(/\s\s+/g,' ');
      }
    }, emailError: function emailError (errMsg) {
        if (sendError) {
          transporter.sendMail({
            from: errorContactFrom,
            to: errorContactTo,
            subject: 'uncon-mailer error',
            text: errMsg
          }, function (err, response) {
            var timestamp = new Date().toString();
            if (err) {        
              return console.error('Attempt to send error email to ' + errorContactTo + ' at ' + timestamp + ' resulted in error code: ' + err);
            }
            console.log('Sent error email to ' + errorContactTo + ' at ' + timestamp + ' returned response: ' + JSON.stringify(response));
          });
        }
      }, emailConfirmation: function emailConfirmation (toAddress) {
        if (sendReply) {
          transporter.sendMail({
            from: replyContactFrom,
            to: toAddress,
            subject: 'Capital Unconference Registration Confirmation',
            text: replyText,
            html: replyHtml
          }, function (err, response) {
            var timestamp = new Date().toString();
            if (err) {
              return console.error('Attempt to send registration confirmation to ' + toAddress + ' at ' + timestamp + ' resulted in error code: ' + err);
            }
            console.log('Sent registration confirmation to ' + toAddress + ' at ' + timestamp + ' returned response: ' + JSON.stringify(response));
          });
        }
      }
    };
}

module.exports = MailUtils;
