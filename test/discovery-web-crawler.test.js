/* eslint-disable no-undef */
const DiscoveryV1 = require('ibm-watson/discovery/v1')
const DiscoveryWebCrawler = require('../lib')


let discoveryMock = {
    updateDocument: jest.fn(x => Promise.resolve(x))
}

let getCrawlerMock = (crawlerOptions) => ({
    queue: async () => {
        let urls = ['https://foo_url', 'https://foo_url/target_path', 'https://foo_url/target_path/subpath_1', 'https://foo_url/target_path/subpath_2', 'https://foo_url/other_path', 'https://foo_url/assets']
        for (let i = 0; i < urls.length; i++) {
            if (crawlerOptions.preRequest({ url: urls[i] }))
                try { crawlerOptions.evaluatePage() } catch (err) {/** This will fail because it's run in a browser */ }
            if (i == 0) await crawlerOptions.onError(`Some error happened with url ${urls[i]}`)
            else await crawlerOptions.onSuccess({ response: { url: urls[i] }, result: { data: `<head><title>Foo title ${i}</title><meta name="foo" content="bar"></head><main>Foo content ${i}</main>` } })
        }
    },
    onIdle: () => new Promise(r => setTimeout(r, 500)),
    close: () => new Promise(r => setTimeout(r, 500)),
})

let options1 = {
    createCrawler: getCrawlerMock,
    serviceUrl: 'foo_service_url',
    version: 'foo_version',
    apikey: 'foo_apikey',
    environmentId: 'foo_environment_id',
    collectionId: 'foo_collection_id',
    maxPages: 3,

    url: 'https://foo_url',
    dryRun: true,
    verbose: true,
}

let options2 = {
    createCrawler: getCrawlerMock,
    serviceUrl: 'foo_service_url',
    version: 'foo_version',
    apikey: 'foo_apikey',
    environmentId: 'foo_environment_id',
    collectionId: 'foo_collection_id',

    url: 'https://foo_url/target_path',

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
        })
    })

    describe('#start', () => {
        describe('When dryRun is on', () => {
            let crawler = new DiscoveryWebCrawler(options1)
            it('Executes crawling and logs documents', (done) => {
                crawler.discoveryV1 = discoveryMock
                crawler.simpleCrawler = getCrawlerMock()
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
                crawler.simpleCrawler = getCrawlerMock()
                crawler.start()
                    .catch(err => done.fail(err))
                    .then(() => {
                        let doc = discoveryMock.updateDocument.mock.calls[0][0]
                        let file = JSON.parse(doc.file.toString('utf-8'))
                        delete doc.file
                        delete file.crawler_date
                        expect(doc).toEqual({
                            'documentId': '821d28a5c61ad6c383e06a8bcce86fc4fffb69b6',
                            'environmentId': 'foo_environment_id',
                            'collectionId': 'foo_collection_id',
                            'fileContentType': 'application/json',
                            'fileName': 'Foo title 2',
                        })
                        expect(file).toEqual({
                            'crawler_url': 'https://foo_url/target_path',
                            'meta': {
                                'foo': 'bar',
                            },
                            'text': 'Foo content 2',
                            'title': 'Foo title 2',
                            'url': 'https://foo_url/target_path/subpath_1',
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