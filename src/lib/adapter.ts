import type Bot from '@/lib/bot'
import type { Adapters } from '@prisma/client'
import type Logger from './logger'

export interface AdapterOptions {
  allowedEnvironments?: string[]
  enabled?: boolean
}

abstract class Adapter<Context> {
  readonly bot: Bot
  name: Adapters
  logger: Logger
  options: AdapterOptions

  constructor(
    bot: Bot,
    name: Adapters,
    options: AdapterOptions = {
      enabled: true
    }
  ) {
    this.bot = bot
    this.name = name
    this.logger = this.bot.logger.getSubLogger({ name: this.name })
    this.options = options
  }

  abstract getClient(): unknown
  abstract setup(): Promise<void>
  abstract listen(): Promise<void>
  abstract listenForCommands(): Promise<void>
  abstract listenForMessages(): Promise<void>
  abstract atAuthor(message: unknown): string

  abstract createContext(message: unknown): Context
  abstract send(message: string, context: Context): Promise<void>
  abstract message(message: string, context: Context): Promise<void>

  abstract isOwner(message: unknown): boolean
  abstract stop(): Promise<void>
}

export default Adapter
