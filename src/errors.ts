import { NoSuchBucket } from '@aws-sdk/client-s3'
import { ZodError } from 'zod'

import { Storage } from './schemas/input'

// can be removed if not needed
export class InvalidOptionsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidOptionsError'
    this.message = message

    console.error('InvalidOptionsError')
  }
}

export class InvalidConfigError extends Error {
  constructor(message: string, issues: ZodError) {
    super(message)
    this.name = 'InvalidConfigError'
    this.message = message

    console.error('InvalidConfigError', { issues })
  }
}

export const handleMethodError = (error: Error, storage: Storage) => {
  let message: string
  if (error instanceof NoSuchBucket) {
    message = `${error.name}: ${storage.name}`
    console.error(message)
  } else {
    message = `${error.name}/${error.message}: ${storage.name}`
  }
  console.error(message)
  return message
}
