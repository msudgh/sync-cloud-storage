'use strict'

import { S3Client } from '@aws-sdk/client-s3'
import Serverless from 'serverless'
import ServerlessPlugin from 'serverless/classes/Plugin'

import { InvalidConfigError } from './errors'
import { sync, syncMetadata, syncTags } from './providers/s3/buckets'
import { Custom, Storage, custom } from './schemas/input'
import { IServerless, MethodReturn, TagsSyncResults } from './types'
import logger from './utils/logger'

/**
 * Sync Cloud Storage module.
 * @module SyncCloudStorage
 */
class SyncCloudStorage implements ServerlessPlugin {
  serverless!: Serverless
  options!: Serverless.Options
  hooks: ServerlessPlugin.Hooks
  commands: ServerlessPlugin.Commands
  servicePath: string
  config: Custom
  logging: ServerlessPlugin.Logging
  client: S3Client
  readonly _storages: Storage[] = []

  /**
   * @class SyncCloudStorage
   * @param {Serverless} serverless - Serverless instance
   * @param {Object} options - Serverless CLI options
   * @param {Object} logging - Serverless logging module
   */
  constructor(
    serverless: IServerless,
    options: Serverless.Options,
    logging: ServerlessPlugin.Logging
  ) {
    // Typing with *as* makes testing enable to use a DI version of instance
    this.serverless = serverless as unknown as Serverless
    this.options = options
    this.logging = logging
    this.servicePath = this.serverless.service.serverless.config.servicePath

    const config = this.serverless.service.custom
    const validatedConfig = custom.safeParse(config)
    const { success } = validatedConfig

    if (!success) {
      const { error } = validatedConfig
      throw new InvalidConfigError(error.message, error)
    }

    const { data: validConfig } = validatedConfig

    this.config = validConfig
    this.client = this.getS3Client()
    this._storages = this.config.syncCloudStorage.storages.filter(
      (bucket) => bucket.enabled
    )
    this.commands = this.setCommands()
    this.hooks = this.setHooks()
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
    const endpoint = this.config.syncCloudStorage.offline
      ? this.config.syncCloudStorage.endpoint ?? process.env.AWS_ENDPOINT_URL
      : undefined

    return new S3Client({
      endpoint,
    })
  }

  /**
   * Set commands.
   * @returns {ServerlessPlugin.Commands} Commands
   * @memberof SyncCloudStorage
   *
   * @example
   * const commands = this.setCommands()
   */
  setCommands(): ServerlessPlugin.Commands {
    return {
      scs: {
        usage: 'Sync Cloud Storage',
        lifecycleEvents: ['storages', 'tags'],
      },
    }
  }

  /**
   * Set hooks.
   * @returns {ServerlessPlugin.Hooks} Hooks
   * @memberof SyncCloudStorage
   *
   * @example
   * const hooks = this.setHooks()
   */
  setHooks(): ServerlessPlugin.Hooks {
    const syncStoragesHook = () => this.storages()
    const syncTagsHook = () => this.tags()

    return {
      'scs:storages': syncStoragesHook,
      'scs:tags': syncTagsHook,
      'before:offline:start:init': syncStoragesHook,
      'before:deploy:deploy': syncStoragesHook,
    }
  }

  /**
   * Sync storages.
   * @private
   * @memberof SyncCloudStorage
   *
   * @example
   * const result = await this.storages()
   */
  async storages() {
    const isPluginDisable = this.disableCheck().result

    if (isPluginDisable) {
      return { result: [] }
    }

    const syncedStorages = await Promise.allSettled(
      this._storages.map((bucket) =>
        sync(this.client, bucket, this.servicePath)
      )
    )

    await this.onExit()

    return { result: syncedStorages }
  }

  /**
   * Sync metadata.
   * @memberof SyncCloudStorage
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3
   *
   * @example
   * const result = await this.metadata()
   */
  async metadata() {
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

  private disableCheck(): MethodReturn<boolean> {
    if (this.config.syncCloudStorage.disabled) {
      logger.warning('SyncCloudStorage is disabled!')
      return { result: true }
    }

    return { result: false }
  }
}

export default SyncCloudStorage
module.exports = SyncCloudStorage
