import BuiltinCommand from '@/lib/command'
import type { Context } from '@/types/context'

export default class PrefixCommand extends BuiltinCommand {
  name = 'prefix'

  async run(context: Context) {
    return context.adapter.send(`My prefix is \`${context.adapter.bot.prefix}\``, context)
  }
}
