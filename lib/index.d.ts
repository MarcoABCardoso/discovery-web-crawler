
/**
 * @module marcao-wds-crawler
 */

 import DiscoveryV1 from "ibm-watson/discovery/v1"
import Crawler from "simplecrawler"

declare class DiscoveryWebCrawler {
    constructor(options: DiscoveryWebCrawlerOptions)
    discoveryV1: DiscoveryV1
    simpleCrawler: Crawler
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

    fetchCondition?: () => boolean
    urlCondition?: () => boolean
    contentCondition?: () => boolean
    parse: ($) => Promise<object>
    handleDocument: () => { }
}


export = DiscoveryWebCrawler