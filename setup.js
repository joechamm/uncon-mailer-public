var fs = require('fs');
fs.exists('./config.js', function (exists) {
  if (!exists) {
    fs.createReadStream('./sample-config.js').pipe(fs.createWriteStream('./config.js'));
  }
});

