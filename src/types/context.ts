import type { Message } from 'discord.js'
import type { BaseMessage, PrivateMessage } from 'twitch-js'
import type DiscordAdapter from '../adapters/discord'
import type TwitchAdapter from '../adapters/twitch'

export interface BaseContext {
  atOwner: string
  atAuthor: string
}

export interface TwitchContext extends BaseContext {
  message: PrivateMessage | BaseMessage
  adapter: TwitchAdapter
}

export interface DiscordContext extends BaseContext {
  adapter: DiscordAdapter
  message: Message
}

export type Context = TwitchContext | DiscordContext
