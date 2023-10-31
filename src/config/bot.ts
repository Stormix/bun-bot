import type { ActivityType } from '@/lib/activity'
import { version } from '@/version'
import type { Env } from '../lib/env'
import env from '../lib/env'
import { RewardMapping } from './twitch'

export interface BotConfig {
  env: Env
  prefix: string
  version: string
  name: string
  twitch: {
    rewardMapping: Record<string, ActivityType>
  }
}

export const defaultConfig: BotConfig = {
  env,
  prefix: '^',
  version,
  name: 'StormixBot',
  twitch: {
    rewardMapping: RewardMapping
  }
}
