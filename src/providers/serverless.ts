import Serverless from 'serverless'
import ServerlessPlugin from 'serverless/classes/Plugin'

import { BaseProvider } from './base'
import { IServerless } from '../types'

export class SyncCloudStorageServerless extends BaseProvider {
  readonly hooks: ServerlessPlugin.Hooks
  readonly commands: ServerlessPlugin.Commands

  constructor(
    serverless: IServerless,
    options: Serverless.Options,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention
    _logging?: ServerlessPlugin.Logging
  ) {
    const pluginOptions = serverless.service.custom.syncCloudStorage
    super(
      {
        syncCloudStorage: {
          ...pluginOptions,
          region: options['region'] || pluginOptions.region,
        },
      },
      serverless.service.serverless.config.servicePath
    )
    this.commands = this.setCommands()
    this.hooks = this.setHooks()
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
    return {
      'scs:storages': () => this.storages(),
      'scs:tags': () => this.tags(),
      'before:offline:start:init': () => this.storages(),
      'before:deploy:deploy': () => this.storages(),
    }
  }
}
