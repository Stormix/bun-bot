import env from '@/lib/env'
import Logger from '@/lib/logger'
import type { AxiosError } from 'axios'
import axios from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'

export interface SpotifyTokens {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
  refresh_token: string
}

export interface SpotifyImage {
  url: string
  width?: number
  height?: number
}

export interface SpotifyUser {
  display_name: string
  external_urls: {
    spotify: string
  }
  email: string
  href: string
  id: string
  type: string
  uri: string
  images: SpotifyImage[]
  product: string
}

export interface SpotifyTrack {
  album: {
    album_type: string
    artists: {
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      name: string
      type: string
      uri: string
    }[]
    available_markets: string[]
    external_urls: {
      spotify: string
    }
    href: string
    id: string
    images: SpotifyImage[]
    name: string
    release_date: string
    release_date_precision: string
    total_tracks: number
    type: string
    uri: string
  }
  artists: {
    external_urls: {
      spotify: string
    }
    href: string
    id: string
    name: string
    type: string
    uri: string
  }[]

  available_markets: string[]
  disc_number: number
  duration_ms: number
  explicit: boolean
  external_ids: {
    isrc: string
  }

  external_urls: {
    spotify: string
  }
  href: string
  id: string
  is_local: boolean
  name: string
  popularity: number
  preview_url: string
  track_number: number
  type: string
  uri: string
}

export default class Spotify {
  private logger: Logger
  private static instance: Spotify

  private constructor() {
    this.logger = new Logger({ name: this.constructor.name })
  }

  public static getInstance(): Spotify {
    if (!Spotify.instance) {
      Spotify.instance = new Spotify()
    }

    return Spotify.instance
  }

  public static login(origin: string) {
    const spotifyClientID = env.SPOTIFY_CLIENT_ID
    const scopes =
      'user-read-private user-read-email user-library-read user-modify-playback-state playlist-modify-public playlist-modify-private user-read-currently-playing'

    const redirect_uri = `${origin}/callback`
    return `https://accounts.spotify.com/authorize?client_id=${spotifyClientID}&response_type=code&redirect_uri=${redirect_uri}&scope=${encodeURIComponent(
      scopes
    )}`
  }

  public getApiInstance(tokens: SpotifyTokens) {
    return axios.create({
      baseURL: 'https://api.spotify.com/v1',
      timeout: 30 * 1000,
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })
  }

  public async getRefreshedInstance(tokens: SpotifyTokens) {
    const instance = axios.create({
      baseURL: 'https://api.spotify.com/v1',
      timeout: 30 * 1000,
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })

    createAuthRefreshInterceptor(instance, async (failedRequest: AxiosError) => {
      const refreshedTokens = await this.refreshToken(tokens)
      // TODO: update tokens in db
      failedRequest.response!.config.headers.Authorization = `Bearer ${refreshedTokens.access_token}`
    })

    return instance
  }

  public async getUserTokens(origin: string, code: string) {
    try {
      const redirect_uri = `${origin}/callback`
      const params = new URLSearchParams()

      params.append('grant_type', 'authorization_code')
      params.append('code', code)
      params.append('redirect_uri', redirect_uri)
      params.append('client_id', env.SPOTIFY_CLIENT_ID)
      params.append('client_secret', env.SPOTIFY_CLIENT_SECRET)

      const response = await axios.post('https://accounts.spotify.com/api/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const tokens = response.data as SpotifyTokens

      if (tokens) {
        return tokens
      }

      throw new Error('No tokens received')
    } catch (error) {
      this.logger.error(`Spotify client error: ${JSON.stringify((error as AxiosError).response!.data)}`, error)
      return null
    }
  }

  public async getUserInfo(tokens?: SpotifyTokens) {
    try {
      if (!tokens) {
        throw new Error('No spotify tokens are set')
      }

      const api = this.getApiInstance(tokens)
      const response = await api.get('/me')

      return response.data as SpotifyUser
    } catch (error) {
      this.logger.error(`Spotify client error: ${JSON.stringify((error as AxiosError).response!.data)}`, error)
      return null
    }
  }

  public async refreshToken(tokens: SpotifyTokens) {
    try {
      const params = new URLSearchParams()

      params.append('grant_type', 'refresh_token')
      params.append('refresh_token', tokens.refresh_token)
      params.append('client_id', env.SPOTIFY_CLIENT_ID)
      params.append('client_secret', env.SPOTIFY_CLIENT_SECRET)

      const response = await axios.post('https://accounts.spotify.com/api/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const newTokenResponse = response.data as {
        access_token: string
        token_type: string
        expires_in: number
        scope?: string
      }

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

  public async addSongToQueue(tokens: SpotifyTokens, uri: string) {
    try {
      const api = await this.getRefreshedInstance(tokens)
      const response = await api.post('/me/player/queue', null, {
        params: {
          uri
        }
      })

      return response.data
    } catch (error) {
      this.logger.error('Failed to add song to queue: ', error)
      return null
    }
  }

  public async getTrackInfo(tokens: SpotifyTokens, id: string): Promise<SpotifyTrack | null> {
    try {
      const api = await this.getRefreshedInstance(tokens)
      const response = await api.get(`/tracks/${id}`)

      return response.data
    } catch (error) {
      this.logger.error('Failed to get track info: ', error)
      return null
    }
  }

  public async skipSong(tokens: SpotifyTokens) {
    try {
      const api = await this.getRefreshedInstance(tokens)
      const response = await api.post('/me/player/next')

      return response.data
    } catch (error) {
      this.logger.error('Failed to skip song: ', error)
      return null
    }
  }
}
