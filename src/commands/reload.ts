import type Bot from '@/lib/bot'
import BuiltinCommand from '@/lib/command'
import type { Context } from '@/types/context'

export default class ReloadCommand extends BuiltinCommand {
  name = 'reload'

  constructor(bot: Bot) {
    super(bot, {
      ownerOnly: true
    })
  }

  async run(context: Context) {
    await this.bot.reload()
    return context.adapter.send('Reloaded config', context)
  }
}
