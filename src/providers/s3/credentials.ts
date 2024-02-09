import { Credentials } from 'serverless/plugins/aws/provider/awsProvider'

import { ExtendedServerlessProvider } from '../../types'

/**
 * Gets the credentials for the S3 client.
 * @memberof S3
 * @param {ExtendedServerlessProvider} provider
 * @returns {Credentials}
 * @example
 * const credentials = getCredentials(provider)
 * const client = new S3Client(credentials)
 */
export const getCredentials = (
  provider: ExtendedServerlessProvider
): Credentials => {
  const { cachedCredentials } = provider
  const credentials = cachedCredentials ?? {}
  const { accessKeyId, secretAccessKey } = credentials

  if (accessKeyId && secretAccessKey) {
    return {
      region: provider.getRegion(),
      credentials,
    }
  } else {
    return {
      region: provider.getRegion() || provider.getCredentials().region,
      credentials: provider.getCredentials().credentials,
    }
  }
}
