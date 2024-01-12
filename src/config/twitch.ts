import { ActivityType } from '@/lib/activity'

export const RewardMapping: Record<string, ActivityType> = {
  'ea082f5e-6497-4874-94e0-31c6169b0f17': ActivityType.TwitchRewardsAddSongToQueue,
  'd5153e12-a192-4644-8e50-11d92769d000': ActivityType.TwitchRewardsSkipSong,
  '4b83dbd5-b3da-4a27-9789-ceeef443c6e2': ActivityType.TwitchRewardsVotekick,
  'b7b5360e-5682-4a20-a716-3ef5949f78f4': ActivityType.TwitchRewardsEndStream,
  '3110f2c7-90f7-49b1-8a51-2f8177ecd42c': ActivityType.TwitchReadChat,
  'd181c2cc-c8fd-44fc-99e2-a3dfb30163d0': ActivityType.TwitchRoulette,
  'f311f7d7-0188-4ad4-ad53-5c4e839d42f0': ActivityType.TwitchRouletteHitman
}
