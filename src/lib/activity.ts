import type { Context } from '@/types/context'

export enum ActivityType {
  Conversation = 'conversation',
  TwitchRewardsAddSongToQueue = 'TwitchRewardsAddSongToQueue',
  TwitchRewardsSkipSong = 'TwitchRewardsSkipSong',
  TwitchRewardsVotekick = 'TwitchRewardsVotekick',
  TwitchRewardsEndStream = 'TwitchRewardsEndStream',
  TwitchReadChat = 'TwitchReadChat',
  TwitchRoulette = 'TwitchRoulette',
  TwitchRouletteHitman = 'TwitchRouletteHitman',
  TwitchShakeScreen = 'TwitchShakeScreen'
}

export type ActivityPayload = {
  [ActivityType.Conversation]: {
    text: string
    from: {
      id: string
      name: string
    }
    context: Context
  }
  [ActivityType.TwitchRewardsAddSongToQueue]: {
    song: string
    context: Context
  }
  [ActivityType.TwitchRewardsSkipSong]: {
    context: Context
  }
  [ActivityType.TwitchRewardsVotekick]: {
    username: string
    context: Context
  }
  [ActivityType.TwitchRewardsEndStream]: {
    context: Context
  }
  [ActivityType.TwitchReadChat]: {
    message: string
    username: string
    context: Context
  }
  [ActivityType.TwitchShakeScreen]: {
    message: string
    username: string
    context: Context
  }
  [ActivityType.TwitchRoulette]: {
    context: Context
    message: string
    username: string
  }
  [ActivityType.TwitchRouletteHitman]: {
    context: Context
    username: string
    target: string
  }
}

export default interface Activity<Type extends ActivityType> {
  type: Type
  payload: ActivityPayload[Type]
}
