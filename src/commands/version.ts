import type Bot from '@/lib/bot'
import BuiltinCommand from '@/lib/command'
import type { Context } from '@/types/context'

export default class VersionCommand extends BuiltinCommand {
  name = 'version'

  constructor(bot: Bot) {
    super(bot, {
      aliases: ['v'],
      cooldown: 10,
      enabled: true
    })
  }

  async run(context: Context) {
    return context.adapter.send(
      `I am currently running version **${this.bot.config.version}** \n > https://github.com/Stormix/bot/releases/tag/v${this.bot.config.version}\n`,
      context
    )
  }
}
