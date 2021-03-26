/* eslint-disable no-undef */
const DiscoveryV1 = require('ibm-watson/discovery/v1')
const Crawler = require('simplecrawler')
const DiscoveryWebCrawler = require('../lib')


let discoveryMock = {
    updateDocument: jest.fn(x => Promise.resolve(x))
}

let getSimpleCrawlerMock = () => ({
    stopped: false,
    stop: () => this.stopped = true,
    start: async () => {
        let urls = ['foo_url', 'foo_url/target_path', 'foo_url/target_path/subpath_1', 'foo_url/target_path/subpath_2', 'foo_url/other_path', 'foo_url/assets']
        for (let i = 0; i < urls.length; i++) {
            // if (this.stopped) break
            if (this.fetchCondition({ url: urls[i] }))
                await this.fetchcomplete({ url: urls[i] }, Buffer.from(`<head><title>Foo title ${i}</title><meta name="foo" content="bar"></head><main>Foo content ${i}</main>`))
        }
        this.complete()
    },
    on: (name, func) => this[name] = func,
    addFetchCondition: (func) => this.fetchCondition = func
})

let options1 = {
    serviceUrl: 'foo_service_url',
    version: 'foo_version',
    apikey: 'foo_apikey',
    environmentId: 'foo_environment_id',
    collectionId: 'foo_collection_id',
    maxPages: 3,

    url: 'foo_url',
    dryRun: true,
    verbose: true,
}

let options2 = {
    serviceUrl: 'foo_service_url',
    version: 'foo_version',
    apikey: 'foo_apikey',
    environmentId: 'foo_environment_id',
    collectionId: 'foo_collection_id',

    url: 'foo_url/target_path',

    parse: async $ => ({ text: $('main').text().replace(/\s+/g, ' ').trim() }),
    urlCondition: url => !url.includes('/subpath_2'),
    contentCondition: content => !content.text.includes('Foo content 1'),
}

describe('DiscoveryWebCrawler', () => {
    describe('#constructor', () => {
        let crawler = new DiscoveryWebCrawler(options1)
        it('Creates an instance of DiscoveryWebCrawler', () => {
            expect(crawler).toBeInstanceOf(DiscoveryWebCrawler)
        })
        it('Sets discoveryV1 to an instance of the Watson DiscoveryWebCrawler V1 SDK with the given parameters', () => {
            expect(crawler.discoveryV1).toBeInstanceOf(DiscoveryV1)
            expect(crawler.discoveryV1.baseOptions.serviceUrl).toBe('foo_service_url')
            expect(crawler.discoveryV1.baseOptions.version).toBe('foo_version')
            expect(crawler.discoveryV1.authenticator.apikey).toBe('foo_apikey')
            expect(crawler.simpleCrawler).toBeInstanceOf(Crawler)
        })
    })

    describe('#start', () => {
        describe('When dryRun is on', () => {
            let crawler = new DiscoveryWebCrawler(options1)
            it('Executes crawling and logs documents', (done) => {
                crawler.discoveryV1 = discoveryMock
                crawler.simpleCrawler = getSimpleCrawlerMock()
                crawler.start()
                    .catch(err => done.fail(err))
                    .then(() => {
                        expect(discoveryMock.updateDocument).not.toHaveBeenCalled()
                        done()
                    })
            })
        })
        describe('When dryRun is off', () => {
            let crawler = new DiscoveryWebCrawler(options2)
            it('Executes crawling and indexes documents', (done) => {
                crawler.discoveryV1 = discoveryMock
                crawler.simpleCrawler = getSimpleCrawlerMock()
                crawler.start()
                    .catch(err => done.fail(err))
                    .then(() => {
                        let doc = discoveryMock.updateDocument.mock.calls[0][0]
                        let file = JSON.parse(doc.file.toString('utf-8'))
                        delete doc.file
                        delete file.crawler_date
                        expect(doc).toEqual({
                            'documentId': '4d88fddafbbe0da02bf61b98e0cf39cb9a1cf32a',
                            'environmentId': 'foo_environment_id',
                            'collectionId': 'foo_collection_id',
                            'fileContentType': 'application/json',
                            'fileName': 'Foo title 2',
                        })
                        expect(file).toEqual({
                            'crawler_url': 'foo_url/target_path',
                            'meta': {
                                'foo': 'bar',
                            },
                            'text': 'Foo content 2',
                            'title': 'Foo title 2',
                            'url': 'foo_url/target_path/subpath_1',
                        })
                        done()
                    })
            })
            it('Throws if called again', (done) => {
                crawler.start()
                    .then(() => done.fail())
                    .catch(() => done())
            })
        })
    })

})