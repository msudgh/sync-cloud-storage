import { DeletedObject, Tag, _Object } from '@aws-sdk/client-s3'
import Serverless from 'serverless'

import { Custom, Storage } from './schemas/input'

export type IServerlessProvider = ReturnType<
  typeof Serverless.prototype.getProvider
>

export type IServerless = {
  service: {
    custom: Custom
    serverless: {
      config: {
        servicePath: string
      }
    }
  }
  getProvider(name: string): IServerlessProvider
}

export interface ExtendedServerlessProvider extends IServerlessProvider {
  cachedCredentials?: {
    accessKeyId?: string
    secretAccessKey?: string
    sessionToken?: string
    region?: string
  }
}

export type LocalFile = {
  Key: string
  ETag: string
  Size: number
  LastModified: Date
  LocalPath: string
}

export type UploadedObject = {
  key: string | undefined
  etag: string | undefined
  versionId: string | undefined
  storage: string | undefined
  location: string | undefined
}

export type StoragesSyncResult = {
  storage: Storage
  files: LocalFile[]
  objects: _Object[]
  localFilesChecksum: string[]
  storageObjectsChecksum: string[]
  filesToUpload: string[]
  filesToDelete: string[]
  uploaded: UploadedObject[]
  deleted: DeletedObject[]
  error?: string | Error
  metadata?: Record<string, string>
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export interface MethodReturn<T = undefined> {
  storage?: Storage
  result?: T
  error?: Error | string
}

export interface MethodReturn<T = undefined> {
  storage?: Storage
  result?: T
  error?: Error | string
}

export type MetadataSyncResult = Array<boolean>
export type TagsSyncResult = MethodReturn<Tag[]>
export type TagsSyncResults = Array<MethodReturn<Tag[]>>
export type TagsMethodPromiseResult = Promise<TagsSyncResults>

export type SyncMetadataReturn = Array<
  Pick<_Object, 'Key'> & {
    Bucket: string
    Metadata: Record<string, string> | undefined
  }
>
