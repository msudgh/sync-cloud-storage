'use strict'

import { S3Client } from '@aws-sdk/client-s3'

import { InvalidConfigError } from '../errors'
import { Storage, customOptions } from '../schemas/input'
import { sync, syncMetadata, syncTags } from '../storages/s3/buckets'
import {
  IBaseProvider,
  MethodReturn,
  ProviderOptions,
  SyncMetadataReturn,
  SyncResult,
  TagsSyncResults,
} from '../types'
import { logger } from '../utils/logger'

/**
 * Base provider class for cloud frameworks.
 * @implements {IBaseProvider}
 */
export abstract class BaseProvider implements IBaseProvider {
  readonly servicePath: string
  readonly options: ProviderOptions
  readonly client: S3Client
  private readonly _storages: Storage[] = []

  /**
   * @class BaseProvider
   * @param {ProviderOptions} options
   * @param {string} servicePath - path as working directory
   */
  constructor(options: ProviderOptions, servicePath: string) {
    this.options = options
    this.servicePath = servicePath
    const validatedConfig = customOptions.safeParse(options)
    const { success } = validatedConfig

    if (!success) {
      const { error } = validatedConfig
      throw new InvalidConfigError(error.message, error)
    }

    logger.silent = !this.options.syncCloudStorage.silent

    this.client = this.getS3Client()
    this._storages = this.options.syncCloudStorage.storages.filter(
      (bucket) => bucket.enabled
    )
  }

  /**
   * Get S3 client.
   * @memberof BaseProvider
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3
   * @returns {S3Client}
   */
  getS3Client(): S3Client {
    const endpoint = this.options.syncCloudStorage.offline
      ? this.options.syncCloudStorage.endpoint
      : undefined
    const region =
      this.options.syncCloudStorage.region ?? process.env.AWS_REGION
    return new S3Client({
      endpoint,
      ...(region ? { region } : {}),
    })
  }

  /**
   * Sync storages.
   * @memberof BaseProvider
   * @returns {Promise<{ result: SyncResult[] }>}
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
   * @memberof BaseProvider
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3
   * @returns {Promise<PromiseSettledResult<SyncMetadataReturn>[]>}
   */
  async metadata(): Promise<PromiseSettledResult<SyncMetadataReturn>[]> {
    return await Promise.allSettled(
      this._storages.map((bucket) => syncMetadata(this.client, bucket))
    )
  }

  /**
   * Sync tags.
   * @memberof BaseProvider
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3
   * @returns {Promise<TagsSyncResults>}
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
   * @memberof BaseProvider
   */
  private async onExit(): Promise<void> {
    if (this.client) {
      this.client.destroy()
    }
  }

  /**
   * Check if the plugin is disabled.
   * @private
   * @memberof BaseProvider
   * @returns {MethodReturn<boolean>}
   */
  private disableCheck(): MethodReturn<boolean> {
    if (this.options.syncCloudStorage.disabled) {
      logger.warning('SyncCloudStorage is disabled!')
      return { result: true }
    }

    return { result: false }
  }
}
