import { RedisClientType, createClient } from 'redis'
import Bot from './bot'

class PubSub {
  publisher: RedisClientType
  subscriber: RedisClientType

  constructor(bot: Bot) {
    this.publisher = createClient({
      url: `redis://${bot.config.env.REDIS_HOST}:${bot.config.env.REDIS_PORT}`,
      username: undefined,
      password: undefined
    })
    this.subscriber = this.publisher.duplicate()
  }

  async setup() {
    await this.publisher.connect()
    await this.subscriber.connect()
  }

  async publish(channel: string, message: string) {
    await this.publisher.publish(channel, message)
  }

  async subscribe(channel: string, callback: (channel: string, message: string) => void) {
    await this.subscriber.subscribe(channel, callback)
  }
}

export default PubSub
