import type Bot from '@/lib/bot'

export const formatCommand = (command: string, bot: Bot) => {
  return `\`${bot.prefix}${command}\``
}
