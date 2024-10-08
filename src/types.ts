import { DeletedObject, Tag, _Object } from '@aws-sdk/client-s3'
import { Construct } from 'constructs'
import Serverless from 'serverless'

import { CustomOptions, Storage } from './schemas/input'

export type AWSProvider = ReturnType<typeof Serverless.prototype.getProvider>

// Instance definition of AWS Serverless with the the custom options.
export type IServerless = {
  service: {
    custom: CustomOptions
    serverless: {
      config: {
        servicePath: string
      }
    }
  }
  getProvider(name: string): AWSProvider
}

export interface IBaseProvider {
  storages(servicePath: string): Promise<{ result: SyncResult[] }>
  metadata(): Promise<PromiseSettledResult<SyncMetadataReturn>[]>
  tags(): Promise<TagsSyncResults>
}

export type Provider = IServerless | Construct
export type CdkOptions = CustomOptions['syncCloudStorage']
export type ProviderOptions = CustomOptions
export type LocalFile = {
  fileName: string
  localPath: string
  key: string
  etag?: string
  size?: number
  lastModified?: Date
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
  metadata?: SyncMetadataReturn
  tags?: TagsSyncResult
}

export interface MethodReturn<T = undefined> {
  storage?: Storage
  result?: T
  error?: Error | string
}

export type MetadataSyncResult = Array<boolean>
export type TagsSyncResult = MethodReturn<Tag[]>
export type TagsSyncResults = Array<MethodReturn<Tag[]>>
export type TagsMethodPromiseResult = PromiseFulfilledResult<TagsSyncResult>

export type SyncMetadataReturn = Array<
  Pick<_Object, 'Key'> & {
    Bucket: string
    Metadata: Record<string, string> | undefined
  }
>

interface SyncFulfilledResult {
  status: 'fulfilled'
  value: StoragesSyncResult
}

interface SyncRejectedResult {
  status: 'rejected'
  reason: unknown
}

export type SyncResult = SyncFulfilledResult | SyncRejectedResult

// Testing utilities and types
export interface ExtendedServerlessProvider extends AWSProvider {
  cachedCredentials?: {
    accessKeyId?: string
    secretAccessKey?: string
    sessionToken?: string
    region?: string
  }
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export const isFulfilledSyncResult = (
  result: SyncResult
): result is SyncFulfilledResult => result.status === 'fulfilled'
