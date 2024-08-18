'use strict'

import { S3Client } from '@aws-sdk/client-s3'

import { InvalidConfigError } from '../errors'
import { Storage, custom } from '../schemas/input'
import { sync, syncMetadata, syncTags } from '../storages/s3/buckets'
import {
  ISyncCloudStorage,
  MethodReturn,
  ProviderOptions,
  SyncMetadataReturn,
  SyncResult,
  TagsSyncResults,
} from '../types'
import logger from '../utils/logger'

/**
 * Base Sync Cloud Storage class.
 * @implements ISyncCloudStorage
 */
export abstract class BaseSyncCloudStorage implements ISyncCloudStorage {
  readonly servicePath: string
  readonly options: ProviderOptions
  readonly client: S3Client
  private readonly _storages: Storage[] = []

  /**
   * @class BaseSyncCloudStorage
   * @param {ProviderOptions} options
   * @param {string} servicePath - path as working directory
   */
  constructor(options: ProviderOptions, servicePath: string) {
    logger.info('Sync Cloud Storage - Initialize')
    this.options = options
    this.servicePath = servicePath
    const validatedConfig = custom.safeParse(options)
    const { success } = validatedConfig

    if (!success) {
      const { error } = validatedConfig
      throw new InvalidConfigError(error.message, error)
    }

    this.client = this.getS3Client()
    this._storages = this.options.syncCloudStorage.storages.filter(
      (bucket) => bucket.enabled
    )
  }

  /**
   * Get S3 client.
   * @returns {S3Client}
   * @memberof SyncCloudStorage
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3
   *
   * @example
   * const client = this.getS3Client()
   */
  getS3Client(): S3Client {
    const endpoint = this.options.syncCloudStorage.offline
      ? this.options.syncCloudStorage.endpoint ?? process.env.AWS_ENDPOINT_URL
      : undefined

    return new S3Client({ endpoint })
  }

  /**
   * Sync storages.
   * @private
   * @memberof SyncCloudStorage
   * @returns {Promise<{ result: SyncResult[] }>}
   * @example
   * const result = await this.storages()
   */
  async storages(): Promise<{ result: SyncResult[] }> {
    const isPluginDisable = this.disableCheck().result
    let result: SyncResult[] = []

    if (isPluginDisable) {
      result.push({ reason: 'Plugin is disabled', status: 'rejected' })
      return { result }
    }

    const storagesToSync = this._storages.map((bucket) =>
      sync(this.client, bucket, this.servicePath)
    )

    result = await Promise.allSettled(storagesToSync)

    await this.onExit()

    return { result }
  }
  /**
   * Sync metadata.
   * @memberof SyncCloudStorage
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3
   * @returns {Promise<PromiseSettledResult<SyncMetadataReturn>[]>}
   * @example
   * const result = await this.metadata()
   */
  async metadata(): Promise<PromiseSettledResult<SyncMetadataReturn>[]> {
    return await Promise.allSettled(
      this._storages.map((bucket) => syncMetadata(this.client, bucket))
    )
  }

  /**
   * Sync tags.
   * @private
   * @memberof SyncCloudStorage
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3
   * @returns {Promise<TagsSyncResults>}
   * @example
   * const result = await this.tags()
   */
  async tags(): Promise<TagsSyncResults> {
    const isPluginDisable = this.disableCheck().result

    if (isPluginDisable) {
      return [{ error: 'Plugin is disabled' }]
    }

    return (await Promise.allSettled(
      this._storages.map((bucket) => syncTags(this.client, bucket))
    )) as TagsSyncResults
  }

  /**
   * On exit.
   * @private
   * @returns {Promise<void>}
   * @memberof SyncCloudStorage
   *
   * @example
   * await this.onExit()
   */
  async onExit(): Promise<void> {
    if (this.client) {
      this.client.destroy()
    }
  }

  /**
   * Check if the plugin is disabled.
   * @returns {MethodReturn<boolean>}
   */
  disableCheck(): MethodReturn<boolean> {
    if (this.options.syncCloudStorage.disabled) {
      logger.warning('SyncCloudStorage is disabled!')
      return { result: true }
    }

    return { result: false }
  }
}
