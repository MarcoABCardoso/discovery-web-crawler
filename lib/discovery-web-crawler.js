/* eslint-disable no-undef */
const crypto = require('crypto')
const { IamAuthenticator } = require('ibm-watson/auth')
const DiscoveryV1 = require('ibm-watson/discovery/v1')
const HCCrawler = require('headless-chrome-crawler-x')
const cheerio = require('cheerio')


class DiscoveryWebCrawler {

    constructor(options) {
        this.config = { ...DiscoveryWebCrawler.getDefaultConfig(), ...options }

        // Set up internal APIs
        let authenticator = new IamAuthenticator({ apikey: this.config.apikey })
        this.discoveryV1 = new DiscoveryV1({ authenticator, serviceUrl: this.config.serviceUrl, version: this.config.version })
        this.started = false

        this.log = this.config.verbose ? console.log : () => { }
    }

    async onSuccess(result) {
        if (!result.response.url.startsWith(this.config.url) || !this.config.urlCondition(result.response.url)) return this.log('Denied a URL', result.response.url)
        let $ = cheerio.load(result.result.data)
        let content = {
            meta: $('head > meta').toArray().reduce((acc, meta) => ({ ...acc, [meta.attribs.name]: meta.attribs.content }), {}),
            title: $('head > title').text().replace(/\s+/g, ' ').trim(),
            crawler_date: this.timestamp,
            crawler_url: this.config.url,
            url: result.response.url,
            ...(await this.config.parse($, result.response.url))
        }
        if (!this.config.contentCondition(content)) return this.log('Denied content from', content.url)

        if (this.config.dryRun)
            this.log({
                documentId: crypto.createHash('sha1').update(result.response.url).digest('hex'),
                environmentId: this.config.environmentId,
                collectionId: this.config.collectionId,
                fileName: content.title,
                file: content,
                fileContentType: 'application/json'
            })
        else
            this.discoveryV1.updateDocument({
                documentId: crypto.createHash('sha1').update(result.response.url).digest('hex'),
                environmentId: this.config.environmentId,
                collectionId: this.config.collectionId,
                fileName: content.title,
                file: Buffer.from(JSON.stringify(content)),
                fileContentType: 'application/json'
            })
                .then(() => this.log('Indexed a document!'))
    }

    async start() {
        if (this.started) throw new Error('Crawler is already started')
        this.started = true
        this.timestamp = Date.now()

        let crawler = await this.config.createCrawler({
            maxRequest: this.config.maxPages,
            preRequest: options => options.url.startsWith(this.config.url) && this.config.fetchCondition(options.url),
            evaluatePage: () => ({ data: $('*').html().replace(/>/g, '> ') }),
            onSuccess: this.onSuccess.bind(this),
            onError: (error => {
                this.log(error)
            })
        })

        crawler.queue({
            url: this.config.url,
            waitUntil: 'networkidle0',
            maxDepth: this.config.maxDepth,
            skipRequestedRedirect: true
        })
        await crawler.onIdle()
        return crawler.close()
    }
}

DiscoveryWebCrawler.getDefaultConfig = function () {
    return {
        createCrawler: HCCrawler.launch,
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