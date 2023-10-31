import type Activity from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import BuiltinCommand from '@/lib/command'
import type { Context, DiscordContext, TwitchContext } from '@/types/context'
import { Adapters } from '@prisma/client'

export default class WhisperCommand extends BuiltinCommand {
  name = 'whisper'

  constructor(bot: Bot) {
    super(bot, {
      cooldown: 0,
      enabled: true,
      ownerOnly: true
    })
  }
  async run(context: Context, args: string[]) {
    const message = args.join(' ')

    let activity: Activity<ActivityType> | null = null

    switch (context.adapter.name) {
      case Adapters.DISCORD: {
        activity = {
          type: ActivityType.Conversation,
          payload: {
            text: message,
            from: {
              name: (context as DiscordContext).message.author.username,
              id: (context as DiscordContext).message.author.id
            },
            context
          }
        }

        break
      }
      case Adapters.TWITCH: {
        activity = {
          type: ActivityType.Conversation,
          payload: {
            text: message,
            from: {
              name: (context as TwitchContext).message.username,
              id: '#'
            },
            context
          }
        }
        break
      }
    }
    const response = activity ? (await this.bot.brain.handle(activity)).join(' ') : 'Oopsie.'
    await context.adapter.send(`${context.atAuthor} ${response}`, context)
  }
}
