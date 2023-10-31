import type { ActivityPayload } from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import type { TwitchPollEndBody } from '@/providers/twitch'
import Twitch from '@/providers/twitch'
import type { Context, TwitchContext } from '@/types/context'
import { PollResults } from '@/types/poll'
import { Adapters, ServiceType } from '@prisma/client'
import type { BaseMessage, PrivateMessage } from 'twitch-js'
import { Api, Chat, ChatEvents, Commands, OtherCommands } from 'twitch-js'
import fetchUtil from 'twitch-js/lib/utils/fetch'
import Adapter from '../lib/adapter'

export default class TwitchAdapter extends Adapter<TwitchContext> {
  client: Chat | null = null
  api: Api | null = null

  constructor(bot: Bot) {
    super(bot, Adapters.TWITCH)
  }

  atAuthor(message: PrivateMessage | BaseMessage) {
    return `@${message.username}`
  }

  isOwner(message: Context['message']) {
    const username = (message as PrivateMessage).username
    return username === this.bot.config.env.TWITCH_USERNAME || username === this.bot.config.env.TWITCH_CHANNEL
  }

  createContext(message: PrivateMessage | BaseMessage): TwitchContext {
    return {
      atAuthor: this.atAuthor(message),
      atOwner: `@${this.bot.config.env.TWITCH_USERNAME}`,
      message,
      adapter: this
    }
  }

  getClient() {
    if (!this.client) throw new Error('Twitch client is not initialized!')
    return this.client
  }

  async send(message: string, context: Context) {
    if (!this.client) throw new Error('Twitch client is not initialized!')
    await this.client.say((context as TwitchContext).message.channel, message)
  }

  async message(message: string, context: Context) {
    if (!this.client) throw new Error('Twitch client is not initialized!')
    this.logger.debug(`Sending message to ${(context as TwitchContext).message.username}`)
    await this.client.whisper((context as TwitchContext).message.username, message) // DOESN'T WORK
  }

  async setup() {
    const botTokens = await this.bot.credentials.getCredentials(ServiceType.TWITCH)

    if (!botTokens) {
      this.logger.debug(
        `No twitch tokens found, generate new ones by clicking this link: ${Twitch.login(
          'http://localhost:3000/twitch',
          'bot_callback'
        )}`
      )
      return
    }

    this.client = new Chat({
      username: this.bot.config.env.TWITCH_USERNAME,
      token: botTokens?.access_token,
      onAuthenticationFailure: () =>
        fetchUtil('https://id.twitch.tv/oauth2/token', {
          method: 'post',
          search: {
            grant_type: 'refresh_token',
            refresh_token: botTokens?.refresh_token,
            client_id: this.bot.config.env.TWITCH_CLIENT_ID,
            client_secret: this.bot.config.env.TWITCH_CLIENT_SECRET
          }
        }).then((response) => response.accessToken),
      log: { level: 'warn' }
    })

    const broadcasterTokens = await this.bot.credentials.getCredentials(ServiceType.TWITCH_BROADCASTER)

    if (!broadcasterTokens) {
      this.logger.debug(
        `No twitch tokens found, generate new ones by clicking this link: ${Twitch.login(
          'http://localhost:3000/twitch',
          'broadcaster_callback'
        )}`
      )
      return
    }

    this.api = new Api({
      token: broadcasterTokens?.access_token,
      clientId: this.bot.config.env.TWITCH_CLIENT_ID,
      log: { level: 'warn' },
      onAuthenticationFailure: () =>
        fetchUtil('https://id.twitch.tv/oauth2/token', {
          method: 'post',
          search: {
            grant_type: 'refresh_token',
            refresh_token: broadcasterTokens?.refresh_token,
            client_id: this.bot.config.env.TWITCH_CLIENT_ID,
            client_secret: this.bot.config.env.TWITCH_CLIENT_SECRET
          }
        }).then((response) => response.accessToken)
    })

    this.logger.info('Twitch adapter is ready!')
  }

