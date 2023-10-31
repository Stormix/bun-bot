import type BuiltinCommand from '@/lib/command'
import type { Context } from '@/types/context'
import type { Command } from '@prisma/client'
import { differenceInSeconds } from 'date-fns'

export const checkCommandFlags = (command: BuiltinCommand | Command, context: Context) => {
  if (command?.ownerOnly && !context.adapter.isOwner(context.message)) {
    return `${context.atAuthor} this command can only be used by ${context.atOwner}! Do it one more time and I'll ban you!`
  }
  if (!command.enabled) return `${context.atAuthor} this command is disabled!`
  if (command?.ownerOnly && !context.adapter.isOwner(context.message)) {
    return `${context.atAuthor} this command can only be used by ${context.atOwner}! Do it one more time and I'll ban you!`
  }

  return null
}

export const checkCommandCooldown = async (command: BuiltinCommand | Command, context: Context) => {
  if (!command.cooldown) return null
  const hash = `${context.adapter.name}:${context.atAuthor}:${command.name}`

  // Hash command and check for cooldown
  const cooldown = await context.adapter.bot.storage.get(hash)

  if (cooldown) {
    context.adapter.bot.logger.debug(`Command ${command.name} is on cooldown for ${context.atAuthor}`)
    const timeLeft = command.cooldown + differenceInSeconds(new Date(cooldown), new Date())
    return `${context.atAuthor} this command is on cooldown. Please wait **${timeLeft}** seconds.`
  }

  // Set cooldown
  await context.adapter.bot.storage.set(hash, new Date().toISOString(), command.cooldown)
  return null
}
