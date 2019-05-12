const cheerio = require('cheerio');
const async = require('async');
const blc = require('broken-link-checker');
const fs = require('fs');
const stringSimilarity = require('string-similarity');
const createLHAnalyzer = require('./createLighthouseAnalyzer');
const msg = require('./helpers/msg-helper');

//TESTS COVERED
//Missing title tag
//Missing description tag
//Missing keywords tag
//Missing author tag
//Broken links
//Broken Images
//Too much text in title
//Duplicate h1 tag
//Duplicate meta title
//Duplicate meta desc
//Check if sitemap is exits
//Check if robot files exists
//SSLLabs Integration
//DOCType Check

const mainIssuesCategories = {
  errors: 'errors',
  warnings: 'warnings',
  notices: 'notices'
};

module.exports = (options) => {
  const getIssueCategory = (id) => {
    const categories = {
      'doctype': mainIssuesCategories.errors,
      'viewport': mainIssuesCategories.errors,
      'meta-viewport': mainIssuesCategories.errors,
      'document-title': mainIssuesCategories.errors,
      'duplicate-id': mainIssuesCategories.errors,
      'html-has-lang': mainIssuesCategories.errors,
      'content-width': mainIssuesCategories.errors,
      'valid-lang': mainIssuesCategories.errors,
      'html-lang-valid': mainIssuesCategories.errors,
      'meta-description': mainIssuesCategories.errors,
      'render-blocking-resources': mainIssuesCategories.errors,
      'unminified-css': mainIssuesCategories.errors,
      'unminified-javascript': mainIssuesCategories.errors,
      'is-crawlable': mainIssuesCategories.errors,
      'hreflang': mainIssuesCategories.errors,
      'canonical': mainIssuesCategories.errors,
      'plugins': mainIssuesCategories.errors,
      'errors-in-console': mainIssuesCategories.errors,
      'uses-optimized-images': mainIssuesCategories.errors,
      'geolocation-on-start': mainIssuesCategories.errors,
      'http-status-code': mainIssuesCategories.errors,
      'pwa-cross-browser': mainIssuesCategories.errors,
      'meta-refresh': mainIssuesCategories.errors,
      'uses-long-cache-ttl': mainIssuesCategories.errors,
      'uses-rel-preload': mainIssuesCategories.errors,
      'unused-css-rules': mainIssuesCategories.errors,
      'offscreen-images': mainIssuesCategories.errors,
      'managed-focus': mainIssuesCategories.warnings,
      'offscreen-content-hidden': mainIssuesCategories.warnings,
      'use-landmarks': mainIssuesCategories.warnings,
      'visual-order-follows-dom': mainIssuesCategories.warnings,
      'frame-title': mainIssuesCategories.warnings,
      'audio-caption': mainIssuesCategories.warnings,
      'video-caption': mainIssuesCategories.warnings,
      'video-description': mainIssuesCategories.warnings,
      'pwa-each-page-has-url': mainIssuesCategories.warnings,
      'font-display': mainIssuesCategories.warnings,
      'font-size': mainIssuesCategories.warnings,
      'heading-levels': mainIssuesCategories.warnings,
      'image-alt': mainIssuesCategories.warnings,
      'object-alt': mainIssuesCategories.warnings,
      'input-image-alt': mainIssuesCategories.warnings,
      'label': mainIssuesCategories.warnings,
      'layout-table': mainIssuesCategories.warnings,
      'uses-text-compression': mainIssuesCategories.warnings,
      'uses-responsive-images': mainIssuesCategories.warnings,
      'dom-size': mainIssuesCategories.warnings,
      'total-byte-weight': mainIssuesCategories.warnings,
      'critical-request-chains': mainIssuesCategories.warnings,
      'link-text': mainIssuesCategories.warnings,
      'external-anchors-use-rel-noopener': mainIssuesCategories.warnings,
      'password-inputs-can-be-pasted-into': mainIssuesCategories.warnings,
      'uses-rel-preconnect': mainIssuesCategories.warnings,
      'uses-webp-images': mainIssuesCategories.warnings,
      'efficient-animated-content': mainIssuesCategories.warnings,
      'image-aspect-ratio': mainIssuesCategories.warnings,
      'logical-tab-order': mainIssuesCategories.warnings,
      'deprecations': mainIssuesCategories.notices,
      'service-worker': mainIssuesCategories.notices,
      'works-offline': mainIssuesCategories.notices,
      'appcache-manifest': mainIssuesCategories.notices,
      'installable-manifest': mainIssuesCategories.notices,
      'robots-txt': mainIssuesCategories.notices,
      'no-websql': mainIssuesCategories.notices,
      'is-on-https': mainIssuesCategories.notices,
      'uses-http2': mainIssuesCategories.notices,
      'webapp-install-banner': mainIssuesCategories.notices,
      'splash-screen': mainIssuesCategories.notices,
      'themed-omnibox': mainIssuesCategories.notices,
      'redirects-http': mainIssuesCategories.notices,
      'redirects': mainIssuesCategories.notices,
      'without-javascript': mainIssuesCategories.notices,
      'no-mutation-events': mainIssuesCategories.notices,
      'no-document-write': mainIssuesCategories.notices,
      'no-vulnerable-libraries': mainIssuesCategories.notices,
      'notification-on-start': mainIssuesCategories.notices,
      'link-name': mainIssuesCategories.notices,
      'manifest-short-name-length': mainIssuesCategories.notices,
      'pwa-page-transitions': mainIssuesCategories.notices,
      'color-contrast': mainIssuesCategories.notices,
      'definition-list': mainIssuesCategories.notices,
      'dlitem': mainIssuesCategories.notices,
      'td-headers-attr': mainIssuesCategories.notices,
      'th-has-data-cells': mainIssuesCategories.notices,
      'custom-controls-labels': mainIssuesCategories.notices,
      'custom-controls-roles': mainIssuesCategories.notices,
      'focus-traps': mainIssuesCategories.notices,
      'focusable-controls': mainIssuesCategories.notices,
      'list': mainIssuesCategories.notices,
      'list-item': mainIssuesCategories.notices,
      'tab-index': mainIssuesCategories.notices,
      'structured-data': mainIssuesCategories.notices,
      'offline-start-url': mainIssuesCategories.notices,
      'accesskeys': mainIssuesCategories.notices,
      'aria-allowed-attr': mainIssuesCategories.notices,
      'aria-required-attr': mainIssuesCategories.notices,
      'aria-required-children': mainIssuesCategories.notices,
      'aria-required-parent': mainIssuesCategories.notices,
      'button-name': mainIssuesCategories.notices,
      'bypass': mainIssuesCategories.notices

    };
    return categories[id] ? categories[id] : mainIssuesCategories.notices;
  };

  const testTooMuchTextInTitle = (page) => {
    return {
      description: page.title ? '1 page have too much text within the title tags' : '1 pages don\'t have title tags',
      text: page.title ? page.title : '',
      value: page.title ? page.title.length <= 75 : 0,
      weight: 1,
      score: page.title && page.title.length <= 75 ? 100 : 0
    };
  };

  const countH1 = ($) => {
    const result = {
      description: '',
      weight: 1,
      value: $('h1').length
    };
    if (result.value === 0) {
      result.description = 'page doesn\'t contain any h1 heading';
    } else if (result.value > 1) {
      result.description = 'page have more than one H1 tag';
    }
    result.score = result.value === 1 ? 100 : 0;
    return result;
  };

  const discoverBrokenLinks = (url, body) => {
    const init = (resolve, reject) => {
      const broken = {
          a: {
            internal: [],
            external: []
          },
          img: {
            internal: [],
            external: []
          },
          source: {
            internal: [],
            external: []
          }
        },
        total = {
          a: {
            internal: [],
            external: []
          },
          img: {
            internal: [],
            external: []
          },
          source: {
            internal: [],
            external: []
          }
        };

      var htmlChecker = new blc.HtmlChecker({}, {
        link: function(result) {

          const type = result.internal ? 'internal' : 'external';
          if (!total[result.html.tagName]) {
            msg.appMsg('New tag detected: ' + result.html.tagName);
            total[result.html.tagName] = {
              internal: [],
              external: []
            };
            broken[result.html.tagName] = {
              internal: [],
              external: []
            };
          }
          total[result.html.tagName][type].push(result);
          if (result.broken) {
            broken[result.html.tagName][type].push(result);
          }
        },
        complete: function(result) {
          const res = {
            total: total,
            broken: broken,
            internalBrokenLinks: {
              description: broken.a.internal.length + ' internal links are broken',
              list: broken.a.internal,
              weight: 1,
              value: broken.a.internal.length,
              score: total.a.internal.length ? 100 - (broken.a.internal.length / total.a.internal.length) * 100 : 100
            },
            externalBrokenLinks: {
              description: broken.a.external.length + ' external links are broken',
              list: broken.a.external,
              weight: 1,
              value: broken.a.external.length,
              score: total.a.external.length ? 100 - (broken.a.external.length / total.a.external.length) * 100 : 100
            },
            internalBrokenImages: {
              description: broken.img.internal.length + ' internal images are broken',
              weight: 1,
              list: broken.img.internal.concat(broken.source.internal),
              value: broken.img.internal.length + broken.source.internal.length,
              score: total.img.internal.length ? 100 - ((broken.img.internal.length + broken.source.internal.length) / (total.img.internal.length + total.source.internal.length)) * 100 : 100
            },
            externalBrokenImages: {
              description: broken.img.external.length + ' external images are broken',
              weight: 1,
              list: broken.img.external.concat(broken.source.external),
              value: broken.img.external.length + broken.source.external.length,
              score: total.img.external.length ? 100 - ((broken.img.external.length + broken.source.external.length) / (total.img.external.length + total.source.external.length)) * 100 : 100
            }
          };
          resolve(res);
        }
      });
      htmlChecker.scan(body, url);
    };

    let promise = new Promise(init);
    return promise;
  };

  const calculateIssuesImpact = (page) => {
    for (const categoryKey in page.issues) {
      const category = page.issues[categoryKey];
      for (const issueKey in category) {
        if (category[issueKey].impact) {
          continue;
        }
        category[issueKey].impact = (100 - category[issueKey].score) * category[issueKey].weight;
      }
    }
  };

  const analyzePage = (url, body) => {
    const $ = cheerio.load(body),
      page = {};
    page.url = url;
    msg.yellowBright('Analyzing: ' + url);

    const init = (resolve, reject) => {

      page.title = $('title').text() || null;
      page.headers = {
        h1: [],
        h2: [],
        h3: [],
        h4: [],
        h5: [],
        h6: []
      }
      page.description = $('meta[name=description]').attr('content') || null;
      page.author = $('meta[name=author]').attr('content') || null;

      page.canonical = $('link[rel=canonical]').attr('href') || null;
      page.canonical = page.canonical ? page.canonical.trim().replace('\n', '') : page.canonical;
      page.keywords = $('meta[name=keywords]').attr('content') || null;
      page.issues = {
        errors: {},
        warnings: {},
        notices: {}
      };
      page.scores = {};
      page.metrics = {
        'first-contentful-paint': null,
        'first-meaningful-paint': null,
        'load-fast-enough-for-pwa': null,
        'speed-index': null,
        'estimated-input-latency': null,
        'time-to-first-byte': null,
        'first-cpu-idle': null,
        'interactive': null,
        'mainthread-work-breakdown': null,
        'bootup-time': null,
      };

      for (let i = 1; i <= 6; i++) {
        $('body h' + i).each(function() {
          const text = $(this).text();
          page.headers['h' + i].push(text ? text.trim().replace('\n', '') : text);
        });
      }
      page.h1 = $('body h1:first-child').text().trim().replace('\n', '');
      page.issues.warnings['multiple-h1'] = countH1($);
      page.issues.warnings['too-much-text-in-title'] = testTooMuchTextInTitle(page);

      if (options.ignoreInternalPagesIssues) {
        msg.yellow('Ignoring internal issues: ' + url);
        return resolve(page);
      }

      // const promises = [discoverBrokenLinks(url, body), createLHAnalyzer(createLHAnalyzer).analyzePage(url)];
      const promises = [createLHAnalyzer(options).analyzePage(url)];
      Promise.all(promises).then(function(results) {
        // page.blc = results[0];
        // page.lighthousedata = results[1].lhr;
        page.lighthousedata = results[0].lhr;
        page.body = JSON.parse(JSON.stringify(results[0].lhr));

        // page.issues.errors['internal-broken-links'] = page.blc.internalBrokenLinks;
        // page.issues.errors['external-broken-links'] = page.blc.externalBrokenLinks;
        // page.issues.errors['internal-broken-images'] = page.blc.internalBrokenImages;
        // page.issues.errors['external-broken-images'] = page.blc.externalBrokenImages;
        if (page.lighthousedata.error) {

        } else {
          const performanceCategory = page.lighthousedata.categories.performance;
          const seoCategory = page.lighthousedata.categories.seo;
          const pwaCategory = page.lighthousedata.categories.pwa;
          const accessibilityCategory = page.lighthousedata.categories.accessibility;
          const bestPracticesCategory = page.lighthousedata.categories['best-practices'];

          let auditsRefs = performanceCategory.auditRefs.concat(seoCategory.auditRef, bestPracticesCategory.auditRefs,
            pwaCategory.auditRefs, accessibilityCategory.auditRefs);
          auditsRefs = auditsRefs.filter((item) => {
            return item;
          });
          let mobileFriendlyAudit = {};
          const restructuredAudits = {};
          for (const auditRef of auditsRefs) {
            const audit = JSON.parse(JSON.stringify(page.lighthousedata.audits[auditRef.id]));
            if (audit.id === 'mobile-friendly') {
              mobileFriendlyAudit = audit;
            } else if (audit.score === null) {
              continue;
            }
            restructuredAudits[audit.id] = restructuredAudits[audit.id] ? restructuredAudits[audit.id] : [];
            restructuredAudits[audit.id].push(audit);
            audit.weight = auditRef.weight ? auditRef.weight : 1;
            audit.score *= 100;
            const issueCategory = getIssueCategory(audit.id);

            if (audit.result) {
              for (const key in audit.result) {
                audit[key] = audit[key] ? audit[key] : audit.result[key];
              }
              audit.description = audit.result.description;
            }
            audit.list = audit.list ? audit.list : [];
            if (audit.details && audit.details.items) {
              for (const [index, item] of audit.details.items.entries()) {
                audit.list.push(item.node ? item.node : item);
              }
            }
            delete audit.details;
            delete audit.extendedInfo;
            delete audit.result;
          }
          //Calculate average audi because the same issue could be found under multiple categories
          for (const auditKey in restructuredAudits) {
            const audits = restructuredAudits[auditKey];
            const firstAudit = audits[0];
            const sum = {
              weight: 0,
              score: 0
            };
            for (audit of audits) {
              sum.weight += audit.weight;
              sum.score += audit.score;
            }
            firstAudit.weight = sum.weight / audits.length;
            firstAudit.score = sum.score / audits.length;

            const issueCategory = getIssueCategory(firstAudit.id);
            page.issues[issueCategory][firstAudit.id] = firstAudit;
          }
          for (const metricKey in page.metrics) {
            page.metrics[metricKey] = page.lighthousedata.audits[metricKey];
          }
          page.metrics.summary = page.lighthousedata.audits['metrics'].details.items[0];

          for (const categoryKey in page.lighthousedata.categories) {
            page.scores[categoryKey] = page.lighthousedata.categories[categoryKey];
            delete page.scores[categoryKey].auditRefs;
          }
          page.loadingTimeline = page.lighthousedata.audits['screenshot-thumbnails'];
          page.isMobileFriendly = !mobileFriendlyAudit.score;
        }

        calculateIssuesImpact(page);

        msg.green('Analyzing: ' + url + ' was done');
        resolve(page);
      }).catch(function(err) {
        msg.error(err)
        reject(err);
      });
    };

    let promise = new Promise(init);
    return promise;
  };

  const analyzePages = (urls, bodies) => {
    const summary = {
      issues: {
        errors: {},
        warnings: {},
        notices: {}
      }
    };
    const init = (resolve, reject) => {
      const pages = [];
      async.eachSeries(urls, (url, done) => {
        const index = urls.indexOf(url);
        analyzePage(urls[index], bodies[index]).then((page) => {
          pages.push(page);
          done();
        }).catch((error) => {
          msg.error(error);
          done(error);
        });
      }, (error) => {
        summary.pages = pages;
        testDuplicate('duplicateTitlePages', 'title');
        testDuplicate('duplicateDescPages', 'description');
        // testDuplicateContent(urls, bodies);

        calculateIssuesImpact(summary);
        msg.green('All pages were analyzed');
        resolve(summary);
      });

      // Promise.all(promises).then(function(pages) {
      //
      // }).catch(function(err) {
      //   msg.error(err);
      //   reject(err);
      // });
    };

    const testDuplicateContent = (urls, bodies) => {
      summary.issues.errors.duplicateContentPages = {
        score: 0,
        weight: 1,
        impact: 0
      };
      let numberOfDuplicates = 0;
      const skip = {};
      for (let [firstIndex, first] of urls.entries()) {
        if (skip[first]) {
          continue;
        }
        for (let [secondIndex, second] of urls.entries()) {
          const similarity = stringSimilarity.compareTwoStrings(bodies[firstIndex], bodies[secondIndex]);
          if (similarity < 0.9 || skip[second] || first === second) {
            continue;
          }
          if (!summary.issues.errors.duplicateContentPages[first]) {
            summary.issues.errors.duplicateContentPages[first] = [];
          }
          const compareItem = {
            url: second,
            similarity: similarity
          };
          summary.issues.errors.duplicateContentPages[first].push(compareItem);
          numberOfDuplicates++;
          skip[second] = true;
        }
      }
      summary.issues.errors.duplicateContentPages.score = 100 - (numberOfDuplicates / (Math.sqrt(urls.length) / 2)) * 100;
    };

    const testDuplicate = (skey, pkey) => {
      const list = {};
      summary.issues.errors[skey] = {
        score: 0,
        weight: 1,
        impact: 0,
        list: []
      };
      let numberOfDuplicates = 0;
      let trials = 0;
      for (let i = 0; i < summary.pages.length; i++) {
        const first = summary.pages[i];

        for (let j = i + 1; j < summary.pages.length; j++) {
          const second = summary.pages[j];
          trials++;
          if (first[pkey] !== second[pkey]) {
            continue;
          }
          if (!summary.issues.errors[skey][first.url]) {
            list[first.url] = [];
          }
          const compareItem = {
            url: second.url
          }
          compareItem[pkey] = second[pkey];
          list[first.url].push(compareItem);
          numberOfDuplicates++;
        }
      }
      for (const key in list) {
        list[key].source = key;
        summary.issues.errors[skey].list.push(list[key]);
      }
      summary.issues.errors[skey].score = trials ? 100 - (numberOfDuplicates / trials) * 100 : 100;
    };
    let promise = new Promise(init);
    return promise;
  };
  return {
    analyzePage,
    analyzePages
  }
};
