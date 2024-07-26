import Bot from '@/lib/bot'
import BuiltinCommand from '@/lib/command'
import type { Context, TwitchContext } from '@/types/context'
import { Adapters } from '@prisma/client'

export default class FollowCommand extends BuiltinCommand {
  name = 'follow'

  constructor(bot: Bot) {
    super(bot, {
      enabled: true,
      ownerOnly: true,
      aliases: ['f'],
      cooldown: 0
    })
  }

  async run(context: Context, args: string[]) {
    const message = args.join(' ') // follow @stormix
    const username = new RegExp(/@(\w+)/).exec(message)?.[1] // stormix

    if (!username) {
      return context.adapter.send('You need to provide a username to follow', context)
    }

    switch (context.adapter.name) {
      case Adapters.TWITCH: {
        const c = context as TwitchContext

        // TODO: call the Twitch API to follow the user

        return c.adapter.send(`Gonna follow ${username}`, c)
      }
      default: {
        return
      }
    }
  }
}
