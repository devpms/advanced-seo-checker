var path = require('path');
var fs = require('fs');
var SEOChecker = require(path.resolve('./src/index'));

const urls = ['https://staging.lexus.com/'];
const user = 'lexus_user';
const pass = 'G0rill@23';

const crawler = SEOChecker(urls[0], {
  headers: {
    authorization: {
      username: user,
      password: pass
    }
  }
});
crawler.analyze(urls).then(function(summary) {
  fs.writeFileSync('output.json', JSON.stringify(summary));
}).catch((error) => {
  console.log(error);
});
