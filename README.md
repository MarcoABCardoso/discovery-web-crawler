<h1 align="center">discovery-web-crawler</h1>
<p>
  <a href="https://www.npmjs.com/package/discovery-web-crawler" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/discovery-web-crawler.svg">
  </a>
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
  <a href="https://codecov.io/gh/MarcoABCardoso/discovery-web-crawler">
    <img src="https://codecov.io/gh/MarcoABCardoso/discovery-web-crawler/branch/master/graph/badge.svg?token=GJ3A65PUIQ"/>
  </a>
  <a href="#" target="_blank">
    <img alt="Node.js CI" src="https://github.com/MarcoABCardoso/discovery-web-crawler/workflows/Node.js%20CI/badge.svg" />
  </a>
</p>

> Crawls a website and populates a Watson Discovery Collection.

## Install

```sh
npm install discovery-web-crawler
```

## Usage

The following snippet will gather Watson stories from the IBM website and index them in Watson Discovery.

```js
const DiscoveryWebCrawler = require('discovery-web-crawler')

let crawler = new DiscoveryWebCrawler({
    serviceUrl: 'YOUR_SERVICE_URL',
    apikey: 'YOUR_APIKEY',
    environmentId: 'YOUR_ENVIRONMENT_ID',
    collectionId: 'YOUR_COLLECTION_ID',

    url: 'https://www.ibm.com/watson/stories/',                                 // Starting point URL
    maxDepth: 3,                                                                // Max crawler depth
    fetchCondition: queueItem => queueItem.path.startsWith('/watson/'),         // Condition to crawl this URL
    urlCondition: url => !url.match('/list'),                                   // Condition to index this URL
    parse: async $ => ({ text: $('main').text().replace(/\s+/g, ' ').trim() }), // Cheerio API to extract JSON from HTML content
})
crawler.start()


```

## Run tests

```sh
npm run test
```

## Author

👤 **Marco Cardoso**

* Github: [@MarcoABCardoso](https://github.com/MarcoABCardoso)
* LinkedIn: [@marco-cardoso](https://linkedin.com/in/marco-cardoso)

## Show your support

Give a ⭐️ if this project helped you!