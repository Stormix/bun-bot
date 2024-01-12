import type Activity from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import Skill from '@/lib/skill'
import Twitch from '@/providers/twitch'
import { ServiceType } from '@prisma/client'
import * as Sentry from '@sentry/node'

export default class Roulette extends Skill {
  constructor(bot: Bot) {
    super(bot, [ActivityType.TwitchRoulette])
  }

  async handle(activity: Activity<ActivityType.TwitchRoulette>) {
    try {
      this.logger.debug('Roulette skill is triggered')

      const { context, message, username } = activity.payload
      const random = Math.floor(Math.random() * 10_000)

      const ban = async (seconds: number) => {
        const broadcasterTokens = await this.bot.credentials.getCredentials(ServiceType.TWITCH_BROADCASTER)
        if (!broadcasterTokens) throw new Error('Missing broadcaster tokens')
        await Twitch.getInstance().timeoutUser(broadcasterTokens, username, seconds, 'Roulette')
      }

      // TODO:
      await context.adapter.send(`You rolled: ${random}`, context)

      if (random === 0) {
        // Ban permanently
        await ban(0)
        await context.adapter.send(
          `@${username} has been banned permanently :KEKBye:, his last words were: ${message}`,
          context
        )
      } else if (random < 100) {
        // Mod
        await context.adapter.send(
          `@${username} gets a mod, but I'm too lazy to implement it, so I'll do it manually.`,
          context
        )
      } else if (random < 300) {
        // VIP
        await context.adapter.send(
          `@${username} gets a VIP, but I'm too lazy to implement it, so I'll do it manually.`,
          context
        )
      } else if (random < 5300) {
        // Timeout 10 minutes
        await ban(60 * 10)
        await context.adapter.send(`@${username} has been timed out for 10 minutes. Last words: ${message}`, context)
      } else if (random < 8300) {
        // Timeout 1 hour
        await ban(60 * 60)
        await context.adapter.send(`@${username} has been timed out for 1 hour. Last words: ${message}`, context)
      } else {
        // Timeout {random} seconds
        await ban(random)
        await context.adapter.send(
          `@${username} has been timed out for ${random} seconds. Last words: ${message}`,
          context
        )
      }
    } catch (error) {
      Sentry.captureException(error)
      this.logger.error('Failed to handle activity: ', error)
    }
  }
}
