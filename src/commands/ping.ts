import BuiltinCommand from '@/lib/command'
import type { Context, DiscordContext, KickContext, TwitchContext } from '@/types/context'
import { Adapters } from '@prisma/client'

export default class PingCommand extends BuiltinCommand {
  name = 'ping'

  async run(context: Context) {
    switch (context.adapter.name) {
      case Adapters.DISCORD: {
        const c = context as DiscordContext
        const diff = c.message.client.ws.ping
        return c.adapter.send(`Pong! Took ${diff}ms`, c)
      }
      case Adapters.TWITCH: {
        const c = context as TwitchContext
        const time = new Date(c.message.timestamp).getTime()
        const now = new Date().getTime()
        const diff = Math.abs(time - now)
        return c.adapter.send(`Pong! Took ${diff}ms`, c)
      }
      case Adapters.KICK: {
        const c = context as KickContext
        return c.adapter.send('Pong!', c)
      }
      default: {
        return
      }
    }
  }
}
