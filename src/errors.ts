import { ZodError } from 'zod'

import logger from './utils/logger'

export class InvalidConfigError extends Error {
  constructor(message: string, issues: ZodError) {
    super(message)
    this.name = 'InvalidConfigError'
    this.message = message

    logger.error('InvalidConfigError', { issues })
  }
}
