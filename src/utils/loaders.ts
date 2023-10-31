import type { Constructor } from '@/types/generics'
import { globSync } from 'glob'

export const loadModulesInDirectory = async <T>(directory: string) => {
  const path = import.meta.dir + '/../' + directory
  const commands = globSync('*.{js,ts}', { cwd: path })
  return Promise.all(
    commands.map(async (command) => {
      const { default: Command } = await import(path + '/' + command)
      return Command as Constructor<T>
    })
  )
}
