import { ZodError } from 'zod'

export class InvalidConfigError extends Error {
  constructor(message: string, issues: ZodError) {
    super(message)
    this.name = 'InvalidConfigError'
    this.message = message

    console.error('InvalidConfigError', { issues })
  }
}
