const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const lhConfig = require('./lighthouseConfig');
const msg = require('./helpers/msg-helper');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const crypto = require('crypto');
const fs = require('fs');

module.exports = (options) => {
  const throttling = options.throttling ? options.throttling : lhConfig.throttling.mobileSlow4G;

  const launchChromeAndRunLighthouse = (url, config = null) => {
    const init = (resolve, reject) => {
      (async () => {
        const browser = await puppeteer.launch({
          headless: true
        });
        let page = null;
        try {
          const wsEndpoint = browser.wsEndpoint();
          const port = Number(wsEndpoint.substring(wsEndpoint.indexOf('1:') + 2, wsEndpoint.indexOf('/dev')));

          msg.info('Preparing browser for ' + url + ' (PORT: ' + port + ')');
          if (options.headers && options.headers.authorization) {
            page = await browser.newPage();
            msg.info('Authenticating browser for ' + url + ' (PORT: ' + port + ')');
            await page.authenticate({
              username: options.headers.authorization.username,
              password: options.headers.authorization.password
            });
            await page.goto(url, {
              timeout: 3000000
            });
          }

          config.port = port;
          lighthouse(url, config).then(async (results) => {
            // The gathered artifacts are typically removed as they can be quite large (~50MB+)
            delete results.artifacts;
            msg.green('Testing ' + url + ' using lighthouse using nodejs was done');
            if (page) await page.close();
            await browser.close();
            resolve(results);
          }).catch(async (error) => {
            msg.error(error);
            if (page) await page.close();
            await browser.close();
            reject(error);
          });
        } catch (error) {
          msg.error(error);
          if (page) await page.close();
          await browser.close();
          reject(error);
        } finally {}
      })();
    };
    let promise = new Promise(init);
    return promise;
  };

  const analyzePage = (url) => {
    let trialsLimit = 3;
    let lunchingError = {};
    const config = {
      throttling: throttling
    };
    const init = (resolve, reject) => {
      trialsLimit--;
      if (trialsLimit === 0) {
        reject(lunchingError);
      } else {
        launchChromeAndRunLighthouse(url, config).then(results => {
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

  return {
    analyzePage
  }
};
