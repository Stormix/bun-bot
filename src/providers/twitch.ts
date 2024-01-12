import env from '@/lib/env'
import Logger from '@/lib/logger'
import type { AxiosError } from 'axios'
import axios from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'

export interface TwitchTokens {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string[]
  token_type: string
}

export interface TwitchPollEndBody {
  data: TwitchPoll[]
}

export interface TwitchPoll {
  id: string
  broadcaster_id: string
  broadcaster_name: string
  broadcaster_login: string
  title: string
  choices: TwitchPollChoice[]
  bits_voting_enabled: boolean
  bits_per_vote: number
  channel_points_voting_enabled: boolean
  channel_points_per_vote: number
  status: string
  duration: number
  started_at: string
  ended_at: string
}

export interface TwitchPollChoice {
  id: string
  title: string
  votes: number
  channel_points_votes: number
  bits_votes: number
}

export default class Twitch {
  private logger: Logger
  private static instance: Twitch

  private constructor() {
    this.logger = new Logger({ name: this.constructor.name })
  }

  public static getInstance(): Twitch {
    if (!Twitch.instance) {
      Twitch.instance = new Twitch()
    }

    return Twitch.instance
  }

  public static login(origin: string, callback = 'bot_callback') {
    const twitchClientID = env.TWITCH_CLIENT_ID
    const scopes =
      'analytics:read:extensions user:edit user:read:email clips:edit bits:read analytics:read:games user:edit:broadcast user:read:broadcast chat:read chat:edit channel:moderate channel:read:subscriptions whispers:read whispers:edit moderation:read channel:read:redemptions channel:edit:commercial channel:read:hype_train channel:read:stream_key channel:manage:extensions channel:manage:broadcast user:edit:follows channel:manage:redemptions channel:read:editors channel:manage:videos user:read:blocked_users user:manage:blocked_users user:read:subscriptions user:read:follows channel:manage:polls channel:manage:predictions channel:read:polls channel:read:predictions moderator:manage:automod channel:manage:schedule channel:read:goals moderator:read:automod_settings moderator:manage:automod_settings moderator:manage:banned_users moderator:read:blocked_terms moderator:manage:blocked_terms moderator:read:chat_settings moderator:manage:chat_settings channel:manage:raids moderator:manage:announcements moderator:manage:chat_messages user:manage:chat_color channel:manage:moderators channel:read:vips channel:manage:vips user:manage:whispers channel:read:charity moderator:read:chatters moderator:read:shield_mode moderator:manage:shield_mode moderator:read:shoutouts moderator:manage:shoutouts moderator:read:followers channel:read:guest_star channel:manage:guest_star moderator:read:guest_star moderator:manage:guest_star'

    const redirect_uri = `${origin}/${callback}`
    return `https://id.twitch.tv/oauth2/authorize?client_id=${twitchClientID}&response_type=code&redirect_uri=${redirect_uri}&scope=${encodeURIComponent(
      scopes
    )}`
  }

  public async getUserTokens(origin: string, code: string) {
    try {
      const redirect_uri = `${origin}/callback`
      const params = new URLSearchParams()

      params.append('grant_type', 'authorization_code')
      params.append('code', code)
      params.append('redirect_uri', redirect_uri)
      params.append('client_id', env.TWITCH_CLIENT_ID)
      params.append('client_secret', env.TWITCH_CLIENT_SECRET)

      const response = await axios.post('https://id.twitch.tv/oauth2/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const tokens = response.data as TwitchTokens

      if (tokens) {
        return tokens
      }

      throw new Error('No tokens received')
    } catch (error) {
      this.logger.error(`Spotify client error: ${JSON.stringify((error as AxiosError).response!.data)}`, error)
      return null
    }
  }

  public getApiInstance(tokens: TwitchTokens) {
    return axios.create({
      baseURL: 'https://api.twitch.tv/helix',
      timeout: 30 * 1000,
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Client-Id': env.TWITCH_CLIENT_ID
      }
    })
  }

  public async getRefreshedInstance(tokens: TwitchTokens) {
    const instance = axios.create({
      baseURL: 'https://api.twitch.tv/helix',
      timeout: 30 * 1000,
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Client-Id': env.TWITCH_CLIENT_ID
      }
    })

    createAuthRefreshInterceptor(instance, async (failedRequest: AxiosError) => {
      const refreshedTokens = await this.refreshToken(tokens)
      // TODO: update tokens in db
      failedRequest.response!.config.headers.Authorization = `Bearer ${refreshedTokens.access_token}`
    })

    return instance
  }
  public async refreshToken(tokens: TwitchTokens) {
    try {
      const params = new URLSearchParams()

      params.append('grant_type', 'refresh_token')
      params.append('refresh_token', tokens.refresh_token)
      params.append('client_id', env.TWITCH_CLIENT_ID)
      params.append('client_secret', env.TWITCH_CLIENT_SECRET)

      const response = await axios.post('https://id.twitch.tv/oauth2/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const newTokenResponse = response.data as TwitchTokens

      if (newTokenResponse) {
        return {
          ...tokens,
          access_token: newTokenResponse.access_token
        }
      }

      throw new Error('Failed to refresh tokens')
    } catch (error) {
      this.logger.error('Failed to refresh tokens: ', error)
      return tokens
    }
  }

  public async getUser(tokens: TwitchTokens, username: string) {
    try {
      const instance = await this.getRefreshedInstance(tokens)
      const response = await instance.get(`/users?login=${username}`)

      if (response.status === 200) {
        return response.data.data[0]
      }

      throw new Error('Failed to get user')
    } catch (error) {
      this.logger.error('Failed to get user: ', error)
      return null
    }
  }

  public async timeoutUser(tokens: TwitchTokens, username: string, duration = 60, reason = 'Votekicked :)') {
    try {
      const broadcaster_id = '102784954'
      const instance = await this.getRefreshedInstance(tokens)

      const user = await this.getUser(tokens, username)

      return instance.post(`/moderation/bans?broadcaster_id=${broadcaster_id}&moderator_id=${broadcaster_id}`, {
        data: {
          user_id: user.id,
          ...(duration
            ? {
                duration
              }
            : {}),
          reason
        }
      })
    } catch (error) {
      this.logger.error('Failed to timeout user: ', (error as AxiosError).response?.data)
      return false
    }
  }
}
