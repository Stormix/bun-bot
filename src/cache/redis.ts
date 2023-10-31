import type Bot from '@/lib/bot'
import Logger from '@/lib/logger'
import { StorageTypes } from '@/types/storage'
import * as Sentry from '@sentry/node'
import { createClient } from 'redis'
import Cache from '../lib/cache'

export default class RedisCache extends Cache {
  primary = true
  client: ReturnType<typeof createClient>
  logger: Logger

  constructor(bot: Bot) {
    super(StorageTypes.Redis, bot)

    this.client = createClient({
      url: `redis://${bot.config.env.REDIS_HOST}:${bot.config.env.REDIS_PORT}`,
      username: undefined,
      password: undefined
    })

    this.logger = new Logger({ name: 'RedisStorage' })
  }

  async setup() {
    await this.client.connect()
  }

  async set(key: string, value: string, expiry?: number) {
    try {
      await this.client.set(
        `${this.prefix}${key}`,
        value,
        expiry
          ? {
              EX: expiry
            }
          : undefined
      )
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          storage: 'redis'
        }
      })
      this.logger.error('Failed to set key', error)
    }
  }

  async get(key: string) {
    try {
      return this.client.get(`${this.prefix}${key}`)
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          storage: 'redis'
        }
      })
      this.logger.error('Failed to get key', error)
      return null
    }
  }

  async stop() {
    await this.client.quit()
  }
}
