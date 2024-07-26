import type Activity from '@/lib/activity'
import { ActivityType } from '@/lib/activity'
import type Bot from '@/lib/bot'
import Skill from '@/lib/skill'
import * as Sentry from '@sentry/node'
import { spawn } from 'child_process'

export default class EndStream extends Skill {
  constructor(bot: Bot) {
    super(bot, [ActivityType.TwitchRewardsEndStream])
  }

  async handle(activity: Activity<ActivityType.TwitchRewardsEndStream>) {
    try {
      const { context } = activity.payload

      // list all the processes
      const processes = spawn('tasklist')

      // promise to get the output
      const promise = new Promise<string>((resolve, reject) => {
        let output = ''
        processes.stdout.on('data', (data) => (output += data))
        processes.stdout.on('end', () => resolve(output))
        processes.stderr.on('data', (data) => reject(data))
      })

      // wait for the output
      const output = await promise

      // check if the process is running
      const matches = output.matchAll(/obs64.exe \s*([0-9]*)/gi)

      for (const match of matches) {
        const pid = match[1]
        // kill the process
        console.log('Running: ', 'taskkill', ['/pid', pid, '/f', '/t'])
        spawn('taskkill', ['/pid', pid, '/f', '/t'])
      }
      await context.adapter.send(`OBS has been closed. Have a good day everyone!`, context)
    } catch (error) {
      Sentry.captureException(error)
      this.logger.error('Failed to handle activity: ', error)
    }
  }
}
