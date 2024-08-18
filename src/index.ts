import { Construct } from 'constructs'
import Serverless from 'serverless'
import ServerlessPlugin from 'serverless/classes/Plugin'

import { SyncCloudStorageCdk } from './providers/cdk'
import { SyncCloudStorageServerless } from './providers/serverless'
import { CdkOptions, IServerless, Provider } from './types'

const isProvider = (provider: Provider): provider is Provider =>
  provider !== undefined

export const isServerlessProvider = (
  provider: IServerless
): provider is IServerless =>
  isProvider(provider) &&
  Object.hasOwnProperty.call(provider, 'getProvider') &&
  provider.getProvider('aws') !== undefined &&
  provider.service.custom.syncCloudStorage !== undefined

export const isCdkProvider = (provider: Construct): provider is Construct =>
  isProvider(provider) && Construct.isConstruct(provider)

export default class SyncCloudStorage {
  /**
   * @param {Provider | unknown} provider - Either a Serverless instance or a CDK Construct.
   * @param {Serverless.Options | CdkOptions | undefined} [options] - Options for Serverless or CDK.
   * @param {ServerlessPlugin.Logging | undefined} [logging] - Optional logging instance (for Serverless).
   */
  constructor(
    provider: Provider,
    options: Serverless.Options | CdkOptions = {},
    logging?: ServerlessPlugin.Logging
  ) {
    if (isServerlessProvider(provider as IServerless)) {
      return new SyncCloudStorageServerless(
        provider as IServerless,
        options as Serverless.Options,
        logging as ServerlessPlugin.Logging
      )
    } else if (isCdkProvider(provider as Construct)) {
      return new SyncCloudStorageCdk(provider as Construct, {
        syncCloudStorage: options as CdkOptions,
      })
    } else {
      throw new Error('Provider not found')
    }
  }
}
