import { Construct } from 'constructs'

import { BaseProvider } from './base'
import { ProviderOptions } from '../types'

export class SyncCloudStorageCdk extends BaseProvider {
  constructor(construct: Construct, options: ProviderOptions) {
    super(options, construct.node.path)
  }
}
