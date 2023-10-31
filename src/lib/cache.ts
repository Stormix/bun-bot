import type Bot from '@/lib/bot'
import type { StorageTypes } from '@/types/storage'

export default abstract class Cache {
  abstract primary: boolean
  prefix: string

  constructor(
    public type: StorageTypes,
    readonly bot: Bot
  ) {
    this.prefix = `bot:${this.bot.config.name}:`
  }

  /**
   * Setup the storage
   */
  abstract setup(): Promise<void>

  /**
   * Sets a key value pair in storage
   *
   * @param key Key to store
   * @param value Value to store
   * @param expiry  Expiry in seconds (optional)
   */
  abstract set(key: string, value: string, expiry?: number): Promise<void>

  /**
   * Gets a value from storage
   * @param key Key to get
   */
  abstract get(key: string): Promise<string | null>

  abstract stop(): Promise<void>
}
