import type { KickChannelInfo } from '@/types/kick'
import type { Browser } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import Logger from '../logger'

export class KickScrapper {
  browser: Browser | null = null
  logger: Logger

  constructor() {
    this.logger = new Logger().getSubLogger({ name: 'KickScrapper' })
  }

  async setup() {
    if (this.browser) return
    const puppeteerExtra = puppeteer.use(StealthPlugin()) as typeof puppeteer
    this.browser = await puppeteerExtra.launch({
      headless: true
    })
  }

  async getChannelInfo(channelUsername: string) {
    if (!this.browser) await this.setup()

    const page = await this.browser!.newPage()

    await page.goto(`https://kick.com/api/v2/channels/${channelUsername}`)
    await page.waitForSelector('body')

    try {
      const jsonContent = await page.evaluate(() => {
        const body = document.querySelector('body')
        if (!body) return null
        const text = body.textContent
        return text ? (JSON.parse(text) as KickChannelInfo) : null
      })

      await page.close()

      return jsonContent
    } catch (error) {
      this.logger.error(`Error getting channel info for ${channelUsername}: ${error}`)
      await page.close()
      return null
    }
  }
}
