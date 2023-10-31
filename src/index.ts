import Bot from '@/lib/bot'
import env from '@/lib/env'
import { onShutdown } from 'node-graceful-shutdown'
import Logger from './lib/logger'

const bot = env.ENABLED ? new Bot() : null
const logger = new Logger()

const main = async () => {
  if (!bot) logger.warn('Bot is disabled')

  await bot?.setup()
  await bot?.listen()
}

onShutdown(async () => {
  await bot?.shutdown()
})

main().catch((err) => {
  logger.error('Failed to run bot: ' + err.message)
  process.exit(1)
})
