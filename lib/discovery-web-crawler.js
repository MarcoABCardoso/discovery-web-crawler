/* eslint-disable no-undef */
const crypto = require('crypto')
const { IamAuthenticator } = require('ibm-watson/auth')
const DiscoveryV1 = require('ibm-watson/discovery/v1')
const SimpleCrawler = require('simplecrawler')
const cheerio = require('cheerio')


class DiscoveryWebCrawler {

    constructor(options) {
        this.config = { ...DiscoveryWebCrawler.getDefaultConfig(), ...options }

        // Set up internal APIs
        let authenticator = new IamAuthenticator({ apikey: this.config.apikey })
        this.discoveryV1 = new DiscoveryV1({ authenticator, serviceUrl: this.config.serviceUrl, version: this.config.version })
        this.started = false
        this.pagesReturned = 0

        this.simpleCrawler = SimpleCrawler(this.config.url)
        this.log = this.config.verbose ? console.log : () => { }
    }

    async handleFetch(queueItem, responseBuffer) {
        // Give up crawling if we reach too many pages
        this.pagesReturned += 1
        if (this.pagesReturned > this.config.maxPages) this.simpleCrawler.stop()

        // Do not index pages out of the original subpath
        if (!queueItem.url.startsWith(this.config.url)) return this.log('Denied a URL', queueItem.url)

        let content = await this.parseDocument(cheerio.load(responseBuffer.toString('utf-8')), queueItem)

        // Do not index URLs that don't pass the given condition
        if (!this.config.urlCondition(queueItem.url)) return this.log('Denied a URL', queueItem.url)
        // Do not index content that doesn't pass the given condition
        if (!this.config.contentCondition(content)) return this.log('Denied content from', queueItem.url)

        // Index this parsed document
        return this.handleDocument(content, queueItem)
    }

    async parseDocument($, queueItem) {
        return {
            meta: $('head > meta').toArray().reduce((acc, meta) => ({ ...acc, [meta.attribs.name]: meta.attribs.content }), {}),
            crawler_date: this.timestamp,
            crawler_url: this.config.url,
            url: queueItem.url,
            title: $('head > title').text().replace(/\s+/g, ' ').trim(),
            ...(await this.config.parse($, queueItem))
        }
    }

    async handleDocument(document, queueItem) {
        if (this.config.dryRun)
            this.log({
                documentId: crypto.createHash('sha1').update(queueItem.url).digest('hex'),
                environmentId: this.config.environmentId,
                collectionId: this.config.collectionId,
                fileName: document.title,
                file: document,
                fileContentType: 'application/json'
            })
        else
            this.discoveryV1.updateDocument({
                documentId: crypto.createHash('sha1').update(queueItem.url).digest('hex'),
                environmentId: this.config.environmentId,
                collectionId: this.config.collectionId,
                fileName: document.title,
                file: Buffer.from(JSON.stringify(document)),
                fileContentType: 'application/json'
            })
                .then(() => this.log('Indexed a document!'))
    }

    async start() {
        if (this.started) throw new Error('Crawler is already started')

        // Set up crawler
        this.simpleCrawler.on('fetchcomplete', this.handleFetch.bind(this))
        this.simpleCrawler.maxDepth = this.config.maxDepth
        this.simpleCrawler.addFetchCondition(this.config.fetchCondition)

        // Resolve on crawler complete
        this.promise = new Promise(resolve => this.simpleCrawler.on('complete', resolve))

        this.started = true
        this.timestamp = Date.now()
        this.simpleCrawler.start()
        return this.promise
    }
}

DiscoveryWebCrawler.getDefaultConfig = function () {
    return {
        version: '2021-01-01',
        maxDepth: 2,
        maxPages: 1000,
        fetchCondition: () => true,
        urlCondition: () => true,
        contentCondition: () => true,
        parse: async $ => ({ html: $.html() }),
    }
}

module.exports = DiscoveryWebCrawler