  async listenForRewardRedemptions() {
    this.client?.on(ChatEvents.ALL, async (message) => {
      if (!message) return
      if (message.command !== Commands.PRIVATE_MESSAGE) return
      const tags = message.tags as Record<string, string>
      if (!tags?.['customRewardId']) return
      const rewardId = tags.customRewardId
      const text = message.message
      this.logger.debug(`Received reward redemption for ${rewardId} with text ${text}`)

      const activityType = this.bot.config.twitch.rewardMapping[rewardId]

      if (!activityType) return

      switch (activityType) {
        case ActivityType.TwitchRewardsAddSongToQueue: {
          const payload: ActivityPayload[ActivityType.TwitchRewardsAddSongToQueue] = {
            song: text,
            context: this.createContext(message as PrivateMessage)
          }
          this.bot.brain.handle({
            type: activityType,
            payload
          })
          break
        }
        case ActivityType.TwitchRewardsSkipSong: {
          const payload: ActivityPayload[ActivityType.TwitchRewardsSkipSong] = {
            context: this.createContext(message as PrivateMessage)
          }
          this.bot.brain.handle({
            type: activityType,
            payload
          })
          break
        }
        case ActivityType.TwitchRewardsVotekick:
          const payload: ActivityPayload[ActivityType.TwitchRewardsVotekick] = {
            username: text,
            context: this.createContext(message as PrivateMessage)
          }
          this.bot.brain.handle({
            type: activityType,
            payload
          })
          break
        case ActivityType.TwitchRewardsEndStream: {
          const payload: ActivityPayload[ActivityType.TwitchRewardsEndStream] = {
            context: this.createContext(message as PrivateMessage)
          }
          this.bot.brain.handle({
            type: activityType,
            payload
          })
          break
        }
        default:
          this.logger.warn(`Unknown activity type ${activityType} for reward ${rewardId}`)
          return
      }
    })
  }

  async listenForCommands() {
    this.client?.on(ChatEvents.ALL, async (message) => {
      if (!message) return
      if (message.command !== Commands.PRIVATE_MESSAGE) return
      if (!message.message.startsWith(this.bot.config.prefix)) return
      const args = message.message.slice(this.bot.config.prefix.length).trim().split(/ +/)
      const command = args.shift()?.toLowerCase()

      if (!command) return

      await this.bot.processor.run(command, args, this.createContext(message as PrivateMessage))
    })
  }

  async listenForMessages() {
    this.client?.on(ChatEvents.ALL, async (message) => {
      if (!message) return
      if (message.command !== OtherCommands.WHISPER) return
      await this.message(message.message, this.createContext(message))
    })
  }

  async listen() {
    if (!this.client) throw new Error('Twitch client is not initialized!')

    this.client.once(ChatEvents.CONNECTED, (c) => {
      this.bot.logger.debug(`Logged in to twitch as ${c.username}`)
    })

    await this.listenForCommands()
    await this.listenForMessages()
    await this.listenForRewardRedemptions()

    await this.client.connect()
    await this.client.join(this.bot.config.env.TWITCH_CHANNEL)
  }

  async createPoll(question: string, options: string[], context: Context): Promise<PollResults> {
    return new Promise(async (resolve, reject) => {
      try {
        this.logger.debug(`Creating poll for ${question} with options ${options}`)
        if (!this.client) throw new Error('Twitch client is not initialized!')

        const { data } = await this.api?.post('polls', {
          body: {
            broadcaster_id: '102784954',
            title: question,
            choices: options.map((option) => ({ title: option })),
            channel_points_voting_enabled: true,
            channel_points_per_vote: 100,
            duration: 1800
          }
        })

        const poll = data[0]

        this.logger.debug(`Created poll with id ${poll.id}`)

        setTimeout(async () => {
          try {
            this.logger.debug(`Ending poll with id ${poll.id}`)
            //
            const broadcasterTokens = await this.bot.credentials.getCredentials(ServiceType.TWITCH_BROADCASTER)
            if (!broadcasterTokens) throw new Error('No broadcaster tokens found!')

            const results = await (
              await Twitch.getInstance().getRefreshedInstance(broadcasterTokens)
            ).patch(`/polls`, {
              broadcaster_id: '102784954',
              id: poll.id,
              status: 'TERMINATED'
            })

            const data = (results.data as TwitchPollEndBody).data[0]

            const yesVotes = data.choices[0].votes
            const noVotes = data.choices[1].votes

            this.logger.debug(`Poll ended with ${yesVotes} yes votes and ${noVotes} no votes`)

            if (yesVotes === noVotes) {
              await context.adapter.send(`Vote kick poll has ended! It's a tie!`, context)
              return resolve(PollResults.Tie)
            } else {
              await context.adapter.send(
                `Vote kick poll has ended! ${yesVotes > noVotes ? 'Yes' : 'No'} votes won!`,
                context
              )

              return resolve(yesVotes > noVotes ? PollResults.Yes : PollResults.No)
            }
          } catch (e) {
            this.logger.error('Failed to end poll', e)
            reject(e)
          }
        }, 60 * 1000)

        await context.adapter.send(`Vote kick poll has started!`, context)
      } catch (e) {
        this.logger.error('Failed create poll', e)
        reject(e)
      }
    })
  }

  async stop() {
    if (!this.client) throw new Error('Twitch client is not initialized!')
    await this.client.disconnect()
  }
}
