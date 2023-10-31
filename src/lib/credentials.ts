import type { CredentialsValue } from '@/types/credentials'
import type { ServiceType } from '@prisma/client'
import type Bot from './bot'

export default class CredentialsManager {
  constructor(readonly bot: Bot) {}

  async getCredentials<T extends ServiceType>(service: T): Promise<CredentialsValue[T] | null> {
    try {
      const credentials = await this.bot.prisma.credentials.findFirst({
        where: {
          service
        }
      })
      if (!credentials) return null
      return JSON.parse(credentials.value as string) as CredentialsValue[T]
    } catch (error) {
      this.bot.logger.error('Failed to fetch credentials:', error)
      throw error
    }
  }

  async setCredentials<T extends ServiceType>(service: T, value: CredentialsValue[T]) {
    try {
      await this.bot.prisma.credentials.upsert({
        where: { service },
        create: { service, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) }
      })
    } catch (error) {
      this.bot.logger.error('Failed to update credentials:', error)
      throw error
    }
  }
}
