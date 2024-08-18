import { Construct } from 'constructs'

import { BaseSyncCloudStorage } from './base'
import { ProviderOptions } from '../types'

export class SyncCloudStorageCdk extends BaseSyncCloudStorage {
  constructor(construct: Construct, options: ProviderOptions) {
    super(options, construct.node.path)
  }
}
