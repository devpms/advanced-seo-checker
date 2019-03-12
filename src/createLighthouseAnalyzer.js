const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const lhConfig = require('./lighthouseConfig');
const msg = require('./helpers/msg-helper');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const crypto = require('crypto');
const fs = require('fs');

module.exports = (options) => {
  const throttling = options.throttling ? options.throttling : lhConfig.throttling.mobileSlow4G;

  function launchChromeAndRunLighthouse(url, flags = {}, config = null) {

    return chromeLauncher.launch(flags).then(chrome => {
      flags.port = chrome.port;

      function hardKillChrome(chrome, done) {
        const hardKillCommand = 'kill -9 ' + chrome.pid;
        exec(hardKillCommand,
          function(error, stdout, stderr) {
            console.log('CHROME INSTANCE WAS REMOVED: ' + chrome.pid);
          });
      }

      function softKillChrome(chrome, done) {
        chrome.kill().then(() => {
          msg.info('Chrome (PORT: ' + chrome.port + ') instance was killed successfully');
        }).catch(done);
      }

      function init(resolve, reject) {
        msg.info('Waiting for Chrome instance to be ready: ' + chrome.pid + ' (' + url + ')');
        setTimeout(function() {
          try {
            const options = Object.assign({}, flags, config);
            msg.info('Testing ' + url + ' using lighthouse using nodejs');
            //Wait to make sure that chrome instance is there and ready to serve
            lighthouse(url, flags).then(results => {
              // The gathered artifacts are typically removed as they can be quite large (~50MB+)
              delete results.artifacts;
              softKillChrome(chrome, () => {
                resolve(results);
              });
            }).catch((error) => {
              softKillChrome(chrome, () => {
                reject(error);
              });
            });
          } catch (error) {
            softKillChrome(chrome, () => {
              reject(error);
            });
          }

        }, 5000);
      }

      let promise = new Promise(init);
      return promise;
    });
  }

  function launchChromeAndRunLighthouseViaBash(url, flags = {}, config = null) {
    msg.info('Testing using enviroment lighthouse using bash script');

    function init(resolve, reject) {
      const jsonName = crypto.createHash('md5').update(url).digest('hex') + '.json';
      var yourscript = exec("lighthouse '" + url + "' --throttling.throughputKbps=" + config.throttling.throughputKbps + " --quiet --chrome-flags='--headless' --output=json --output-path=" + jsonName,
        (error, stdout, stderr) => {
          if (error === null) {
            const results = JSON.parse(fs.readFileSync(jsonName, 'utf8'));
            delete results.artifacts;
            setTimeout(function() {
              msg.info('Deleting ' + jsonName);
              fs.unlink(jsonName);
            }, 1000);
            resolve(results);
          } else {
            reject(error);
          }
        });
    }

    let promise = new Promise(init);
    return promise;
  }

  const chromeFlags = [
    // '--disable-gpu',
    // "--no-sandbox",
    // "--headless",
    // '--disable-background-networking',
    // '--safebrowsing-disable-auto-update',
    // '--disable-dev-shm-usage',
    // '--no-default-browser-check',
    '--process-per-tab',
    // '--new-window',
    // '--disable-notifications',
    // '--disable-desktop-notifications',
    // '--disable-component-update',
    // '--disable-background-downloads',
    // '--disable-add-to-shelf',
    // '--disable-datasaver-prompt',
    // '--disable-domain-reliability',
    // '--autoplay-policy=no-user-gesture-required',
    // '--disable-background-networking',
    // '--disable-sync',
    // '--disable-default-apps',
    // '--mute-audio',
    // '--no-first-run',
    // '--disable-background-timer-throttling',
    // '--disable-client-side-phishing-detection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--enable-automation'
  ];
  const getChromeFlags = () => {
    return {
      chromeFlags: chromeFlags,
      handleSIGINT: true,
      maxConnectionRetries: 2
    };
  }

  const analyzePage = (url) => {
    let trialsLimit = 3;
    let lunchingError = {};
    const config = {
      throttling: throttling
    };
    const init = (resolve, reject) => {
      trialsLimit--;
      if (!options.useTerminalOption && trialsLimit === 0) {
        reject(lunchingError);
      } else if (trialsLimit === 0) {
        launchChromeAndRunLighthouseViaBash(url, getChromeFlags(), config).then(results => {
          resolve(results);
        }).catch((error) => {
          lunchingError = error;
          msg.error(lunchingError);
          reject(error);
        });
      } else {
        launchChromeAndRunLighthouse(url, getChromeFlags(), config).then(results => {
          resolve(results);
        }).catch((error) => {
          lunchingError = error;
          msg.error(lunchingError);
          init(resolve, reject);
        });
      }
    };

    let promise = new Promise(init);
    return promise;
  };

  const analyzePages = (urls) => {
    const init = (resolve, reject) => {
      const promises = [];
      for (let i = 0; i < urls.length; i++) {
        promises.push(analyzePage(urls[i]));
      }
      Promise.all(promises).then(function(summary) {
        resolve(summary);
      }).catch(function(error) {
        reject(error);
      });
    };

    let promise = new Promise(init);
    return promise;
  };

  return {
    analyzePage,
    analyzePages
  }
};
