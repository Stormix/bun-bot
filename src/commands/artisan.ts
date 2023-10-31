import type Bot from '@/lib/bot'
import BuiltinCommand from '@/lib/command'
import type { Context } from '@/types/context'
import * as Sentry from '@sentry/node'

export default class ArtisanCommand extends BuiltinCommand {
  name = 'artisan'

  constructor(bot: Bot) {
    super(bot, {
      aliases: ['config'],
      cooldown: 0,
      enabled: true,
      ownerOnly: true
    })
  }

  get artisan() {
    return this.bot.artisan
  }

  async run(context: Context, args: string[]) {
    const [command, ...commandArgs] = args
    this.logger.debug('Artisan command called: ', command, commandArgs)

    try {
      if (!command) {
        return context.adapter.send('Please specify a command to run', context)
      }
      return this.artisan.run(command, commandArgs, context)
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          command: `artisan ${command}`,
          commandArgs: commandArgs.join(' ')
        }
      })
      this.logger.error('Failed to run artisan command.', error)
      return context.adapter.send(
        `Failed to run artisan command. ${context.atOwner} check logs for more info.`,
        context
      )
    }
  }
}
