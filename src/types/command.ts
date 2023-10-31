import type { Command } from '@prisma/client'

export type BuiltinCommandOptions = Partial<Omit<Command, 'id' | 'response' | 'type' | 'name'>>
