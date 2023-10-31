import BuiltinCommand from '@/lib/command'
import { ArtisanCommands } from '@/types/artisan'
import type { Context } from '@/types/context'
import { formatCommand } from '@/utils/format'
import { parseCreateCommandArgs } from '@/utils/parser'
import { CommandType } from '@prisma/client'

export default class CommandsCommand extends BuiltinCommand {
  name = ArtisanCommands.Commands

  async run(context: Context, args: string[]): Promise<void> {
    switch (args[0]) {
      case 'list':
        return this.list(context)
      case 'enable':
        return this.toggle(context, args[1], true)
      case 'disable':
        return this.toggle(context, args[1], false)
      case 'add':
        return this.add(context, args)
      case 'delete':
      case 'remove':
        return this.remove(context, args[1])
      case 'edit':
        return this.edit(context, args)
      case 'help':
      default:
        return this.help(context, args[1])
    }
  }
  /**
   * Lists all commands
   * @param context The context of the command (e.g. twitch or discord context)
   */
  async list(context: Context): Promise<void> {
    // Get all commands
    const commands = await this.bot.prisma.command.findMany()

    // Format commands
    const formattedCommands = commands
      .map((command) => {
        return `${formatCommand(command.name, this.bot)}: ${command.response} (${
          command.enabled ? 'enabled' : 'disabled'
        })`
      })
      .join('\n')

    return context.adapter.send(formattedCommands, context)
  }

  /**
   * Enables/Disables a command
   * @param context The context of the command (e.g. twitch or discord context)
   * @param command The command to enable/disable
   * @param value Whether to enable or disable the command
   */
  async toggle(context: Context, command: string, value: boolean): Promise<void> {
    // Check if command exists
    const existingCommand = await this.bot.prisma.command.findFirst({
      where: {
        name: command
      }
    })

    if (!existingCommand) {
      return context.adapter.send(
        `Command ${formatCommand(command, this.bot)} does not exist. Use ${formatCommand(
          'artisan commands add',
          this.bot
        )} to add it.`,
        context
      )
    }

    // Update command
    await this.bot.prisma.command.update({
      where: {
        id: existingCommand.id
      },
      data: {
        enabled: value
      }
    })

    return context.adapter.send(
      `Command ${formatCommand(command, this.bot)} has been ${value ? 'enabled' : 'disabled'}`,
      context
    )
  }

  /**
   * Adds a command
   * @param context The context of the command (e.g. twitch or discord context)
   * @param - args The arguments of the command (e.g. commands add <command> <response> <cooldown>)
   */
  async add(context: Context, args: string[]): Promise<void> {
    if (args.length < 3) return this.help(context)

    const { command, response, allArgs, isCode } = parseCreateCommandArgs(args)
    const cooldown = allArgs
      .replace(response, '')
      .replaceAll(/['"`]+/g, '')
      .trim()

    // Check if command already exists
    const existingCommand = await this.bot.prisma.command.findFirst({
      where: {
        name: command
      }
    })

    if (existingCommand) {
      return context.adapter.send(
        `Command ${formatCommand(command, this.bot)} already exists. Use ${formatCommand(
          'artisan commands edit',
          this.bot
        )} to edit it.`,
        context
      )
    }

    // Create command
    await this.bot.prisma.command.create({
      data: {
        response: response,
        name: command,
        type: isCode ? CommandType.DYNAMIC : CommandType.STATIC,
        enabled: true,
        cooldown: isNaN(Number(cooldown)) ? 0 : Number(cooldown)
      }
    })

    return context.adapter.send(`Added command ${formatCommand(command, this.bot)}`, context)
  }

  /**
   * Removes a command
   * @param context The context of the command (e.g. twitch or discord context)
   * @param command  The command to remove
   */
  async remove(context: Context, command: string): Promise<void> {
    if (!command) return this.help(context)

    // Check if command exists
    const existingCommand = await this.bot.prisma.command.findFirst({
      where: {
        name: command
      }
    })

    if (!existingCommand) {
      return context.adapter.send(
        `Command ${formatCommand(command, this.bot)} does not exist. Use ${formatCommand(
          'list',
          this.bot
        )} to list all commands.`,
        context
      )
    }

    // Delete command
    await this.bot.prisma.command.delete({
      where: {
        id: existingCommand.id
      }
    })

    return context.adapter.send(`Removed command ${formatCommand(command, this.bot)}`, context)
  }

  /**
   * Edits a command
   * @param context The context of the command (e.g. twitch or discord context)
   * @param arg1
   */
  async edit(context: Context, args: string[]): Promise<void> {
    if (args.length < 3) return this.help(context)
    const { command, response, isCode } = parseCreateCommandArgs(args)

    // Check if command exists
    const existingCommand = await this.bot.prisma.command.findFirst({
      where: {
        name: command
      }
    })

    if (!existingCommand) {
      return context.adapter.send(
        `Command ${formatCommand(command, this.bot)} does not exist. Use ${formatCommand(
          'artisan commands add',
          this.bot
        )} to add it.`,
        context
      )
    }

    // Update command
    await this.bot.prisma.command.update({
      where: {
        id: existingCommand.id
      },
      data: {
        response: response,
        type: isCode ? CommandType.DYNAMIC : CommandType.STATIC
      }
    })

    return context.adapter.send(`Updated command ${formatCommand(command, this.bot)}`, context)
  }

  /**
   * Displays help for the command
   * @param context The context of the command (e.g. twitch or discord context)
   */
  async help(context: Context, command?: string): Promise<void> {
    switch (command) {
      case 'add':
        return context.adapter.send(
          `Usage: ${context.atAuthor} -> ${this.name} add <command> <response> <cooldown> <enabled>`,
          context
        )
      case 'edit':
        return context.adapter.send(`Usage: ${context.atAuthor} -> ${this.name} edit <command> <response>`, context)
      default:
        return context.adapter.send(
          `Usage: ${context.atAuthor} -> ${this.name} <list|enable|disable|add|remove|edit|help>`,
          context
        )
    }
  }
}
