import type Activity from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import Skill from '@/lib/skill'
import Twitch from '@/providers/twitch'
import { ServiceType } from '@prisma/client'
import * as Sentry from '@sentry/node'

export default class Hitman extends Skill {
  constructor(bot: Bot) {
    super(bot, [ActivityType.TwitchRouletteHitman])
  }

  async handle(activity: Activity<ActivityType.TwitchRouletteHitman>) {
    try {
      this.logger.debug('Hitman skill is triggered')

      const { context, target, username } = activity.payload
      const random = Math.floor(Math.random() * 10_000)

      const ban = async (username: string, seconds: number) => {
        const broadcasterTokens = await this.bot.credentials.getCredentials(ServiceType.TWITCH_BROADCASTER)
        if (!broadcasterTokens) throw new Error('Missing broadcaster tokens')
        await Twitch.getInstance().timeoutUser(broadcasterTokens, username, seconds, 'Roulette')
      }

      if (target.includes('StormixBot')) {
        await context.adapter.send(`@${username} tried to hit me, what a loser. Get banned for 30min.`, context)
        return await ban(username, 60 * 30)
      }

      if (username === target) {
        await context.adapter.send(`@${username} tried to hit himself, what a loser.`, context)
        return await ban(username, 60 * 1)
      }

      if (target.includes('@')) {
        await context.adapter.send(
          `@${username} don't include @ in the target's name. You will not be refunded LOL.`,
          context
        )
        return
      }

      // TODO:
      await context.adapter.send(`@${target} ${username} placed a hit on you. You rolled: ${random}`, context)

      if (random === 0) {
        // Ban permanently
        await ban(username, 0)
        await ban(target, 0)
        await context.adapter.send(`@${username} and ${target} are both banned permanently KEKBye.`, context)
      } else if (random < 100) {
        // Mod
        await context.adapter.send(
          `@${target} gets a mod, but I'm too lazy to implement it, so I'll do it manually.`,
          context
        )
      } else if (random < 300) {
        // VIP
        await context.adapter.send(
          `@${target} gets a VIP, but I'm too lazy to implement it, so I'll do it manually.`,
          context
        )
      } else if (random < 7000) {
        // Timeout 10 minutes
        await ban(target, 60 * 10)
        await context.adapter.send(`@${target} has been timed out for 10 minutes by ${username}.`, context)
      } else {
        // Timeout {random} seconds
        await ban(username, random)
        await context.adapter.send(
          `@${username} has been timed out for ${random} seconds after placing a hit on @${target}.`,
          context
        )
      }
    } catch (error) {
      Sentry.captureException(error)
      this.logger.error('Failed to handle activity: ', error)
    }
  }
}
