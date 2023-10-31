import type Activity from './activity'
import type { ActivityType } from './activity'
import type Bot from './bot'
import type Logger from './logger'

export default abstract class Skill {
  protected readonly logger: Logger
  protected readonly bot: Bot
  protected readonly activityTypes: ActivityType[]

  constructor(bot: Bot, activityTypes: ActivityType[]) {
    this.logger = bot.logger.getSubLogger({ name: `Skill` }).getSubLogger({ name: `${this.constructor.name}` })
    this.bot = bot
    this.activityTypes = activityTypes
  }

  canHandle(activity: Activity<ActivityType>): boolean {
    return this.activityTypes.includes(activity.type)
  }

  abstract handle(activity: Activity<ActivityType>): Promise<void>
}
