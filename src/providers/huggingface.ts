import env from '@/lib/env'
import Logger from '@/lib/logger'
import * as Sentry from '@sentry/node'
import type { AxiosInstance } from 'axios'
import axios, { AxiosError } from 'axios'

export type ModelPayload = {
  past_user_inputs: string[]
  generated_responses: string[]
  text: string
}

export default class HuggingFace {
  private logger: Logger
  private static instance: HuggingFace
  protected api: AxiosInstance

  private constructor() {
    this.api = axios.create({
      baseURL: 'https://api-inference.huggingface.co/models',
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${env.HUGGING_API_KEY}`
      }
    })

    this.logger = new Logger({ name: this.constructor.name })
  }

  public static getInstance(): HuggingFace {
    if (!HuggingFace.instance) {
      HuggingFace.instance = new HuggingFace()
    }

    return HuggingFace.instance
  }

  public static async query(payload: ModelPayload) {
    const instance = HuggingFace.getInstance()
    try {
      return (
        await instance.api.post(env.HUGGING_MODEL, {
          inputs: payload,
          use_cache: true,
          wait_for_model: true
        })
      )?.data
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response) {
          const { status, data } = error.response
          instance.logger.error(`Request failed with status code ${status}`)
          instance.logger.error(data)
        } else {
          instance.logger.error(error.message)
        }
      } else {
        Sentry.captureException(error)
        instance.logger.error(error)
      }
    }
  }
}
