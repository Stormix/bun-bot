import type Activity from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import type { Context, DiscordContext } from '@/types/context'
import { Adapters } from '@prisma/client'
import * as Sentry from '@sentry/node'
import type { Message } from 'discord.js'
import { ChannelType, Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import Adapter from '../lib/adapter'

export default class DiscordAdapter extends Adapter<DiscordContext> {
  private client: Client | null = null

  constructor(bot: Bot) {
    super(bot, Adapters.DISCORD)
  }

  atAuthor(message: Message) {
    return `<@${message.author.id}>`
  }

  isOwner(message: Context['message']) {
    const author = (message as Message).author
    return author.id === this.bot.config.env.DISCORD_OWNER_ID
  }

  createContext(message: Message): DiscordContext {
    return {
      atAuthor: this.atAuthor(message),
      atOwner: `<@${this.bot.config.env.DISCORD_OWNER_ID}>`,
      message,
      adapter: this
    }
  }

  getClient() {
    if (!this.client) throw new Error('Discord client is not initialized!')
    return this.client
  }

  async send(message: string, context: Context) {
    if (!this.client) throw new Error('Discord client is not initialized!')
    await (context as DiscordContext).message.channel.send(message)
  }

  async message(message: string, context: Context): Promise<void> {
    if (!this.client) throw new Error('Discord client is not initialized!')
    if ((context as DiscordContext).message.channel.type !== ChannelType.DM) {
      throw new Error('Cannot send a message to a non-DM channel')
    }
    const c = context as DiscordContext
    const activity: Activity<ActivityType.Conversation> = {
      type: ActivityType.Conversation,
      payload: {
        text: message,
        from: {
          id: c.message.author.id,
          name: c.message.author.username
        },
        context
      }
    }

    const responses = await this.bot.brain.handle(activity)

    await (context as DiscordContext).message.channel.send(responses.join(' '))
  }

  async setup() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping
      ],
      partials: [Partials.Message, Partials.Channel]
    })

    this.logger.info('Discord adapter is ready!')
  }

  async listenForCommands() {
    this.client?.on(Events.MessageCreate, async (message) => {
      if (!this.client) throw new Error('Discord client is not initialized!')
      if (message.author.bot) return
      if (message.channel.type === ChannelType.DM) return

      let args: string[] = []
      let command: string | undefined = undefined

      // Check if the message starts with the prefix
      if (message.content.startsWith(this.bot.config.prefix)) {
        args = message.content.slice(this.bot.config.prefix.length).trim().split(/ +/)
        command = args.shift()?.toLowerCase()
      }

      if (!command) return

      await this.bot.processor.run(command, args, this.createContext(message))
    })
  }

  async listenForMessages() {
    this.client?.on(Events.MessageCreate, async (message) => {
      if (!this.client) throw new Error('Discord client is not initialized!')
      if (message.author.bot) return
      if (message.channel.type !== ChannelType.DM) return

      await this.message(message.content, this.createContext(message))
    })
  }

  async listen() {
    if (!this.client) throw new Error('Discord client is not initialized!')
    this.client.once(Events.ClientReady, (c) => {
      this.bot.logger.debug(`Logged in to discord as ${c.user.tag}`)
    })

    await this.listenForCommands()
    await this.listenForMessages()

    this.client?.on(Events.Warn, (warn) => {
      this.logger.warn(warn)
    })
    this.client?.on(Events.Error, (error) => {
      Sentry.captureException(error, {
        tags: {
          adapter: 'discord'
        }
      })
      this.logger.error(error)
    })

    await this.client?.login(this.bot.config.env.DISCORD_TOKEN)
  }

  async stop() {
    if (!this.client) throw new Error('Discord client is not initialized!')
    this.client.destroy()
  }
}
