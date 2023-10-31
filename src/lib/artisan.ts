import { ArtisanCommands } from '@/types/artisan'
import type { Context } from '@/types/context'
import { loadModulesInDirectory } from '@/utils/loaders'
import * as Sentry from '@sentry/node'
import type Bot from './bot'
import type BuiltinCommand from './command'
import { ValidationError } from './errors'
import Logger from './logger'

export default class Artisan {
  private readonly logger: Logger
  private commands: BuiltinCommand[] = []

  /**
   * The artisan class - a utility class to control/configure the bot
   * @param bot The bot instance
   */
  constructor(private readonly bot: Bot) {
    this.logger = bot.logger.getSubLogger({ name: this.constructor.name })
  }

  /**
   * Validates the artisan command
   *
   * @param command The artisan command to run
   * @param args The arguments to pass to the artisan command
   * @param context The context of the command (e.g. twitch or discord context)
   */
  async validate(command: string) {
    if (![...Object.values(ArtisanCommands), 'help'].includes(command as ArtisanCommands))
      throw new ValidationError('Unknown artisan command')
  }

  /**
   * Loads the artisan commands
   */
  async load() {
    // Load artisan commands
    const commands = await loadModulesInDirectory<BuiltinCommand>('commands/artisan')

    // Register artisan commands
    commands.forEach((Command) => {
      this.commands.push(new Command(this.bot))
    })

    this.logger.info(`Loaded ${this.commands.length} artisan commands.`)
  }
  /**
   * Runs the artisan command
   *
   * @param command  The artisan command to run
   * @param args  The arguments to pass to the artisan command
   * @param context  The context of the command (e.g. twitch or discord context)
   * @returns
   */
  async run(command: string, args: string[], context: Context): Promise<void> {
    try {
      await this.validate(command)

      if (command.toLowerCase() === 'help') {
        return context.adapter.send(
          `Available artisan commands: ${this.commands.map((c) => c.name).join(', ')}`,
          context
        )
      }

      const artisanCommand = this.commands.find((c) => c.isCommand(command))
      if (!artisanCommand) throw new ValidationError('Unknown artisan command')

      return artisanCommand.run(context, args)
    } catch (error) {
      if (error instanceof ValidationError) {
        return context.adapter.send(error.message, context)
      }

      Sentry.captureException(error, {
        tags: {
          command: `artisan ${command}`,
          commandArgs: args.join(' ')
        }
      })

      this.logger.error('Failed to run artisan command. ', error)
      return context.adapter.send(
        `Failed to run artisan command. ${context.atOwner} check logs for more info.`,
        context
      )
    }
  }
}
