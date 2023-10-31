import type Activity from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import Skill from '@/lib/skill'
import HuggingFace from '@/providers/huggingface'
import type { DiscordContext } from '@/types/context'
import { Adapters } from '@prisma/client'
import * as Sentry from '@sentry/node'

export default class Conversation extends Skill {
  constructor(bot: Bot) {
    super(bot, [ActivityType.Conversation])
  }

  async handle(activity: Activity<ActivityType.Conversation>) {
    try {
      const { text, from, context } = activity.payload
      const { name } = from

      // TODO: currently only discord is supported, but this should be abstracted
      if (context.adapter.name === Adapters.DISCORD) await (context as DiscordContext).message.channel.sendTyping()

      const knowledge = ``
      const instruction = `Instruction: you are a chatbot, you need to response sarcastically, you're talking to ${name}`
      const dialog = [text].join(' EOS ')

      const response = await HuggingFace.query({
        text: `${instruction} [CONTEXT] ${dialog} ${knowledge}`,
        generated_responses: [],
        past_user_inputs: []
      })
      this.logger.debug(`Received response from HuggingFace: `, response)

      return (
        response?.generated_text ??
        `oopsie doopsie, brain not workie, try again later. ${response?.estimated_time ?? '60'}s`
      )
    } catch (error) {
      Sentry.captureException(error)
      this.logger.error('Failed to handle activity: ', error)
    }
  }
}
