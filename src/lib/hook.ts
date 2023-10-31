import type Bot from './bot'
import type Logger from './logger'

/**
 * A hook allows you to run code when the bot starts or stops.
 * @abstract
 */
export default abstract class Hook {
  readonly logger: Logger
  constructor(protected bot: Bot) {
    this.logger = bot.logger.getSubLogger({ name: this.constructor.name })
    this.onStart()
  }

  /**
   * Called when the bot is ready, at the end of the listen method.
   */
  public abstract onReady(): Promise<void>
  /**
   * Called when the hook is registered, before the bot is ready.
   */
  public abstract onStart(): Promise<void>
  /**
   * Called when the bot is stopped.
   */
  public abstract onStop(): Promise<void>
}
