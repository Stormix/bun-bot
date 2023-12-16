import type Activity from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import Skill from '@/lib/skill'
import * as Sentry from '@sentry/node'

export default class Asidi extends Skill {
  constructor(bot: Bot) {
    super(bot, [ActivityType.TwitchReadChat])
  }

  async handle(activity: Activity<ActivityType.TwitchReadChat>) {
    try {
      const { context } = activity.payload

      this.bot.pubSub.publish(
        'readChat',
        JSON.stringify({
          type: 'readChat',
          username: activity.payload.username,
          message: activity.payload.message.slice(0, 100)
        })
      )

      await context.adapter.send(`Notification sent, surely it'll work :KEKW:`, context)
    } catch (error) {
      Sentry.captureException(error)
      this.logger.error('Failed to handle activity: ', error)
    }
  }
}
