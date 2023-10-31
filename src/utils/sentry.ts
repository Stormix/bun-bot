import { Env } from '@/lib/env'
import { version } from '@/version'
import * as Sentry from '@sentry/bun'
import '@sentry/tracing'
import { omit } from 'lodash'

export const generateSentryConfig = (env: Env, options?: Sentry.BunOptions): Sentry.BunOptions => {
  return {
    dsn: env.isDev ? '' : env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: version,
    tracesSampleRate: env.isProd ? 1.0 : 0,
    integrations: [],
    ...omit(options, 'integrations')
  }
}
