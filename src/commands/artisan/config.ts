import BuiltinCommand from '@/lib/command'
import { ArtisanCommands } from '@/types/artisan'
import type { Context } from '@/types/context'
import { Adapters } from '@prisma/client'

export default class CommandsCommand extends BuiltinCommand {
  name = ArtisanCommands.Config

  async run(context: Context, args: string[]): Promise<void> {
    switch (args[0]) {
      case 'set':
        return this.set(context, args)
      case 'remove':
      case 'delete':
        return this.remove(context, args[1])
      case 'list':
        return this.list(context)
      case 'help':
      default:
        return this.help(context, args[1])
    }
  }
  /**
   * Lists all overrides
   * @param context The context of the command (e.g. twitch or discord context)
   */
  async list(context: Context): Promise<void> {
    // Get all overrides
    const overrides = await this.bot.prisma.setting.findMany()
    const overridesObject = overrides.reduce(
      (acc, cur) => {
        acc[cur.name] = cur.value
        return acc
      },
      {} as Record<string, string>
    )

    const formattedOverrides = JSON.stringify(overridesObject, null, 2)
    const formattedOverridesList = overrides.map((o) => `${o.name}: ${o.value}`)

    switch (context.adapter.name) {
      case Adapters.DISCORD:
        return context.adapter.send(`**Settings**:\n\`\`\`json\n${formattedOverrides}\`\`\``, context)
      case Adapters.TWITCH:
        await Promise.all(formattedOverridesList.map((s) => context.adapter.send(s, context)))
        return
    }
  }

  /**
   * Removes a command
   * @param context The context of the command (e.g. twitch or discord context)
   * @param command  The command to remove
   */
  async remove(context: Context, key: string): Promise<void> {
    if (!key) return this.help(context)

    // Check if command exists
    const setting = await this.bot.prisma.setting.findFirst({
      where: {
        name: key
      }
    })

    console.log(setting)
    if (!setting) {
      return context.adapter.send(`Setting ${key} does not exist.`, context)
    }

    // Delete command
    await this.bot.prisma.setting.delete({
      where: {
        id: setting.id
      }
    })

    return context.adapter.send(`Setting ${key} removed.`, context)
  }

  async set(context: Context, args: string[]): Promise<void> {
    if (args.length < 3) return this.help(context)

    const key = args[1]
    const value = args[2]

    // Check if command exists
    const setting = await this.bot.prisma.setting.findFirst({
      where: {
        name: key
      }
    })

    if (!setting) {
      // Create command
      await this.bot.prisma.setting.create({
        data: {
          name: key,
          value
        }
      })
      await this.bot.reload()
      return context.adapter.send(`Setting ${key} created.`, context)
    }

    await this.bot.prisma.setting.update({
      where: {
        id: setting.id
      },
      data: {
        value
      }
    })
    await this.bot.reload()
    return context.adapter.send(`Setting ${key} updated.`, context)
  }

  /**
   * Displays help for the command
   * @param context The context of the command (e.g. twitch or discord context)
   */
  async help(context: Context, command?: string): Promise<void> {
    switch (command) {
      case 'set':
        return context.adapter.send(`Usage: ${context.atAuthor} -> ${this.name} set <key> <value>`, context)
      case 'remove':
        return context.adapter.send(`Usage: ${context.atAuthor} -> ${this.name} remove|delete <key>`, context)
      case 'list':
        return context.adapter.send(`Usage: ${context.atAuthor} -> ${this.name} list`, context)
      default:
        return context.adapter.send(`Usage: ${context.atAuthor} -> ${this.name} <list|set|remove>`, context)
    }
  }
}
