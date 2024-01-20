import { NoSuchBucket } from '@aws-sdk/client-s3'
import { ZodError } from 'zod'

import { Bucket } from './types'

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

export const handleBucketError = (error: Error, bucket: Bucket) => {
  if (error instanceof NoSuchBucket) {
    throw Error(`${error.name}: ${bucket.bucketName}`)
  } else {
    throw Error(`${error.name}/${error.message}: ${bucket.bucketName}`)
  }
}
