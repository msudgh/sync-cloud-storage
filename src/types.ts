import Serverless from 'serverless'

import { InputCustomSchema } from './schemas'

export type Bucket = InputCustomSchema['cloudBucketSync']['buckets'][0]

export type ServerlessInstance = typeof Serverless & {
  service: {
    custom: InputCustomSchema
  }
}

export type ServerlessProvider = ReturnType<
  typeof Serverless.prototype.getProvider
>

export interface ExtendedServerlessProvider extends ServerlessProvider {
  cachedCredentials?: {
    accessKeyId?: string
    secretAccessKey?: string
    sessionToken?: string
    region?: string
  }
}

type CommonFileProperties = {
  Key: string
  ETag: string
  Size: number
  LastModified: Date
}

export type LocalFile = CommonFileProperties & {
  LocalPath: string
}

export type GenericFunction<R extends (...args: unknown[]) => unknown> = R
