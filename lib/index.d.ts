
/**
 * @module marcao-wds-crawler
 */

 import DiscoveryV1 from "ibm-watson/discovery/v1"

declare class DiscoveryWebCrawler {
    constructor(options: DiscoveryWebCrawlerOptions)
    discoveryV1: DiscoveryV1
    start(): Promise<void>
}

interface DiscoveryWebCrawlerOptions {
    serviceUrl: string
    version?: string
    apikey: string
    environmentId: string
    collectionId: string

    url: string
    maxDepth?: number
    maxPages?: number
    dryRun?: boolean
    verbose?: boolean

    fetchCondition?: (url: string) => boolean
    urlCondition?: (url: string) => boolean
    contentCondition?: (content: object) => boolean
    parse: ($: JQueryStatic, url: string) => Promise<object>
}


export = DiscoveryWebCrawler