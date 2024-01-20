'use strict'

import { S3Client, S3ClientConfig, _Object } from '@aws-sdk/client-s3'
import Serverless from 'serverless'
import ServerlessPlugin from 'serverless/classes/Plugin'

import { InvalidConfigError } from './errors'
import { sync, syncMetadata, syncTags } from './provider/s3/buckets'
import { getCredentials } from './provider/s3/credentials'
import { InputCustomSchema, inputCustomSchema } from './schemas'
import { Bucket, ServerlessInstance } from './types'

/**
 * Cloud Bucket Sync module.
 * @module CloudBucketSync
 * @see cloud-bucket-sync:CloudBucketSync
 */
class CloudBucketSync implements ServerlessPlugin {
  serverless!: Serverless & ServerlessInstance
  options!: Serverless.Options
  hooks: ServerlessPlugin.Hooks
  servicePath: string
  config: InputCustomSchema
  logging: ServerlessPlugin.Logging
  taskProcess?: ServerlessPlugin.Progress
  client: S3Client
  readonly _buckets: Bucket[] = []

  constructor(
    serverless: Serverless & ServerlessInstance,
    options: Serverless.Options,
    logging: ServerlessPlugin.Logging
  ) {
    if (!serverless) {
      throw new Error('Serverless instance is required')
    }

    this.serverless = serverless
    this.servicePath = this.serverless.service.serverless.config.servicePath

    if (!options) {
      throw new Error("Options can't be undefined")
    }

    this.options = options

    if (!logging) {
      throw new Error("Logging can't be undefined")
    }

    this.logging = logging

    const config = this.serverless.service.custom
    const validatedConfig = inputCustomSchema.safeParse(config)
    const { success } = validatedConfig

    if (!success) {
      const { error } = validatedConfig
      throw new InvalidConfigError(error.message, error)
    }

    const { data: validConfig } = validatedConfig

    this.config = validConfig
    this.client = this.getS3Client()
    this._buckets = this.config.cloudBucketSync.buckets.filter(
      (bucket) => bucket.enabled
    )
    this.hooks = this.setHooks()
  }

  private getS3Client() {
    const provider = this.serverless.getProvider('aws')
    const s3Options: S3ClientConfig = getCredentials(provider)

    if (
      this.config.cloudBucketSync.endpoint &&
      this.config.cloudBucketSync.offline
    ) {
      s3Options.endpoint = this.config.cloudBucketSync.endpoint
    }

    return new S3Client(s3Options)
  }

  protected setHooks() {
    const syncBucketsHook = () => this.buckets()
    const syncTagsHook = () => this.tags()

    return {
      // 'before:offline:start:init': syncBucketsHook,
      // 'before:deploy:deploy': syncBucketsHook,
      'cloudBucketSync:buckets': syncBucketsHook,
      'cloudBucketSync:tags': syncTagsHook,
      initialize: () => syncBucketsHook(),
      'before:deploy:deploy': () => syncBucketsHook(),
      // 'deploy:deploy': () => deploy(),
      // 'after:deploy:deploy': () => afterDeploy(),
    }
  }

  private async buckets() {
    if (this.config.cloudBucketSync.disabled) {
      return false
    }

    this.taskProcess = this.logging.progress.create({
      message: 'Syncing buckets and tags started',
    })

    const syncedBuckets = await Promise.allSettled(
      this._buckets.map((bucket) => sync(this.client, bucket))
    )

    console.log({ syncedBuckets })

    for (const bucket of syncedBuckets) {
      if (bucket.status === 'rejected') {
        throw bucket.reason
      }

      const { value: objects } = bucket

      if (objects.uploaded) {
        await this.metadata(objects.uploaded)
      }
    }

    this.taskProcess.update('Buckets successfully synced')

    await this.onExit()

    return true
  }

  private async metadata(objects: _Object[]) {
    return await Promise.allSettled(
      this._buckets.map((bucket) => syncMetadata(this.client, bucket, objects))
    )
  }

  private async tags() {
    if (this.config.cloudBucketSync.disabled) {
      return false
    }

    return await Promise.allSettled(
      this._buckets.map((bucket) => syncTags(this.client, bucket))
    )
  }

  private async onExit() {
    if (this.taskProcess) {
      this.taskProcess.remove()
    }

    if (this.client) {
      this.client.destroy()
    }
  }
}

export default CloudBucketSync
module.exports = CloudBucketSync
