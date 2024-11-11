import type Bot from '@/lib/bot'
import env from '@/lib/env'
import { KickClient } from '@/lib/kick/client'
import type { Context, KickContext } from '@/types/context'
import type { KickMessage, RawKickMessage } from '@/types/kick'
import { Adapters } from '@prisma/client'
import Adapter from '../lib/adapter'

export default class KickAdapter extends Adapter<KickContext> {
  client: KickClient | null = null

  constructor(bot: Bot) {
    super(bot, Adapters.KICK)
  }

  atAuthor(message: KickMessage) {
    return `@${message.sender.username}`
  }

  isOwner(message: KickMessage): boolean {
    return message.sender.username === env.KICK_CHANNEL || message.sender.username === env.KICK_USERNAME
  }

  createContext(message: KickMessage): KickContext {
    return {
      adapter: this,
      message,
      atAuthor: this.atAuthor(message),
      atOwner: `@${env.KICK_CHANNEL}`
    }
  }

  getClient() {
    if (!this.client) throw new Error('Kick client is not initialized!')
    return this.client
  }

  async send(message: string, context: Context) {
    if (!this.client) throw new Error('Kick client is not initialized!')
    this.logger.debug(`Sending ${message} to ${(context as KickContext).message.chatroom_id}`)
    await this.client.say((context as KickContext).message.chatroom_id, message)
  }

  async message(message: string, context: Context) {
    if (!this.client) throw new Error('Kick client is not initialized!')
    this.logger.debug(`Sending message to ${(context as KickContext).message.sender.username}`)
  }

  async listenForCommands(): Promise<void> {
    this.client?.ws.on('message', async (event) => {
      const raw = JSON.parse(event.toString()) as RawKickMessage
      const message = JSON.parse(raw.data) as KickMessage
      if (!message.content) return
      if (!message.content.startsWith(this.bot.config.prefix)) return
      const args = message.content.slice(this.bot.config.prefix.length).trim().split(/ +/)
      const command = args.shift()?.toLowerCase()
      if (!command) return

      await this.bot.processor.run(command, args, this.createContext(message as KickMessage))
    })
  }

  async listenForMessages(): Promise<void> {
    this.logger.debug('Listening for messages...')
  }

  async setup() {
    this.client = new KickClient(this.bot)
    await this.client.setup()
    this.logger.info('Kick adapter is ready!')
  }

  async listen() {
    if (!this.client) throw new Error('Kick client is not initialized!')

    await this.listenForCommands()
    await this.listenForMessages()

    await this.client.connect()
    await this.client.join('ieozthndh')
  }

  async stop() {
    if (!this.client) throw new Error('Kick client is not initialized!')
    this.client.destroy()
  }
}
