import axios from 'axios'
import WebSocket from 'ws'
import type Bot from '../bot'
import env from '../env'
import Logger from '../logger'
import { KickScrapper } from './scrapper'

export class KickClient {
  ws: WebSocket
  url: string
  logger: Logger
  scrapper: KickScrapper
  bot: Bot

  constructor(bot: Bot) {
    const baseUrl = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679'
    const urlParams = new URLSearchParams({
      protocol: '7',
      client: 'js',
      version: '7.4.0',
      flash: 'false'
    })

    this.logger = new Logger().getSubLogger({ name: 'KickClient' })
    this.url = `${baseUrl}?${urlParams.toString()}`
    this.ws = new WebSocket(this.url)
    this.scrapper = new KickScrapper()
    this.bot = bot
  }

  async setup() {
    await this.scrapper.setup()
  }

  async say(chatroomId: string, message: string) {
    const channelId = '974968'
    const channelUsername = 'stormix-dev'
    try {
      await axios.post(
        `https://kick.com/api/v2/messages/send/${channelId}`,
        {
          content: message,
          type: 'message'
        },
        {
          headers: {
            accept: 'application/json, text/plain, */*',
            authorization: `Bearer ${env.KICK_TOKEN}`,
            'content-type': 'application/json',
            'x-xsrf-token': env.KICK_TOKEN,
            cookie: env.KICK_COOKIES,
            Referer: `https://kick.com/${channelUsername}`
          }
        }
      )

      this.logger.debug(`Message sent to ${channelId}`)
    } catch (error) {
      this.logger.error(`Error sending message to ${channelId}: ${error}`)
    }
  }

  async connect() {
    return new Promise<void>((resolve, reject) => {
      this.ws.on('open', () => {
        this.logger.debug('Kick connection established')
        resolve()
      })

      this.ws.on('error', (err) => {
        this.logger.error(`Error connecting to Kick: ${err}`)
        reject(err)
      })
    })
  }

  async join(channel: string) {
    this.logger.info(`Joining channel ${channel}`)
    const channelInfo = await this.scrapper.getChannelInfo(channel)
    if (!channelInfo) {
      this.logger.error(`Channel ${channel} not found`)
      return
    }
    const chatroomId = channelInfo.chatroom.id
    const connect = JSON.stringify({
      event: 'pusher:subscribe',
      data: { auth: '', channel: `chatrooms.${chatroomId}.v2` }
    })

    this.ws.send(connect, (err) => {
      if (err) {
        this.logger.error(`Error joining chatroom ${chatroomId}: ${err}`)
      }
      this.bot.logger.debug(`Logged in to Kick as ${env.KICK_USERNAME}`)
    })
  }

  async destroy() {
    this.ws?.close()
  }
}
