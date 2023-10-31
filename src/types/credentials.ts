import type { SpotifyTokens } from '@/providers/spotify'
import type { TwitchTokens } from '@/providers/twitch'
import type { ServiceType } from '@prisma/client'

export type CredentialsValue = {
  [ServiceType.SPOTIFY]: SpotifyTokens
  [ServiceType.TWITCH]: TwitchTokens
  [ServiceType.TWITCH_BROADCASTER]: TwitchTokens
}
